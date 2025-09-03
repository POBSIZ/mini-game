use crate::types::{ts, Envelope};
use serde::Serialize;
use serde_json::{json, Value};

// ========================= 서버에서 쓸 메시지 포맷 =========================

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "data")]
pub enum ServerMsg {
    RoomCreated {
        #[serde(rename = "roomId")]
        room_id: String,
        #[serde(rename = "roomName")]
        room_name: String,
        owner: String,
        #[serde(rename = "maxPlayers")]
        max_players: u8,
        status: String,
    },
    RoomJoined {
        #[serde(rename = "roomId")]
        room_id: String,
        #[serde(rename = "roomName")]
        room_name: String,
        players: Vec<Value>,
    },
    PlayerReady {
        #[serde(rename = "roomId")]
        room_id: String,
        #[serde(rename = "playerId")]
        player_id: String,
        #[serde(rename = "isReady")]
        is_ready: bool,
        #[serde(rename = "allReady")]
        all_ready: bool,
    },
    GameStarted {
        #[serde(rename = "roomId")]
        room_id: String,
        #[serde(rename = "gameId")]
        game_id: String,
        players: Vec<Value>,
        #[serde(rename = "initialTurn")]
        initial_turn: String,
        #[serde(rename = "gameState")]
        game_state: Value,
    },
    SticksRolled {
        #[serde(rename = "roomId")]
        room_id: String,
        #[serde(rename = "gameId")]
        game_id: String,
        #[serde(rename = "playerId")]
        player_id: String,
        roll: u8,
        faces: [u8; 4],
        turn: String,
        #[serde(rename = "canMove")]
        can_move: bool,
    },
    PieceMoved {
        #[serde(rename = "roomId")]
        room_id: String,
        #[serde(rename = "gameId")]
        game_id: String,
        #[serde(rename = "move")]
        move_: Value,
        #[serde(rename = "gameState")]
        game_state: Value,
    },
    TurnChanged {
        #[serde(rename = "roomId")]
        room_id: String,
        #[serde(rename = "gameId")]
        game_id: String,
        #[serde(rename = "newTurn")]
        new_turn: String,
        reason: String,
    },
    GameEnded {
        #[serde(rename = "roomId")]
        room_id: String,
        #[serde(rename = "gameId")]
        game_id: String,
        winner: String,
        #[serde(rename = "winnerName")]
        winner_name: String,
        #[serde(rename = "finalState")]
        final_state: Value,
        #[serde(rename = "gameDuration")]
        game_duration: u64,
    },
    GameReset {
        #[serde(rename = "roomId")]
        room_id: String,
        #[serde(rename = "gameId")]
        game_id: String,
        #[serde(rename = "resetBy")]
        reset_by: String,
        #[serde(rename = "newGameId")]
        new_game_id: String,
    },
    PlayerStatus {
        #[serde(rename = "roomId")]
        room_id: String,
        #[serde(rename = "playerId")]
        player_id: String,
        status: String,
        #[serde(rename = "lastSeen")]
        last_seen: u128,
    },
    ChatReceived {
        #[serde(rename = "roomId")]
        room_id: String,
        #[serde(rename = "playerId")]
        player_id: String,
        #[serde(rename = "playerName")]
        player_name: String,
        message: String,
        #[serde(rename = "messageType")]
        message_type: String,
        timestamp: u128,
    },
    RoomList {
        rooms: Vec<Value>,
        #[serde(rename = "totalCount")]
        total_count: usize,
        filters: Value,
    },
    Error {
        code: String,
        message: String,
        details: Value,
    },
}

impl ServerMsg {
    pub fn wrap(self) -> String {
        let (msg_type, data) = match self {
            ServerMsg::RoomCreated {
                room_id,
                room_name,
                owner,
                max_players,
                status,
            } => (
                "ROOM_CREATED".to_string(),
                json!({
                    "roomId": room_id,
                    "roomName": room_name,
                    "owner": owner,
                    "maxPlayers": max_players,
                    "status": status
                }),
            ),
            ServerMsg::RoomJoined {
                room_id,
                room_name,
                players,
            } => (
                "ROOM_JOINED".to_string(),
                json!({
                    "roomId": room_id,
                    "roomName": room_name,
                    "players": players
                }),
            ),
            ServerMsg::PlayerReady {
                room_id,
                player_id,
                is_ready,
                all_ready,
            } => (
                "PLAYER_READY".to_string(),
                json!({
                    "roomId": room_id,
                    "playerId": player_id,
                    "isReady": is_ready,
                    "allReady": all_ready
                }),
            ),
            ServerMsg::GameStarted {
                room_id,
                game_id,
                players,
                initial_turn,
                game_state,
            } => (
                "GAME_STARTED".to_string(),
                json!({
                    "roomId": room_id,
                    "gameId": game_id,
                    "players": players,
                    "initialTurn": initial_turn,
                    "gameState": game_state
                }),
            ),
            ServerMsg::SticksRolled {
                room_id,
                game_id,
                player_id,
                roll,
                faces,
                turn,
                can_move,
            } => (
                "STICKS_ROLLED".to_string(),
                json!({
                    "roomId": room_id,
                    "gameId": game_id,
                    "playerId": player_id,
                    "roll": roll,
                    "faces": faces,
                    "turn": turn,
                    "canMove": can_move
                }),
            ),
            ServerMsg::PieceMoved {
                room_id,
                game_id,
                move_,
                game_state,
            } => (
                "PIECE_MOVED".to_string(),
                json!({
                    "roomId": room_id,
                    "gameId": game_id,
                    "move": move_,
                    "gameState": game_state
                }),
            ),
            ServerMsg::TurnChanged {
                room_id,
                game_id,
                new_turn,
                reason,
            } => (
                "TURN_CHANGED".to_string(),
                json!({
                    "roomId": room_id,
                    "gameId": game_id,
                    "newTurn": new_turn,
                    "reason": reason
                }),
            ),
            ServerMsg::GameEnded {
                room_id,
                game_id,
                winner,
                winner_name,
                final_state,
                game_duration,
            } => (
                "GAME_ENDED".to_string(),
                json!({
                    "roomId": room_id,
                    "gameId": game_id,
                    "winner": winner,
                    "winnerName": winner_name,
                    "finalState": final_state,
                    "gameDuration": game_duration
                }),
            ),
            ServerMsg::GameReset {
                room_id,
                game_id,
                reset_by,
                new_game_id,
            } => (
                "GAME_RESET".to_string(),
                json!({
                    "roomId": room_id,
                    "gameId": game_id,
                    "resetBy": reset_by,
                    "newGameId": new_game_id
                }),
            ),
            ServerMsg::PlayerStatus {
                room_id,
                player_id,
                status,
                last_seen,
            } => (
                "PLAYER_STATUS".to_string(),
                json!({
                    "roomId": room_id,
                    "playerId": player_id,
                    "status": status,
                    "lastSeen": last_seen
                }),
            ),
            ServerMsg::ChatReceived {
                room_id,
                player_id,
                player_name,
                message,
                message_type,
                timestamp,
            } => (
                "CHAT_RECEIVED".to_string(),
                json!({
                    "roomId": room_id,
                    "playerId": player_id,
                    "playerName": player_name,
                    "message": message,
                    "messageType": message_type,
                    "timestamp": timestamp
                }),
            ),
            ServerMsg::RoomList {
                rooms,
                total_count,
                filters,
            } => (
                "ROOM_LIST".to_string(),
                json!({
                    "rooms": rooms,
                    "totalCount": total_count,
                    "filters": filters
                }),
            ),
            ServerMsg::Error {
                code,
                message,
                details,
            } => (
                "ERROR".to_string(),
                json!({
                    "code": code,
                    "message": message,
                    "details": details
                }),
            ),
        };

        serde_json::to_string(&Envelope {
            r#type: msg_type,
            timestamp: ts(),
            data,
        })
        .unwrap()
    }
}
