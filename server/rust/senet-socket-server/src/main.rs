use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use dashmap::DashMap;
use futures_util::{SinkExt, StreamExt};
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{collections::HashMap, sync::Arc, time::SystemTime};
use tokio::net::TcpListener;
use tokio::{
    sync::{broadcast, mpsc, RwLock},
    time::{sleep, Duration},
};
use tracing::{info, warn};
use uuid::Uuid;

// ========================= 공통 타입 =========================

#[derive(Debug, Clone, Serialize)]
struct Envelope<T> {
    r#type: String,
    timestamp: u128,
    data: T,
}

fn ts() -> u128 {
    SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis()
}

// ========================= 서버 상태 =========================

#[derive(Clone)]
struct AppState {
    rooms: Arc<DashMap<String, Arc<Room>>>,
}

#[derive(Clone)]
struct Room {
    id: String,
    tx: broadcast::Sender<ServerMsg>,
    inner: Arc<RwLock<RoomInner>>,
}

#[derive(Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
enum RoomStatus {
    Waiting,
    Playing,
    Finished,
}

#[derive(Clone)]
struct RoomInner {
    status: RoomStatus,
    name: String,
    owner: String, // playerId
    password: Option<String>,
    max_players: usize,               // always 2 for Senet
    players: DashMap<String, Player>, // playerId -> Player
    spectators: DashMap<String, Spectator>,
    // 좌석은 W/B (White/Black)
    seats: DashMap<char, String>, // 'W' or 'B' -> playerId
    ready: DashMap<String, bool>,
    game: GameState,
    game_id: String,
    last_activity: u128,
}

#[derive(Clone)]
struct Player {
    id: String,
    name: String,
    tx: mpsc::Sender<String>, // 문자열(직렬화된 JSON)을 바로 보냄
}
#[derive(Clone)]
struct Spectator {
    id: String,
    name: String,
    tx: mpsc::Sender<String>,
}

// ========================= 게임 상태(세넷 규칙) =========================

const BOARD_MAX: u8 = 30;
const SAFE_SQUARES: [u8; 2] = [15, 26];
const WATER_SQUARE: u8 = 27;
const EXIT_SQUARE: u8 = 30;
const PIECES: usize = 5;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct GameSnapshot {
    pieces: HashMap<char, Vec<u8>>, // 'W'/'B' -> 각 말 위치(0=off, 30=exit는 별도 처리)
    turn: char,
    roll: Option<u8>,
    game_over: bool,
    last_move: Option<Value>,
}

#[derive(Clone)]
struct GameState {
    turn: char, // 'W' or 'B'
    last_roll: Option<u8>,
    // 0: off, 1..=30: board, 31: exited (표현 간편화)
    w: [u8; PIECES],
    b: [u8; PIECES],
    game_over: bool,
}

impl GameState {
    fn new() -> Self {
        let mut g = Self {
            turn: 'W',
            last_roll: None,
            w: [0; PIECES],
            b: [0; PIECES],
            game_over: false,
        };
        // 초기 배치: W=1,3,5,7,9 / B=2,4,6,8,10
        for i in 0..PIECES {
            g.w[i] = (1 + (i as u8) * 2);
        }
        for i in 0..PIECES {
            g.b[i] = (2 + (i as u8) * 2);
        }
        g
    }
    fn snapshot(&self) -> GameSnapshot {
        let mut pieces = HashMap::new();
        pieces.insert('W', self.w.to_vec());
        pieces.insert('B', self.b.to_vec());
        GameSnapshot {
            pieces,
            turn: self.turn,
            roll: self.last_roll,
            game_over: self.game_over,
            last_move: None,
        }
    }
    fn board_occupant(&self, square: u8) -> Option<(char, usize)> {
        if square == 0 || square > BOARD_MAX {
            return None;
        }
        for i in 0..PIECES {
            if self.w[i] == square {
                return Some(('W', i));
            }
        }
        for i in 0..PIECES {
            if self.b[i] == square {
                return Some(('B', i));
            }
        }
        None
    }
    fn runs_of(&self, side: char) -> Vec<Vec<u8>> {
        let mut occ: Vec<u8> = (1..=BOARD_MAX)
            .filter(|&s| self.board_occupant(s).map(|(c, _)| c) == Some(side))
            .collect();
        occ.sort_unstable();
        let mut runs = vec![];
        let mut i = 0;
        while i < occ.len() {
            let mut j = i + 1;
            while j < occ.len() && occ[j] == occ[j - 1] + 1 {
                j += 1;
            }
            runs.push(occ[i..j].to_vec());
            i = j;
        }
        runs
    }
    fn is_wall(&self, square: u8, owner: char) -> bool {
        self.runs_of(owner)
            .iter()
            .any(|run| run.len() >= 2 && run.contains(&square))
    }
    fn has_path_block(&self, from: u8, to: u8, enemy: char) -> bool {
        for s in (from + 1)..=to {
            if self.is_wall(s, enemy) {
                return true;
            }
        }
        false
    }
    fn legal_moves(&self, side: char, roll: u8) -> Vec<(usize, u8, u8)> {
        let arr = if side == 'W' { &self.w } else { &self.b };
        let enemy = if side == 'W' { 'B' } else { 'W' };
        let mut v = vec![];
        for (idx, &from) in arr.iter().enumerate() {
            if from == 0 {
                continue;
            } // off는 없음(초기엔 모두 온보드)
            let dest = from.saturating_add(roll);
            if dest > EXIT_SQUARE {
                continue;
            }
            if self.has_path_block(from, dest, enemy) {
                continue;
            }
            if dest < EXIT_SQUARE {
                if let Some((c, _)) = self.board_occupant(dest) {
                    if c == side {
                        continue;
                    }
                }
                if let Some((c, _)) = self.board_occupant(dest) {
                    if SAFE_SQUARES.contains(&dest) {
                        continue;
                    }
                    if self.is_wall(dest, c) {
                        continue;
                    }
                }
                if dest == WATER_SQUARE {
                    let s15 = self.board_occupant(15).is_none();
                    let s26 = self.board_occupant(26).is_none();
                    if !(s15 || s26) {
                        continue;
                    }
                }
            }
            v.push((idx, from, dest));
        }
        v
    }
    fn roll(&mut self) -> (u8, [u8; 4], bool, bool) {
        // returns: roll, faces, grants_extra_turn_default, can_move
        let mut faces = 0u8;
        let mut vec = [0u8; 4];
        for i in 0..4 {
            let face = rand::thread_rng().gen_bool(0.5) as u8;
            vec[i] = face;
            faces += face;
        }
        let roll = if faces == 0 { 5 } else { faces };
        self.last_roll = Some(roll);
        let legal = self.legal_moves(self.turn, roll);
        let grants = roll == 4 || roll == 5;
        (roll, vec, grants, !legal.is_empty())
    }
    fn apply_move(
        &mut self,
        side: char,
        idx: usize,
        from: u8,
        to: u8,
        roll: u8,
    ) -> (bool, bool, bool, Option<(char, usize)>) {
        // 1) 불변 검증
        if self.turn != side {
            return (false, false, false, None);
        }
        if self.last_roll != Some(roll) {
            return (false, false, false, None);
        }
        let cur_from = if side == 'W' {
            self.w.get(idx).copied()
        } else {
            self.b.get(idx).copied()
        };
        if cur_from != Some(from) {
            return (false, false, false, None);
        }
        if to > EXIT_SQUARE {
            return (false, false, false, None);
        }
        let enemy = if side == 'W' { 'B' } else { 'W' };
        if self.has_path_block(from, to, enemy) {
            return (false, false, false, None);
        }

        let passes_water = ((from + 1)..=to).any(|s| s == WATER_SQUARE);
        let mut extra = roll == 4 || roll == 5;

        // 목적지 규칙 사전 계산
        enum Act {
            Exit,
            Water,
            Swap(char, usize),
            Move,
        }
        let action = if to == EXIT_SQUARE {
            if passes_water {
                extra = false;
            }
            Act::Exit
        } else if to == WATER_SQUARE {
            let s15_free = self.board_occupant(15).is_none();
            let s26_free = self.board_occupant(26).is_none();
            if !(s15_free || s26_free) {
                return (false, false, false, None);
            }
            extra = false;
            Act::Water
            } else {
            if let Some((c, eidx)) = self.board_occupant(to) {
                if c == side {
                    return (false, false, false, None);
                }
                if SAFE_SQUARES.contains(&to) {
                    return (false, false, false, None);
                }
                if self.is_wall(to, c) {
                    return (false, false, false, None);
                }
                if passes_water {
                    extra = false;
                }
                Act::Swap(c, eidx)
            } else {
                if passes_water {
                    extra = false;
                }
                Act::Move
            }
        };

        // 2) 가변 갱신
        let mut captured = None;
        match (side, action) {
            ('W', Act::Exit) => {
                self.w[idx] = 31;
            }
            ('B', Act::Exit) => {
                self.b[idx] = 31;
            }
            ('W', Act::Water) => {
                let target = if self.board_occupant(15).is_none() {
                    15
                } else {
                    26
                };
                self.w[idx] = target;
            }
            ('B', Act::Water) => {
                let target = if self.board_occupant(15).is_none() {
                    15
                } else {
                    26
                };
                self.b[idx] = target;
            }
            ('W', Act::Move) => {
                self.w[idx] = to;
            }
            ('B', Act::Move) => {
                self.b[idx] = to;
            }
            ('W', Act::Swap(c, eidx)) => {
                self.w[idx] = to;
                if c == 'W' {
                    self.w[eidx] = from;
                } else {
                    self.b[eidx] = from;
                }
                captured = Some((c, eidx));
            }
            ('B', Act::Swap(c, eidx)) => {
                self.b[idx] = to;
                if c == 'W' {
                    self.w[eidx] = from;
                } else {
                    self.b[eidx] = from;
                }
                captured = Some((c, eidx));
            }
            _ => return (false, false, false, None),
        }

        // 승리 판정
        if (0..PIECES).all(|i| self.w[i] == 31) {
            self.game_over = true;
        }
        if (0..PIECES).all(|i| self.b[i] == 31) {
            self.game_over = true;
        }

        (true, extra && !self.game_over, passes_water, captured)
    }
}

// ========================= 서버에서 쓸 메시지 포맷 =========================

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "data")]
enum ServerMsg {
    ROOM_CREATED {
        roomId: String,
        roomName: String,
        owner: String,
        maxPlayers: u8,
        status: String,
    },
    ROOM_JOINED {
        roomId: String,
        roomName: String,
        players: Vec<Value>,
    },
    PLAYER_READY {
        roomId: String,
        playerId: String,
        isReady: bool,
        allReady: bool,
    },
    GAME_STARTED {
        roomId: String,
        gameId: String,
        players: Vec<Value>,
        initialTurn: String,
        gameState: Value,
    },
    STICKS_ROLLED {
        roomId: String,
        gameId: String,
        playerId: String,
        roll: u8,
        faces: [u8; 4],
        turn: String,
        canMove: bool,
    },
    PIECE_MOVED {
        roomId: String,
        gameId: String,
        move_: Value,
        gameState: Value,
    },
    TURN_CHANGED {
        roomId: String,
        gameId: String,
        newTurn: String,
        reason: String,
    },
    GAME_ENDED {
        roomId: String,
        gameId: String,
        winner: String,
        winnerName: String,
        finalState: Value,
        gameDuration: u64,
    },
    GAME_RESET {
        roomId: String,
        gameId: String,
        resetBy: String,
        newGameId: String,
    },
    PLAYER_STATUS {
        roomId: String,
        playerId: String,
        status: String,
        lastSeen: u128,
    },
    CHAT_RECEIVED {
        roomId: String,
        playerId: String,
        playerName: String,
        message: String,
        messageType: String,
        timestamp: u128,
    },
    RoomList {
        rooms: Vec<Value>,
        totalCount: usize,
        filters: Value,
    },
    ERROR {
        code: String,
        message: String,
        details: Value,
    },
}

impl ServerMsg {
    fn wrap(self) -> String {
        let (msg_type, data) = match self {
            ServerMsg::ROOM_CREATED { roomId, roomName, owner, maxPlayers, status } => {
                ("ROOM_CREATED".to_string(), json!({
                    "roomId": roomId,
                    "roomName": roomName,
                    "owner": owner,
                    "maxPlayers": maxPlayers,
                    "status": status
                }))
            }
            ServerMsg::ROOM_JOINED { roomId, roomName, players } => {
                ("ROOM_JOINED".to_string(), json!({
                    "roomId": roomId,
                    "roomName": roomName,
                    "players": players
                }))
            }
            ServerMsg::PLAYER_READY { roomId, playerId, isReady, allReady } => {
                ("PLAYER_READY".to_string(), json!({
                    "roomId": roomId,
                    "playerId": playerId,
                    "isReady": isReady,
                    "allReady": allReady
                }))
            }
            ServerMsg::GAME_STARTED { roomId, gameId, players, initialTurn, gameState } => {
                ("GAME_STARTED".to_string(), json!({
                    "roomId": roomId,
                    "gameId": gameId,
                    "players": players,
                    "initialTurn": initialTurn,
                    "gameState": gameState
                }))
            }
            ServerMsg::STICKS_ROLLED { roomId, gameId, playerId, roll, faces, turn, canMove } => {
                ("STICKS_ROLLED".to_string(), json!({
                    "roomId": roomId,
                    "gameId": gameId,
                    "playerId": playerId,
                    "roll": roll,
                    "faces": faces,
                    "turn": turn,
                    "canMove": canMove
                }))
            }
            ServerMsg::PIECE_MOVED { roomId, gameId, move_, gameState } => {
                ("PIECE_MOVED".to_string(), json!({
                    "roomId": roomId,
                    "gameId": gameId,
                    "move": move_,
                    "gameState": gameState
                }))
            }
            ServerMsg::TURN_CHANGED { roomId, gameId, newTurn, reason } => {
                ("TURN_CHANGED".to_string(), json!({
                    "roomId": roomId,
                    "gameId": gameId,
                    "newTurn": newTurn,
                    "reason": reason
                }))
            }
            ServerMsg::GAME_ENDED { roomId, gameId, winner, winnerName, finalState, gameDuration } => {
                ("GAME_ENDED".to_string(), json!({
                    "roomId": roomId,
                    "gameId": gameId,
                    "winner": winner,
                    "winnerName": winnerName,
                    "finalState": finalState,
                    "gameDuration": gameDuration
                }))
            }
            ServerMsg::GAME_RESET { roomId, gameId, resetBy, newGameId } => {
                ("GAME_RESET".to_string(), json!({
                    "roomId": roomId,
                    "gameId": gameId,
                    "resetBy": resetBy,
                    "newGameId": newGameId
                }))
            }
            ServerMsg::PLAYER_STATUS { roomId, playerId, status, lastSeen } => {
                ("PLAYER_STATUS".to_string(), json!({
                    "roomId": roomId,
                    "playerId": playerId,
                    "status": status,
                    "lastSeen": lastSeen
                }))
            }
            ServerMsg::CHAT_RECEIVED { roomId, playerId, playerName, message, messageType, timestamp } => {
                ("CHAT_RECEIVED".to_string(), json!({
                    "roomId": roomId,
                    "playerId": playerId,
                    "playerName": playerName,
                    "message": message,
                    "messageType": messageType,
                    "timestamp": timestamp
                }))
            }
            ServerMsg::RoomList { rooms, totalCount, filters } => {
                ("ROOM_LIST".to_string(), json!({
                    "rooms": rooms,
                    "totalCount": totalCount,
                    "filters": filters
                }))
            }
            ServerMsg::ERROR { code, message, details } => {
                ("ERROR".to_string(), json!({
                    "code": code,
                    "message": message,
                    "details": details
                }))
            }
        };

        serde_json::to_string(&Envelope {
            r#type: msg_type,
            timestamp: ts(),
            data,
        })
        .unwrap()
    }
}

// ========================= 엔드포인트 =========================

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().with_env_filter("info").init();
    let state = AppState {
        rooms: Arc::new(DashMap::new()),
    };
    let app = Router::new()
        .route("/ws", get(ws_handler))
        .with_state(state);
    let addr = "0.0.0.0:8080";
    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
    info!(%addr, "listening");
}

async fn ws_handler(State(state): State<AppState>, ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(move |socket| client_loop(state, socket))
}

// ========================= 클라이언트 루프 =========================

async fn client_loop(state: AppState, mut socket: WebSocket) {
    // 개인 sender
    let (tx, mut rx) = mpsc::channel::<String>(256);
    let (mut ws_tx, mut ws_rx) = socket.split();
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_tx.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    // 조인한 방
    let mut joined_room: Option<Arc<Room>> = None;
    let mut self_player_id: Option<String> = None;
    let mut self_player_name: Option<String> = None;

    while let Some(Ok(Message::Text(text))) = ws_rx.next().await {
        let Ok(v): Result<Value, _> = serde_json::from_str(&text) else {
            continue;
        };
        let t = v
            .get("type")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string();
        let data = v.get("data").cloned().unwrap_or(json!({}));

        match t.as_str() {
            // ---------- GET_ROOM_LIST ----------
            "GET_ROOM_LIST" => {
                let filters = data.get("filters").cloned().unwrap_or(json!({}));
                let status_filter = filters
                    .get("status")
                    .and_then(|x| x.as_str())
                    .unwrap_or("all");
                let has_password_filter = filters.get("hasPassword");
                let max_players_filter = filters.get("maxPlayers");

                let mut rooms = vec![];

                for room_entry in state.rooms.iter() {
                    let room = room_entry.value();
                    let inner = room.inner.try_read();

                    if let Ok(inner) = inner {
                        // 상태 필터링
                        let status_match = match status_filter {
                            "waiting" => matches!(inner.status, RoomStatus::Waiting),
                            "playing" => matches!(inner.status, RoomStatus::Playing),
                            _ => true, // "all" or 기타
                        };

                        if !status_match {
                            continue;
                        }

                        // 비밀번호 필터링
                        let password_match = match has_password_filter {
                            Some(Value::Bool(has_pass)) => inner.password.is_some() == *has_pass,
                            _ => true, // null이거나 다른 값이면 모두 포함
                        };

                        if !password_match {
                            continue;
                        }

                        // 최대 플레이어 수 필터링
                        let max_players_match = match max_players_filter {
                            Some(Value::Number(max_p)) => {
                                if let Some(max_u64) = max_p.as_u64() {
                                    inner.max_players == max_u64 as usize
                                } else {
                                    true
                                }
                            }
                            _ => true, // null이거나 다른 값이면 모두 포함
                        };

                        if !max_players_match {
                            continue;
                        }

                        // 방 정보 수집
                        let room_info = json!({
                            "id": room.id.clone(), // 실제 방 ID 사용
                            "name": inner.name.clone(),
                            "status": match inner.status {
                                RoomStatus::Waiting => "waiting",
                                RoomStatus::Playing => "playing",
                                RoomStatus::Finished => "finished",
                            },
                            "owner": inner.owner.clone(),
                            "currentPlayers": inner.players.len(),
                            "maxPlayers": inner.max_players,
                            "hasPassword": inner.password.is_some(),
                            "createdAt": inner.last_activity
                        });

                        rooms.push(room_info);
                    }
                }

                let response = ServerMsg::RoomList {
                    rooms: rooms.clone(),
                    totalCount: rooms.len(),
                    filters: filters.clone(),
                };

                let _ = tx.send(response.wrap()).await;
            }

            // ---------- CREATE_ROOM ----------
            "CREATE_ROOM" => {
                let room_name = data
                    .get("roomName")
                    .and_then(|x| x.as_str())
                    .unwrap_or("Room")
                    .to_string();
                let password = data
                    .get("password")
                    .and_then(|x| x.as_str())
                    .filter(|s| !s.is_empty())
                    .map(|s| s.to_string());
                let max_players =
                    data.get("maxPlayers").and_then(|x| x.as_u64()).unwrap_or(2) as usize;
                let player_name = data
                    .get("playerName")
                    .and_then(|x| x.as_str())
                    .unwrap_or("Player")
                    .to_string();
                let player_id = data
                    .get("playerId")
                    .and_then(|x| x.as_str())
                    .map(|s| s.to_string())
                    .unwrap_or_else(|| Uuid::new_v4().to_string());
                let room_id = Uuid::new_v4().to_string();

                // 방 생성
                let (btx, _rx) = broadcast::channel::<ServerMsg>(256);
                let room = Arc::new(Room {
                    id: room_id.clone(),
                    tx: btx.clone(),
                    inner: Arc::new(RwLock::new(RoomInner {
                    status: RoomStatus::Waiting,
                    name: room_name.clone(),
                    owner: player_id.clone(),
                    password,
                    max_players,
                    players: DashMap::new(),
                    spectators: DashMap::new(),
                    seats: DashMap::new(),
                    ready: DashMap::new(),
                    game: GameState::new(),
                    game_id: Uuid::new_v4().to_string(),
                    last_activity: ts(),
                    })),
                });

                // 방 ID를 키로 사용해서 저장
                state.rooms.insert(room_id.clone(), room.clone());

                // 생성과 동시에 방장 입장(W)
                {
                    let mut inner = room.inner.write().await;
                    
                    // 방장을 플레이어로 등록
                    let ptx = tx.clone();
                    inner.players.insert(
                        player_id.clone(),
                        Player {
                            id: player_id.clone(),
                            name: player_name.clone(),
                            tx: ptx,
                        },
                    );
                    inner.ready.insert(player_id.clone(), true);
                    inner.seats.insert('W', player_id.clone());
                    inner.last_activity = ts();

                    // 방장에게 ROOM_CREATED 메시지 전송
                    let msg = ServerMsg::ROOM_CREATED {
                        roomId: room_id.clone(),
                        roomName: inner.name.clone(),
                        owner: player_name.clone(),
                        maxPlayers: inner.max_players as u8,
                        status: "waiting".into(),
                    };
                    let _ = tx.send(msg.wrap()).await;
                }

                // 브로드캐스트 포워딩 - 해당 클라이언트만 메시지를 받도록
                let mut brx = room.tx.subscribe();
                let tx_clone = tx.clone();
                let player_id_clone = player_id.clone();
                let room_id_clone = room.id.clone();
                tokio::spawn(async move {
                    println!("🎯 브로드캐스트 리스너 시작 - 방: {}, 플레이어: {}", room_id_clone, player_id_clone);
                    let mut msg_count = 0;
                    while let Ok(msg) = brx.recv().await {
                        msg_count += 1;
                        println!("📨 브로드캐스트 메시지 수신 #{} (방: {}, 플레이어: {}): {:?}", 
                                msg_count, room_id_clone, player_id_clone, msg);
                        
                        let wrapped_msg = msg.wrap();
                        println!("📦 래핑된 메시지 길이: {} bytes", wrapped_msg.len());
                        
                        // 해당 클라이언트에게 메시지 전달
                        match tx_clone.send(wrapped_msg).await {
                            Ok(_) => println!("✅ 클라이언트에게 메시지 전달 성공 #{} (방: {}, 플레이어: {})", 
                                             msg_count, room_id_clone, player_id_clone),
                            Err(e) => {
                                println!("❌ 클라이언트에게 메시지 전달 실패 #{} (방: {}, 플레이어: {}): {:?}", 
                                        msg_count, room_id_clone, player_id_clone, e);
                                break; // 전송 실패 시 리스너 종료
                            }
                        }
                    }
                    println!("🔚 브로드캐스트 리스너 종료 - 방: {}, 플레이어: {}, 총 메시지: {}", 
                            room_id_clone, player_id_clone, msg_count);
                });
                joined_room = Some(room);
                self_player_id = Some(player_id);
                self_player_name = Some(player_name);
            }

            // ---------- JOIN_ROOM ----------
            "JOIN_ROOM" => {
                let room_id = get_str(&data, "roomId");
                let password = data.get("password").and_then(|x| x.as_str());
                let player_name = get_str(&data, "playerName");
                let player_id = get_str(&data, "playerId");

                if let Some(room) = state.rooms.get(&room_id).map(|r| r.clone()) {
                    let mut inner = room.inner.write().await;
                    if inner.password.as_deref().is_some() && inner.password.as_deref() != password
                    {
                        send_err(
                            &tx,
                            "INVALID_PASSWORD",
                            "잘못된 비밀번호",
                            json!({"roomId":room_id}),
                        )
                        .await;
                        continue;
                    }
                    if inner.players.len() >= inner.max_players {
                        send_err(
                            &tx,
                            "ROOM_FULL",
                            "방이 가득 찼습니다",
                            json!({"roomId":room_id}),
                        )
                        .await;
                        continue;
                    }

                    // 브로드캐스트 포워딩 - 해당 클라이언트만 메시지를 받도록
                    let mut brx = room.tx.subscribe();
                    let tx_clone = tx.clone();
                    let player_id_clone = player_id.clone();
                    let room_id_clone = room.id.clone();
                    tokio::spawn(async move {
                        println!("🎯 브로드캐스트 리스너 시작 - 방: {}, 플레이어: {}", room_id_clone, player_id_clone);
                        let mut msg_count = 0;
                        while let Ok(msg) = brx.recv().await {
                            msg_count += 1;
                            println!("📨 브로드캐스트 메시지 수신 #{} (방: {}, 플레이어: {}): {:?}", 
                                    msg_count, room_id_clone, player_id_clone, msg);
                            
                            let wrapped_msg = msg.wrap();
                            println!("📦 래핑된 메시지 길이: {} bytes", wrapped_msg.len());
                            
                            // 해당 클라이언트에게 메시지 전달
                            match tx_clone.send(wrapped_msg).await {
                                Ok(_) => println!("✅ 클라이언트에게 메시지 전달 성공 #{} (방: {}, 플레이어: {})", 
                                                 msg_count, room_id_clone, player_id_clone),
                                Err(e) => {
                                    println!("❌ 클라이언트에게 메시지 전달 실패 #{} (방: {}, 플레이어: {}): {:?}", 
                                            msg_count, room_id_clone, player_id_clone, e);
                                    break; // 전송 실패 시 리스너 종료
                                }
                            }
                        }
                        println!("🔚 브로드캐스트 리스너 종료 - 방: {}, 플레이어: {}, 총 메시지: {}", 
                                room_id_clone, player_id_clone, msg_count);
                    });

                    // 플레이어 등록 & 좌석 배정(B)
                    inner.players.insert(
                        player_id.clone(),
                        Player {
                            id: player_id.clone(),
                            name: player_name.clone(),
                            tx: tx.clone(),
                        },
                    );
                    inner.ready.insert(player_id.clone(), false);
                    if !inner.seats.contains_key(&'W') {
                        inner.seats.insert('W', player_id.clone());
                    } else {
                        inner.seats.insert('B', player_id.clone());
                    }

                    let players_json = collect_players(&inner);
                    room.tx
                        .send(ServerMsg::ROOM_JOINED {
                            roomId: room.id.clone(),
                            roomName: inner.name.clone(),
                            players: players_json,
                        })
                        .ok();
                    inner.last_activity = ts();

                    drop(inner); // 🔑 가변 대여 해제

                    joined_room = Some(room);
                    self_player_id = Some(player_id);
                    self_player_name = Some(player_name);
                } else {
                    send_err(
                        &tx,
                        "ROOM_NOT_FOUND",
                        "방을 찾을 수 없습니다",
                        json!({"roomId":room_id}),
                    )
                    .await;
                }
            }

            // ---------- READY_STATUS ----------
            "READY_STATUS" => {
                if let Some(room) = &joined_room {
                    let room = room.clone();
                    let pid = get_str(&data, "playerId");
                    let rid = get_str(&data, "roomId");
                    let is_ready = data
                        .get("isReady")
                        .and_then(|x| x.as_bool())
                        .unwrap_or(false);
                    let mut inner = room.inner.write().await;
                    if room.id != rid {
                        continue;
                    }
                    inner.ready.insert(pid.clone(), is_ready);
                    let all_ready = inner.players.len() == 2
                        && inner.players.iter().all(|p| {
                            inner
                                .ready
                                .get(p.key())
                                .map(|r| *r.value())
                                .unwrap_or(false)
                        });
                    room.tx
                        .send(ServerMsg::PLAYER_READY {
                            roomId: room.id.clone(),
                            playerId: pid,
                            isReady: is_ready,
                            allReady: all_ready,
                        })
                        .ok();
                    inner.last_activity = ts();
                }
            }

            // ---------- START_GAME ----------
            "START_GAME" => {
                if let Some(room) = &joined_room {
                    let room = room.clone();
                    let pid = get_str(&data, "playerId");
                    let mut inner = room.inner.write().await;
                    if inner.owner != pid {
                        send_err(
                            &tx,
                            "NOT_ROOM_OWNER",
                            "방장만 시작할 수 있습니다",
                            json!({"roomId":room.id}),
                        )
                        .await;
                        continue;
                    }
                    if inner.seats.len() != 2 {
                        send_err(
                            &tx,
                            "PLAYER_NOT_READY",
                            "두 플레이어가 필요합니다",
                            json!({"roomId":room.id}),
                        )
                        .await;
                        continue;
                    }
                    inner.status = RoomStatus::Playing;
                    inner.game = GameState::new();
                    inner.game_id = Uuid::new_v4().to_string();
                    let players = collect_players(&inner);
                    let gs = inner.game.snapshot();
                    room.tx
                        .send(ServerMsg::GAME_STARTED {
                            roomId: room.id.clone(),
                            gameId: inner.game_id.clone(),
                            players,
                            initialTurn: inner.game.turn.to_string(),
                            gameState: serde_json::to_value(gs).unwrap(),
                        })
                        .ok();
                    inner.last_activity = ts();
                }
            }

            // ---------- ROLL_STICKS ----------
            "ROLL_STICKS" => {
                println!("🎲 ROLL_STICKS 메시지 수신: {:?}", data);
                println!("🎲 메시지 타입: {}", t);
                println!("🎲 메시지 데이터: {:?}", data);
                
                // 연결 상태 상세 디버깅
                println!("🔍 연결 상태 디버깅:");
                println!("  - joined_room 상태: {}", if joined_room.is_some() { "있음" } else { "없음" });
                if let Some(ref room) = joined_room {
                    println!("  - 현재 방 ID: {}", room.id);
                }
                println!("  - self_player_id: {:?}", self_player_id);
                println!("  - self_player_name: {:?}", self_player_name);
                
                // 🔄 재연결 자동 복구: joined_room이 없지만 요청에 방 정보가 있다면 복구 시도
                if joined_room.is_none() {
                    let rid = get_str(&data, "roomId");
                    let pid = get_str(&data, "playerId");
                    
                    if !rid.is_empty() && !pid.is_empty() {
                        println!("🔄 재연결 감지 - 방 복구 시도: 방ID={}, 플레이어ID={}", rid, pid);
                        
                        if let Some(room) = state.rooms.get(&rid) {
                            let inner = room.inner.try_read();
                            if let Ok(inner) = inner {
                                if inner.players.contains_key(&pid) {
                                    println!("✅ 방 복구 성공: 플레이어 '{}' 를 방 '{}' 에 다시 연결", pid, rid);
                                    drop(inner); // 읽기 잠금 해제
                                    
                                    // 브로드캐스트 리스너 다시 시작
                                    let tx_clone = tx.clone();
                                    let room_id_clone = rid.clone();
                                    let player_id_clone = pid.clone();
                                    let broadcast_rx = room.tx.subscribe();
                                    tokio::spawn(async move {
                                        let mut msg_count = 0;
                                        let mut broadcast_rx = broadcast_rx;
                                        println!("🎯 브로드캐스트 리스너 재시작 - 방: {}, 플레이어: {}", room_id_clone, player_id_clone);
                                        
                                        while let Ok(msg) = broadcast_rx.recv().await {
                                            msg_count += 1;
                                            println!("📨 브로드캐스트 메시지 수신 #{} (방: {}, 플레이어: {}): {:?}", 
                                                    msg_count, room_id_clone, player_id_clone, msg);
                                            
                                            let wrapped_msg = msg.wrap();
                                            println!("📦 래핑된 메시지 길이: {} bytes", wrapped_msg.len());
                                            
                                            if tx_clone.send(wrapped_msg).await.is_err() {
                                                println!("❌ 클라이언트 연결 끊어짐 #{} (방: {}, 플레이어: {})", 
                                                        msg_count, room_id_clone, player_id_clone);
                                                break;
                                            } else {
                                                println!("✅ 클라이언트에게 메시지 전달 성공 #{} (방: {}, 플레이어: {})", 
                                                        msg_count, room_id_clone, player_id_clone);
                                            }
                                        }
                                        println!("🔚 브로드캐스트 리스너 종료 - 방: {}, 플레이어: {}, 총 메시지: {}", 
                                                room_id_clone, player_id_clone, msg_count);
                                    });
                                    
                                    // 방 상태 복구
                                    joined_room = Some(room.clone());
                                    self_player_id = Some(pid.clone());
                                    self_player_name = Some(pid.clone()); // 임시로 ID를 이름으로 사용
                                    
                                    println!("🔄 방 상태 복구 완료");
                                } else {
                                    println!("❌ 방 복구 실패: 플레이어 '{}' 를 방 '{}' 에서 찾을 수 없음", pid, rid);
                                }
                            }
                        } else {
                            println!("❌ 방 복구 실패: 방 '{}' 를 찾을 수 없음", rid);
                        }
                    }
                }
                
                if let Some(room) = &joined_room {
                    let room = room.clone();
                    let pid = get_str(&data, "playerId");
                    let rid = get_str(&data, "roomId");
                    
                    println!("🎯 ROLL_STICKS 처리: 방={}, 플레이어={}", room.id, pid);
                    println!("🎯 방 ID 비교: 요청={}, 현재={}", rid, room.id);
                    
                    let mut inner = room.inner.write().await;
                    if inner.status != RoomStatus::Playing {
                        println!("❌ 게임이 시작되지 않음: 상태={:?}", inner.status);
                        send_err(
                            &tx,
                            "GAME_NOT_STARTED",
                            "게임이 시작되지 않았습니다",
                            json!({"roomId":room.id}),
                        )
                        .await;
                        continue;
                    }
                    
                    // 턴 체크
                    let cur_pid = inner.seats.get(&inner.game.turn).map(|e| e.value().clone());
                    println!("🎲 턴 체크: 현재 턴={}, 현재 플레이어={}, 요청 플레이어={}", 
                            inner.game.turn, cur_pid.as_deref().unwrap_or("없음"), pid);
                    
                    if cur_pid.as_deref() != Some(&pid) {
                        println!("❌ 턴이 아님: 현재 턴 플레이어={}, 요청 플레이어={}", 
                                cur_pid.as_deref().unwrap_or("없음"), pid);
                        send_err(
                            &tx,
                            "NOT_YOUR_TURN",
                            "내 턴이 아닙니다",
                            json!({"roomId":room.id}),
                        )
                        .await;
                        continue;
                    }
                    
                    let (roll, faces, _grants, can_move) = inner.game.roll();
                    println!("🎲 주사위 굴림 결과: roll={}, faces={:?}, can_move={}", roll, faces, can_move);
                    
                    let msg = ServerMsg::STICKS_ROLLED {
                        roomId: room.id.clone(),
                        gameId: inner.game_id.clone(),
                        playerId: pid,
                        roll,
                        faces,
                        turn: inner.game.turn.to_string(),
                        canMove: can_move,
                    };
                    
                    println!("📤 STICKS_ROLLED 메시지 브로드캐스트: {:?}", msg);
                    println!("🔍 브로드캐스트 채널 수신자 수: {}", room.tx.receiver_count());
                    
                    match room.tx.send(msg) {
                        Ok(receiver_count) => {
                            println!("✅ STICKS_ROLLED 메시지 전송 성공, 수신자 수: {}", receiver_count);
                        },
                        Err(e) => {
                            println!("❌ STICKS_ROLLED 메시지 전송 실패: {:?}", e);
                            println!("🔍 브로드캐스트 채널 상태 - 활성 수신자: {}", room.tx.receiver_count());
                        },
                    }
                    
                    inner.last_activity = ts();
                } else {
                    println!("❌ 방에 참가하지 않음");
                }
            }

            // ---------- MOVE_PIECE ----------
            "MOVE_PIECE" => {
                if let Some(room) = &joined_room {
                    let room = room.clone();
                    let rid = get_str(&data, "roomId");
                    if room.id != rid {
                        continue;
                    }
                    let pid = get_str(&data, "playerId");
                    let mut inner = room.inner.write().await;
                    if inner.status != RoomStatus::Playing {
                        send_err(
                            &tx,
                            "GAME_NOT_STARTED",
                            "게임이 시작되지 않았습니다",
                            json!({"roomId":room.id}),
                        )
                        .await;
                        continue;
                    }
                    let move_obj = data.get("move").cloned().unwrap_or(json!({}));
                    let side = move_obj
                        .get("side")
                        .and_then(|x| x.as_str())
                        .unwrap_or("W")
                        .chars()
                        .next()
                        .unwrap();
                    // 좌석-플레이어 검증
                    if inner.seats.get(&side).map(|e| e.value().clone()).as_deref() != Some(&pid) {
                        send_err(
                            &tx,
                            "NOT_YOUR_TURN",
                            "해당 진영의 플레이어가 아닙니다",
                            json!({"roomId":room.id}),
                        )
                        .await;
                        continue;
                    }
                    if inner.game.turn != side {
                        send_err(
                            &tx,
                            "NOT_YOUR_TURN",
                            "내 턴이 아닙니다",
                            json!({"roomId":room.id}),
                        )
                        .await;
                        continue;
                    }
                    let idx = move_obj
                        .get("pieceIndex")
                        .and_then(|x| x.as_u64())
                        .unwrap_or(0) as usize;
                    let from = move_obj.get("from").and_then(|x| x.as_u64()).unwrap_or(0) as u8;
                    let to = move_obj.get("to").and_then(|x| x.as_u64()).unwrap_or(0) as u8;
                    let roll = move_obj.get("roll").and_then(|x| x.as_u64()).unwrap_or(0) as u8;

                    let (ok, extra, passed_water, captured) =
                        inner.game.apply_move(side, idx, from, to, roll);
                    if !ok {
                        send_err(
                            &tx,
                            "INVALID_MOVE",
                            "유효하지 않은 이동입니다",
                            json!({"reason":"rule_violation"}),
                        )
                        .await;
                        continue;
                    }

                    // 업데이트 및 브로드캐스트
                    let move_payload = json!({"playerId": pid.clone(), "side": side.to_string(), "pieceIndex": idx, "from": from, "to": to, "roll": roll, "captured": captured.map(|(c, _)| c.to_string()), "extraTurn": extra });
                    let gs = inner.game.snapshot();

                    println!("🔄 말 이동 브로드캐스트: 방={}, 플레이어={}, 이동={:?}", room.id, pid, move_payload);

                    // 게임 상태 디버깅
                    let game_state_json = serde_json::to_value(&gs).unwrap();
                    println!("📊 게임 상태: {:?}", game_state_json);

                    let piece_moved_msg = ServerMsg::PIECE_MOVED {
                        roomId: room.id.clone(),
                        gameId: inner.game_id.clone(),
                        move_: move_payload.clone(),
                        gameState: game_state_json,
                    };
                    
                    println!("📤 PIECE_MOVED 메시지 브로드캐스트 준비");
                    println!("🔍 브로드캐스트 채널 수신자 수: {}", room.tx.receiver_count());
                    
                    match room.tx.send(piece_moved_msg) {
                        Ok(receiver_count) => {
                            println!("✅ PIECE_MOVED 메시지 전송 성공, 수신자 수: {}", receiver_count);
                        },
                        Err(e) => {
                            println!("❌ PIECE_MOVED 메시지 전송 실패: {:?}", e);
                            println!("🔍 브로드캐스트 채널 상태 - 활성 수신자: {}", room.tx.receiver_count());
                        },
                    }

                    // 턴 전환
                    let mut reason = "normal_move".to_string();
                    if extra {
                        reason = "extra_turn".into();
                    } else if !extra && !passed_water {
                        inner.game.turn = if inner.game.turn == 'W' { 'B' } else { 'W' };
                    } else if passed_water {
                        inner.game.turn = if inner.game.turn == 'W' { 'B' } else { 'W' };
                    }

                    if !extra {
                        room.tx
                            .send(ServerMsg::TURN_CHANGED {
                                roomId: room.id.clone(),
                                gameId: inner.game_id.clone(),
                                newTurn: inner.game.turn.to_string(),
                                reason,
                            })
                            .ok();
                    }

                    if inner.game.game_over {
                        let winner = side.to_string();
                        let winner_name = inner
                            .seats
                            .get(&side)
                            .and_then(|e| inner.players.get(e.value()))
                            .map(|p| p.name.clone())
                            .unwrap_or_else(|| "Unknown".into());
                        room.tx
                            .send(ServerMsg::GAME_ENDED {
                                roomId: room.id.clone(),
                                gameId: inner.game_id.clone(),
                                winner,
                                winnerName: winner_name,
                                finalState: serde_json::to_value(gs).unwrap(),
                                gameDuration: 0,
                            })
                            .ok();
                        inner.status = RoomStatus::Finished;
                    }
                    inner.last_activity = ts();
                }
            }

            // ---------- RESET_GAME ----------
            "RESET_GAME" => {
                if let Some(room) = &joined_room {
                    let room = room.clone();
                    let pid = get_str(&data, "playerId");
                    let mut inner = room.inner.write().await;
                    if inner.owner != pid {
                        send_err(
                            &tx,
                            "NOT_ROOM_OWNER",
                            "방장만 리셋 가능합니다",
                            json!({"roomId":room.id}),
                        )
                        .await;
                        continue;
                    }
                    let old = inner.game_id.clone();
                    inner.game = GameState::new();
                    inner.game_id = Uuid::new_v4().to_string();
                    room.tx
                        .send(ServerMsg::GAME_RESET {
                            roomId: room.id.clone(),
                            gameId: old,
                            resetBy: pid,
                            newGameId: inner.game_id.clone(),
                        })
                        .ok();
                    let gs = inner.game.snapshot();
                    room.tx
                        .send(ServerMsg::GAME_STARTED {
                            roomId: room.id.clone(),
                            gameId: inner.game_id.clone(),
                            players: collect_players(&inner),
                            initialTurn: inner.game.turn.to_string(),
                            gameState: serde_json::to_value(gs).unwrap(),
                        })
                        .ok();
                    inner.status = RoomStatus::Playing;
                    inner.last_activity = ts();
                }
            }

            // ---------- LEAVE_ROOM ----------
            "LEAVE_ROOM" => {
                if let Some(room) = joined_room.take() {
                    let room = room.clone();
                    let rid = get_str(&data, "roomId");
                    let pid = get_str(&data, "playerId");
                    if room.id != rid {
                        continue;
                    }
                    let mut inner = room.inner.write().await;
                    inner.players.remove(&pid);
                    inner.ready.remove(&pid);
                    for k in ['W', 'B'] {
                        if inner.seats.get(&k).map(|e| e.value().clone()) == Some(pid.clone()) {
                            inner.seats.remove(&k);
                        }
                    }
                    inner.last_activity = ts();
                }
            }

            // ---------- DELETE_ROOM ----------
            "DELETE_ROOM" => {
                let rid = get_str(&data, "roomId");
                let pid = get_str(&data, "playerId");
                if let Some(room) = state.rooms.get(&rid).map(|r| r.clone()) {
                    let inner = room.inner.read().await;
                    if inner.owner != pid {
                        send_err(
                            &tx,
                            "NOT_ROOM_OWNER",
                            "방장 권한이 없습니다",
                            json!({"roomId":rid}),
                        )
                        .await;
                        continue;
                    }
                    drop(inner);
                    state.rooms.remove(&rid);
                }
            }

            // ---------- CHAT_MESSAGE ----------
            "CHAT_MESSAGE" => {
                if let Some(room) = &joined_room {
                    let room = room.clone();
                    let rid = get_str(&data, "roomId");
                    if room.id != rid {
                        continue;
                    }
                    let pid = get_str(&data, "playerId");
                    let msg = get_str(&data, "message");
                    let name = self_player_name.clone().unwrap_or_else(|| "Player".into());
                    let now = ts();
                    room.tx
                        .send(ServerMsg::CHAT_RECEIVED {
                            roomId: rid,
                            playerId: pid,
                            playerName: name,
                            message: msg,
                            messageType: data
                                .get("messageType")
                                .and_then(|x| x.as_str())
                                .unwrap_or("text")
                                .into(),
                            timestamp: now,
                        })
                        .ok();
                }
            }

            // ---------- HEARTBEAT ----------
            "HEARTBEAT" => {
                if let Some(room) = &joined_room {
                    let room = room.clone();
                    let rid = data
                        .get("roomId")
                        .and_then(|x| x.as_str())
                        .unwrap_or("")
                        .to_string();
                    let pid = get_str(&data, "playerId");
                    if room.id == rid {
                        let mut inner = room.inner.write().await;
                        inner.last_activity = ts();
                        room.tx
                            .send(ServerMsg::PLAYER_STATUS {
                                roomId: room.id.clone(),
                                playerId: pid,
                                status: "connected".into(),
                                lastSeen: inner.last_activity,
                            })
                            .ok();
                    }
                }
            }

            _ => { /* ignore unknown */ }
        }
    }
}

// ========================= 유틸 =========================

async fn send_err(tx: &mpsc::Sender<String>, code: &str, message: &str, details: Value) {
    let env = ServerMsg::ERROR {
        code: code.into(),
        message: message.into(),
        details,
    }
    .wrap();
    let _ = tx.send(env).await;
}

fn collect_players(inner: &RoomInner) -> Vec<Value> {
    let mut v = vec![];
    for p in inner.players.iter() {
        let pid = p.key().clone();
        let name = p.value().name.clone();
        let is_owner = inner.owner == pid;
        let is_ready = inner.ready.get(&pid).map(|r| *r.value()).unwrap_or(false);
        let mut side: Option<String> = None;
        for k in ['W', 'B'] {
            if inner.seats.get(&k).map(|e| e.value().clone()) == Some(pid.clone()) {
                side = Some(k.to_string());
            }
        }
        v.push(json!({"playerId":pid,"playerName":name,"isOwner":is_owner,"isReady":is_ready,"side":side.unwrap_or("".into())}));
    }
    v
}

fn get_str(d: &Value, key: &str) -> String {
    d.get(key)
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .to_string()
}


