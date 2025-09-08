use dashmap::DashMap;
use serde_json::json;
use std::sync::Arc;
use tokio::sync::{broadcast, mpsc, RwLock};
use uuid::Uuid;

use crate::{
    game::GameState,
    messages::ServerMsg,
    types::{ts, AppState, Player, Room, RoomInner, RoomStatus},
};

// ========================= 방 관리 함수들 =========================

pub async fn create_room(
    state: &AppState,
    tx: mpsc::Sender<String>,
    room_name: String,
    password: Option<String>,
    max_players: usize,
    player_name: String,
    player_id: String,
) -> Result<Arc<Room>, String> {
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

        // 방장에게 ROOM_CREATED 메시지 전송
        let msg = ServerMsg::RoomCreated {
            room_id: room_id.clone(),
            room_name: inner.name.clone(),
            owner: player_name.clone(),
            max_players: inner.max_players as u8,
            status: "waiting".into(),
        };
        if let Err(e) = tx.send(msg.wrap()).await {
            eprintln!("❌ ROOM_CREATED 메시지 전송 실패: {}", e);
        }

        // 방장에게 ROOM_JOINED 메시지도 개별 전송 (플레이어 목록 업데이트용)
        let players_json = crate::types::collect_players(&inner);
        let join_msg = ServerMsg::RoomJoined {
            room_id: room_id.clone(),
            room_name: inner.name.clone(),
            players: players_json.clone(),
        };
        if let Err(e) = tx.send(join_msg.wrap()).await {
            eprintln!("❌ ROOM_JOINED 메시지 전송 실패: {}", e);
        }

        // 다른 플레이어들에게 브로드캐스트 (현재는 방장만 있으므로 의미없지만 일관성을 위해)
        room.tx
            .send(ServerMsg::RoomJoined {
                room_id: room_id.clone(),
                room_name: inner.name.clone(),
                players: players_json,
            })
            .ok();
        inner.last_activity = ts();
    }

    Ok(room)
}

pub async fn join_room(
    state: &AppState,
    tx: mpsc::Sender<String>,
    room_id: String,
    password: Option<&str>,
    player_name: String,
    player_id: String,
) -> Result<Arc<Room>, String> {
    if let Some(room) = state.rooms.get(&room_id).map(|r| r.clone()) {
        let mut inner = room.inner.write().await;

        // 비밀번호 검증
        if inner.password.as_deref().is_some() && inner.password.as_deref() != password {
            return Err("INVALID_PASSWORD".to_string());
        }

        // 방이 가득 찼는지 확인
        if inner.players.len() >= inner.max_players {
            return Err("ROOM_FULL".to_string());
        }

        // 이미 참가한 플레이어인지 확인
        if inner.players.contains_key(&player_id) {
            return Err("ALREADY_JOINED".to_string());
        }

        // 플레이어 등록 & 좌석 배정
        inner.players.insert(
            player_id.clone(),
            Player {
                id: player_id.clone(),
                name: player_name.clone(),
                tx: tx.clone(),
            },
        );
        inner.ready.insert(player_id.clone(), false);

        // 빈 좌석에 배정
        if !inner.seats.contains_key(&'W') {
            inner.seats.insert('W', player_id.clone());
        } else if !inner.seats.contains_key(&'B') {
            inner.seats.insert('B', player_id.clone());
        } else {
            // 좌석이 모두 찬 경우 (이론적으로는 발생하지 않아야 함)
            return Err("NO_AVAILABLE_SEATS".to_string());
        }

        // 새로 참가한 플레이어에게 개별 메시지 전송
        let players_json = crate::types::collect_players(&inner);
        let join_msg = ServerMsg::RoomJoined {
            room_id: room.id.clone(),
            room_name: inner.name.clone(),
            players: players_json.clone(),
        };
        if let Err(e) = tx.send(join_msg.wrap()).await {
            eprintln!("❌ ROOM_JOINED 메시지 전송 실패: {}", e);
        }

        // 다른 플레이어들에게 브로드캐스트
        room.tx
            .send(ServerMsg::RoomJoined {
                room_id: room.id.clone(),
                room_name: inner.name.clone(),
                players: players_json,
            })
            .ok();
        inner.last_activity = ts();

        drop(inner); // 🔑 가변 대여 해제

        Ok(room)
    } else {
        Err("ROOM_NOT_FOUND".to_string())
    }
}

pub async fn leave_room(room: &Arc<Room>, player_id: String) {
    let mut inner = room.inner.write().await;

    // 플레이어 정보 저장 (알림용)
    let _player_name = inner
        .players
        .get(&player_id)
        .map(|p| p.name.clone())
        .unwrap_or_else(|| "Unknown".into());

    // 플레이어 제거
    inner.players.remove(&player_id);
    inner.ready.remove(&player_id);

    // 좌석에서 제거
    for k in ['W', 'B'] {
        if inner.seats.get(&k).map(|e| e.value().clone()) == Some(player_id.clone()) {
            inner.seats.remove(&k);
        }
    }

    // 방장이 나간 경우 새로운 방장 지정
    if inner.owner == player_id && !inner.players.is_empty() {
        let new_owner_id = inner
            .players
            .iter()
            .next()
            .map(|entry| entry.key().clone())
            .unwrap_or_else(|| player_id.clone());
        inner.owner = new_owner_id.clone();

        // 새로운 방장 지정 알림
        room.tx
            .send(ServerMsg::PlayerStatus {
                room_id: room.id.clone(),
                player_id: new_owner_id,
                status: "new_owner".into(),
                last_seen: ts(),
            })
            .ok();
    }

    // 게임 중이었다면 게임 종료 처리
    if inner.status == RoomStatus::Playing {
        inner.status = RoomStatus::Waiting;
        room.tx
            .send(ServerMsg::PlayerStatus {
                room_id: room.id.clone(),
                player_id: "system".to_string(),
                status: "game_cancelled".into(),
                last_seen: ts(),
            })
            .ok();
    }

    inner.last_activity = ts();

    // 남은 플레이어들에게 플레이어 나감 알림
    room.tx
        .send(ServerMsg::PlayerStatus {
            room_id: room.id.clone(),
            player_id: player_id.clone(),
            status: "left_room".into(),
            last_seen: ts(),
        })
        .ok();

    // 방 정보 업데이트 알림
    let players_json = crate::types::collect_players(&inner);
    room.tx
        .send(ServerMsg::RoomJoined {
            room_id: room.id.clone(),
            room_name: inner.name.clone(),
            players: players_json,
        })
        .ok();
}

pub async fn delete_room(
    state: &AppState,
    room_id: String,
    player_id: String,
) -> Result<(), String> {
    if let Some(room) = state.rooms.get(&room_id).map(|r| r.clone()) {
        let inner = room.inner.read().await;
        if inner.owner != player_id {
            return Err("NOT_ROOM_OWNER".to_string());
        }
        drop(inner);

        // 방 삭제 전에 모든 플레이어들에게 알림
        room.tx
            .send(ServerMsg::PlayerStatus {
                room_id: room_id.clone(),
                player_id: "system".to_string(),
                status: "room_deleted".into(),
                last_seen: ts(),
            })
            .ok();

        // 방을 상태에서 제거
        state.rooms.remove(&room_id);
        println!("🗑️ 방 삭제 완료: {}", room_id);

        Ok(())
    } else {
        Err("ROOM_NOT_FOUND".to_string())
    }
}

pub async fn start_game(room: &Arc<Room>, player_id: String) -> Result<(), String> {
    let mut inner = room.inner.write().await;

    if inner.owner != player_id {
        return Err("NOT_ROOM_OWNER".to_string());
    }

    if inner.seats.len() != 2 {
        return Err("NEED_TWO_PLAYERS".to_string());
    }

    // 모든 플레이어가 준비되었는지 확인
    let all_ready = inner.players.iter().all(|p| {
        inner
            .ready
            .get(p.key())
            .map(|r| *r.value())
            .unwrap_or(false)
    });

    if !all_ready {
        return Err("PLAYERS_NOT_READY".to_string());
    }

    inner.status = RoomStatus::Playing;
    inner.game = GameState::new();
    inner.game_id = Uuid::new_v4().to_string();
    let players = crate::types::collect_players(&inner);
    let gs = inner.game.snapshot();

    // 게임 시작 메시지 브로드캐스트
    let game_started_msg = ServerMsg::GameStarted {
        room_id: room.id.clone(),
        game_id: inner.game_id.clone(),
        players: players.clone(),
        initial_turn: inner.game.turn.to_string(),
        game_state: serde_json::to_value(gs).unwrap(),
    };

    if let Err(e) = room.tx.send(game_started_msg) {
        eprintln!("❌ GAME_STARTED 브로드캐스트 실패: {}", e);
    }

    inner.last_activity = ts();

    Ok(())
}

pub async fn reset_game(room: &Arc<Room>, player_id: String) -> Result<(), String> {
    let mut inner = room.inner.write().await;

    if inner.owner != player_id {
        return Err("NOT_ROOM_OWNER".to_string());
    }

    // 게임이 진행 중이거나 완료된 상태에서만 리셋 가능
    if inner.status != RoomStatus::Playing && inner.status != RoomStatus::Finished {
        return Err("GAME_NOT_IN_PROGRESS".to_string());
    }

    let old = inner.game_id.clone();
    inner.game = GameState::new();
    inner.game_id = Uuid::new_v4().to_string();

    room.tx
        .send(ServerMsg::GameReset {
            room_id: room.id.clone(),
            game_id: old,
            reset_by: player_id.clone(),
            new_game_id: inner.game_id.clone(),
        })
        .ok();

    let gs = inner.game.snapshot();
    room.tx
        .send(ServerMsg::GameStarted {
            room_id: room.id.clone(),
            game_id: inner.game_id.clone(),
            players: crate::types::collect_players(&inner),
            initial_turn: inner.game.turn.to_string(),
            game_state: serde_json::to_value(gs).unwrap(),
        })
        .ok();

    inner.status = RoomStatus::Playing;
    inner.last_activity = ts();

    Ok(())
}

pub async fn get_room_list(state: &AppState, filters: serde_json::Value) -> ServerMsg {
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
                Some(serde_json::Value::Bool(has_pass)) => inner.password.is_some() == *has_pass,
                _ => true, // null이거나 다른 값이면 모두 포함
            };

            if !password_match {
                continue;
            }

            // 최대 플레이어 수 필터링
            let max_players_match = match max_players_filter {
                Some(serde_json::Value::Number(max_p)) => {
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

    ServerMsg::RoomList {
        rooms: rooms.clone(),
        total_count: rooms.len(),
        filters: filters.clone(),
    }
}
