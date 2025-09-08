use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::mpsc;
use tracing::{debug, error, info, warn};

use crate::{
    messages::ServerMsg,
    room::{
        create_room, delete_room, get_room_list, join_room, leave_room, reset_game, start_game,
    },
    types::{get_str, ts, AppState, Room, RoomStatus},
};

// ========================= WebSocket 핸들러 =========================

pub async fn ws_handler(State(state): State<AppState>, ws: WebSocketUpgrade) -> impl IntoResponse {
    info!("🔌 새로운 WebSocket 연결 요청");
    ws.on_upgrade(move |socket| client_loop(state, socket))
}

// ========================= 클라이언트 루프 =========================

async fn client_loop(state: AppState, socket: WebSocket) {
    info!("🔄 클라이언트 루프 시작");

    // 개인 sender - 버퍼 크기를 늘려서 메시지 손실 방지
    let (tx, mut rx) = mpsc::channel::<String>(1024);
    let (mut ws_tx, mut ws_rx) = socket.split();

    // WebSocket 전송 태스크
    let _send_task = tokio::spawn(async move {
        let mut message_count = 0;
        while let Some(msg) = rx.recv().await {
            message_count += 1;
            debug!(
                "📤 클라이언트에게 메시지 전송 #{}: {} bytes",
                message_count,
                msg.len()
            );

            match ws_tx.send(Message::Text(msg)).await {
                Ok(_) => {
                    debug!("✅ 메시지 전송 성공 #{}", message_count);
                }
                Err(e) => {
                    error!("❌ 메시지 전송 실패 #{}: {}", message_count, e);
                    break;
                }
            }
        }
        info!("🔚 전송 태스크 종료 - 총 {} 개 메시지 전송", message_count);
    });

    // 조인한 방
    let mut joined_room: Option<Arc<Room>> = None;
    let mut self_player_id: Option<String> = None;
    let mut self_player_name: Option<String> = None;

    // 메시지 수신 루프
    let mut message_count = 0;
    while let Some(Ok(Message::Text(text))) = ws_rx.next().await {
        message_count += 1;
        debug!(
            "📨 클라이언트로부터 메시지 수신 #{}: {}",
            message_count, text
        );

        let Ok(v): Result<Value, _> = serde_json::from_str(&text) else {
            warn!("⚠️ 잘못된 JSON 형식의 메시지: {}", text);
            send_err(
                &tx,
                "INVALID_JSON",
                "잘못된 JSON 형식입니다",
                json!({"received": text}),
            )
            .await;
            continue;
        };

        let t = v
            .get("type")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string();
        let data = v.get("data").cloned().unwrap_or(json!({}));

        debug!("🔍 메시지 타입: {}, 데이터: {:?}", t, data);

        match t.as_str() {
            // ---------- GET_ROOM_LIST ----------
            "GET_ROOM_LIST" => {
                let filters = data.get("filters").cloned().unwrap_or(json!({}));
                let response = get_room_list(&state, filters).await;
                if let Err(e) = tx.send(response.wrap()).await {
                    error!("❌ ROOM_LIST 전송 실패: {}", e);
                }
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
                    .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

                let room_name_clone = room_name.clone();
                info!(
                    "🏠 방 생성 요청: {} (플레이어: {})",
                    room_name_clone, player_name
                );

                match create_room(
                    &state,
                    tx.clone(),
                    room_name,
                    password,
                    max_players,
                    player_name.clone(),
                    player_id.clone(),
                )
                .await
                {
                    Ok(room) => {
                        info!("✅ 방 생성 성공: {} (ID: {})", room_name_clone, room.id);

                        // 브로드캐스트 포워딩 - 해당 클라이언트만 메시지를 받도록
                        let mut brx = room.tx.subscribe();
                        let tx_clone = tx.clone();
                        let player_id_clone = player_id.clone();
                        let room_id_clone = room.id.clone();

                        tokio::spawn(async move {
                            info!(
                                "🎯 브로드캐스트 리스너 시작 - 방: {}, 플레이어: {}",
                                room_id_clone, player_id_clone
                            );
                            let mut msg_count = 0;

                            while let Ok(msg) = brx.recv().await {
                                msg_count += 1;
                                debug!(
                                    "📨 브로드캐스트 메시지 수신 #{} (방: {}, 플레이어: {}): {:?}",
                                    msg_count, room_id_clone, player_id_clone, msg
                                );

                                let wrapped_msg = msg.wrap();
                                debug!("📦 래핑된 메시지 길이: {} bytes", wrapped_msg.len());

                                // 해당 클라이언트에게 메시지 전달
                                match tx_clone.send(wrapped_msg).await {
                                    Ok(_) => debug!("✅ 클라이언트에게 메시지 전달 성공 #{} (방: {}, 플레이어: {})", 
                                                     msg_count, room_id_clone, player_id_clone),
                                    Err(e) => {
                                        error!("❌ 클라이언트에게 메시지 전달 실패 #{} (방: {}, 플레이어: {}): {:?}", 
                                                msg_count, room_id_clone, player_id_clone, e);
                                        break; // 전송 실패 시 리스너 종료
                                    }
                                }
                            }
                            info!(
                                "🔚 브로드캐스트 리스너 종료 - 방: {}, 플레이어: {}, 총 메시지: {}",
                                room_id_clone, player_id_clone, msg_count
                            );
                        });

                        joined_room = Some(room);
                        self_player_id = Some(player_id);
                        self_player_name = Some(player_name);
                    }
                    Err(e) => {
                        error!("❌ 방 생성 실패: {}", e);
                        send_err(&tx, "ROOM_CREATION_FAILED", &e, json!({})).await;
                    }
                }
            }

            // ---------- JOIN_ROOM ----------
            "JOIN_ROOM" => {
                let room_id = get_str(&data, "roomId");
                let password = data.get("password").and_then(|x| x.as_str());
                let player_name = get_str(&data, "playerName");
                let player_id = get_str(&data, "playerId");

                info!("🚪 방 참가 요청: {} (플레이어: {})", room_id, player_name);

                match join_room(
                    &state,
                    tx.clone(),
                    room_id.clone(),
                    password,
                    player_name.clone(),
                    player_id.clone(),
                )
                .await
                {
                    Ok(room) => {
                        info!("✅ 방 참가 성공: {} (플레이어: {})", room_id, player_name);

                        // 브로드캐스트 포워딩 - 해당 클라이언트만 메시지를 받도록
                        let mut brx = room.tx.subscribe();
                        let tx_clone = tx.clone();
                        let player_id_clone = player_id.clone();
                        let room_id_clone = room.id.clone();

                        tokio::spawn(async move {
                            info!(
                                "🎯 브로드캐스트 리스너 시작 - 방: {}, 플레이어: {}",
                                room_id_clone, player_id_clone
                            );
                            let mut msg_count = 0;

                            while let Ok(msg) = brx.recv().await {
                                msg_count += 1;
                                debug!(
                                    "📨 브로드캐스트 메시지 수신 #{} (방: {}, 플레이어: {}): {:?}",
                                    msg_count, room_id_clone, player_id_clone, msg
                                );

                                let wrapped_msg = msg.wrap();
                                debug!("📦 래핑된 메시지 길이: {} bytes", wrapped_msg.len());

                                // 해당 클라이언트에게 메시지 전달
                                match tx_clone.send(wrapped_msg).await {
                                    Ok(_) => debug!("✅ 클라이언트에게 메시지 전달 성공 #{} (방: {}, 플레이어: {})", 
                                                     msg_count, room_id_clone, player_id_clone),
                                    Err(e) => {
                                        error!("❌ 클라이언트에게 메시지 전달 실패 #{} (방: {}, 플레이어: {}): {:?}", 
                                                msg_count, room_id_clone, player_id_clone, e);
                                        break; // 전송 실패 시 리스너 종료
                                    }
                                }
                            }
                            info!(
                                "🔚 브로드캐스트 리스너 종료 - 방: {}, 플레이어: {}, 총 메시지: {}",
                                room_id_clone, player_id_clone, msg_count
                            );
                        });

                        joined_room = Some(room);
                        self_player_id = Some(player_id);
                        self_player_name = Some(player_name);
                    }
                    Err(e) => {
                        error!("❌ 방 참가 실패: {} (방: {})", e, room_id);
                        send_err(&tx, "JOIN_ROOM_FAILED", &e, json!({"roomId":room_id})).await;
                    }
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
                        .send(ServerMsg::PlayerReady {
                            room_id: room.id.clone(),
                            player_id: pid,
                            is_ready: is_ready,
                            all_ready: all_ready,
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

                    match start_game(&room, pid.clone()).await {
                        Ok(_) => {
                            // 게임 시작 성공
                        }
                        Err(e) => {
                            send_err(&tx, "START_GAME_FAILED", &e, json!({"roomId":room.id})).await;
                        }
                    }
                }
            }

            // ---------- ROLL_STICKS ----------
            "ROLL_STICKS" => {
                debug!("🎲 ROLL_STICKS 메시지 수신: {:?}", data);

                // 연결 상태 상세 디버깅
                debug!("🔍 연결 상태 디버깅:");
                debug!(
                    "  - joined_room 상태: {}",
                    if joined_room.is_some() {
                        "있음"
                    } else {
                        "없음"
                    }
                );
                if let Some(ref room) = joined_room {
                    debug!("  - 현재 방 ID: {}", room.id);
                }
                debug!("  - self_player_id: {:?}", self_player_id);
                debug!("  - self_player_name: {:?}", self_player_name);

                // 🔄 재연결 자동 복구: joined_room이 없지만 요청에 방 정보가 있다면 복구 시도
                if joined_room.is_none() {
                    let rid = get_str(&data, "roomId");
                    let pid = get_str(&data, "playerId");

                    if !rid.is_empty() && !pid.is_empty() {
                        info!(
                            "🔄 재연결 감지 - 방 복구 시도: 방ID={}, 플레이어ID={}",
                            rid, pid
                        );

                        if let Some(room) = state.rooms.get(&rid) {
                            let inner = room.inner.try_read();
                            if let Ok(inner) = inner {
                                if inner.players.contains_key(&pid) {
                                    info!(
                                        "✅ 방 복구 성공: 플레이어 '{}' 를 방 '{}' 에 다시 연결",
                                        pid, rid
                                    );
                                    drop(inner); // 읽기 잠금 해제

                                    // 브로드캐스트 리스너 다시 시작
                                    let tx_clone = tx.clone();
                                    let room_id_clone = rid.clone();
                                    let player_id_clone = pid.clone();
                                    let broadcast_rx = room.tx.subscribe();
                                    tokio::spawn(async move {
                                        let mut msg_count = 0;
                                        let mut broadcast_rx = broadcast_rx;
                                        info!(
                                            "🎯 브로드캐스트 리스너 재시작 - 방: {}, 플레이어: {}",
                                            room_id_clone, player_id_clone
                                        );

                                        while let Ok(msg) = broadcast_rx.recv().await {
                                            msg_count += 1;
                                            debug!("📨 브로드캐스트 메시지 수신 #{} (방: {}, 플레이어: {}): {:?}", 
                                                    msg_count, room_id_clone, player_id_clone, msg);

                                            let wrapped_msg = msg.wrap();
                                            debug!(
                                                "📦 래핑된 메시지 길이: {} bytes",
                                                wrapped_msg.len()
                                            );

                                            if tx_clone.send(wrapped_msg).await.is_err() {
                                                error!("❌ 클라이언트 연결 끊어짐 #{} (방: {}, 플레이어: {})", 
                                                        msg_count, room_id_clone, player_id_clone);
                                                break;
                                            } else {
                                                debug!("✅ 클라이언트에게 메시지 전달 성공 #{} (방: {}, 플레이어: {})", 
                                                        msg_count, room_id_clone, player_id_clone);
                                            }
                                        }
                                        info!("🔚 브로드캐스트 리스너 종료 - 방: {}, 플레이어: {}, 총 메시지: {}", 
                                                room_id_clone, player_id_clone, msg_count);
                                    });

                                    // 방 상태 복구
                                    joined_room = Some(room.clone());
                                    self_player_id = Some(pid.clone());
                                    self_player_name = Some(pid.clone()); // 임시로 ID를 이름으로 사용

                                    info!("🔄 방 상태 복구 완료");
                                } else {
                                    warn!("❌ 방 복구 실패: 플레이어 '{}' 를 방 '{}' 에서 찾을 수 없음", pid, rid);
                                }
                            }
                        } else {
                            warn!("❌ 방 복구 실패: 방 '{}' 를 찾을 수 없음", rid);
                        }
                    }
                }

                if let Some(room) = &joined_room {
                    let room = room.clone();
                    let pid = get_str(&data, "playerId");
                    let rid = get_str(&data, "roomId");

                    debug!("🎯 ROLL_STICKS 처리: 방={}, 플레이어={}", room.id, pid);
                    debug!("🎯 방 ID 비교: 요청={}, 현재={}", rid, room.id);

                    let mut inner = room.inner.write().await;
                    if inner.status != RoomStatus::Playing {
                        warn!("❌ 게임이 시작되지 않음: 상태={:?}", inner.status);
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
                    debug!(
                        "🎲 턴 체크: 현재 턴={}, 현재 플레이어={}, 요청 플레이어={}",
                        inner.game.turn,
                        cur_pid.as_deref().unwrap_or("없음"),
                        pid
                    );

                    if cur_pid.as_deref() != Some(&pid) {
                        warn!(
                            "❌ 턴이 아님: 현재 턴 플레이어={}, 요청 플레이어={}",
                            cur_pid.as_deref().unwrap_or("없음"),
                            pid
                        );
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
                    info!(
                        "🎲 주사위 굴림 결과: roll={}, faces={:?}, can_move={}",
                        roll, faces, can_move
                    );

                    let msg = ServerMsg::SticksRolled {
                        room_id: room.id.clone(),
                        game_id: inner.game_id.clone(),
                        player_id: pid.clone(),
                        roll,
                        faces,
                        turn: inner.game.turn.to_string(),
                        can_move: can_move,
                    };

                    debug!("📤 STICKS_ROLLED 메시지 브로드캐스트: {:?}", msg);
                    debug!(
                        "🔍 브로드캐스트 채널 수신자 수: {}",
                        room.tx.receiver_count()
                    );

                    match room.tx.send(msg) {
                        Ok(receiver_count) => {
                            info!(
                                "✅ STICKS_ROLLED 메시지 전송 성공, 수신자 수: {}",
                                receiver_count
                            );
                        }
                        Err(e) => {
                            error!("❌ STICKS_ROLLED 메시지 전송 실패: {:?}", e);
                            error!(
                                "🔍 브로드캐스트 채널 상태 - 활성 수신자: {}",
                                room.tx.receiver_count()
                            );
                        }
                    }

                    // 이동할 수 없는 경우 자동으로 턴 패스
                    if !can_move && !inner.game.game_over {
                        info!(
                            "🚫 이동 불가능 - 자동 턴 패스: 방={}, 플레이어={}",
                            room.id, pid
                        );

                        // 턴 전환
                        inner.game.turn = if inner.game.turn == 'W' { 'B' } else { 'W' };
                        inner.game.last_roll = None; // 롤 값 초기화

                        // 턴 변경 브로드캐스트
                        room.tx
                            .send(ServerMsg::TurnChanged {
                                room_id: room.id.clone(),
                                game_id: inner.game_id.clone(),
                                new_turn: inner.game.turn.to_string(),
                                reason: "no_legal_moves".to_string(),
                            })
                            .ok();
                    }

                    inner.last_activity = ts();
                } else {
                    warn!("❌ 방에 참가하지 않음");
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
                            "NOT_YOUR_SIDE",
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

                    info!(
                        "🔄 말 이동 브로드캐스트: 방={}, 플레이어={}, 이동={:?}",
                        room.id, pid, move_payload
                    );

                    // 게임 상태 디버깅
                    let game_state_json = serde_json::to_value(&gs).unwrap();
                    debug!("📊 게임 상태: {:?}", game_state_json);

                    let piece_moved_msg = ServerMsg::PieceMoved {
                        room_id: room.id.clone(),
                        game_id: inner.game_id.clone(),
                        move_: move_payload.clone(),
                        game_state: game_state_json,
                    };

                    debug!("📤 PIECE_MOVED 메시지 브로드캐스트 준비");
                    debug!(
                        "🔍 브로드캐스트 채널 수신자 수: {}",
                        room.tx.receiver_count()
                    );

                    match room.tx.send(piece_moved_msg) {
                        Ok(receiver_count) => {
                            info!(
                                "✅ PIECE_MOVED 메시지 전송 성공, 수신자 수: {}",
                                receiver_count
                            );
                        }
                        Err(e) => {
                            error!("❌ PIECE_MOVED 메시지 전송 실패: {:?}", e);
                            error!(
                                "🔍 브로드캐스트 채널 상태 - 활성 수신자: {}",
                                room.tx.receiver_count()
                            );
                        }
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
                            .send(ServerMsg::TurnChanged {
                                room_id: room.id.clone(),
                                game_id: inner.game_id.clone(),
                                new_turn: inner.game.turn.to_string(),
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

                        // 게임 종료 메시지 전송
                        room.tx
                            .send(ServerMsg::GameEnded {
                                room_id: room.id.clone(),
                                game_id: inner.game_id.clone(),
                                winner,
                                winner_name: winner_name,
                                final_state: serde_json::to_value(gs).unwrap(),
                                game_duration: 0,
                            })
                            .ok();

                        // 방 상태를 Finished로 변경
                        inner.status = RoomStatus::Finished;

                        // 게임 종료 후 방 상태 변경 알림
                        room.tx
                            .send(ServerMsg::PlayerStatus {
                                room_id: room.id.clone(),
                                player_id: "system".to_string(),
                                status: "game_finished".into(),
                                last_seen: ts(),
                            })
                            .ok();
                    }
                    inner.last_activity = ts();
                }
            }

            // ---------- PASS_TURN ----------
            "PASS_TURN" => {
                if let Some(room) = &joined_room {
                    let room = room.clone();
                    let pid = get_str(&data, "playerId");
                    let rid = get_str(&data, "roomId");

                    if room.id != rid {
                        continue;
                    }

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

                    // 턴 체크
                    let cur_pid = inner.seats.get(&inner.game.turn).map(|e| e.value().clone());
                    if cur_pid.as_deref() != Some(&pid) {
                        send_err(
                            &tx,
                            "NOT_YOUR_TURN",
                            "내 턴이 아닙니다",
                            json!({"roomId":room.id}),
                        )
                        .await;
                        continue;
                    }

                    // 현재 롤 값 확인
                    let current_roll = inner.game.last_roll;
                    let requested_roll = data.get("roll").and_then(|x| x.as_u64()).map(|x| x as u8);

                    if current_roll != requested_roll {
                        send_err(
                            &tx,
                            "INVALID_ROLL",
                            "잘못된 롤 값입니다",
                            json!({"roomId":room.id}),
                        )
                        .await;
                        continue;
                    }

                    // 턴 전환
                    inner.game.turn = if inner.game.turn == 'W' { 'B' } else { 'W' };
                    inner.game.last_roll = None; // 롤 값 초기화

                    info!(
                        "🔄 턴 패스: 방={}, 플레이어={}, 새 턴={}",
                        room.id, pid, inner.game.turn
                    );

                    // 턴 변경 브로드캐스트
                    room.tx
                        .send(ServerMsg::TurnChanged {
                            room_id: room.id.clone(),
                            game_id: inner.game_id.clone(),
                            new_turn: inner.game.turn.to_string(),
                            reason: "pass_turn".to_string(),
                        })
                        .ok();

                    inner.last_activity = ts();
                }
            }

            // ---------- RESET_GAME ----------
            "RESET_GAME" => {
                if let Some(room) = &joined_room {
                    let room = room.clone();
                    let pid = get_str(&data, "playerId");

                    match reset_game(&room, pid.clone()).await {
                        Ok(_) => {
                            // 게임 리셋 성공
                        }
                        Err(e) => {
                            send_err(&tx, "RESET_GAME_FAILED", &e, json!({"roomId":room.id})).await;
                        }
                    }
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

                    // 플레이어가 방을 나가기 전에 다른 플레이어들에게 알림
                    let _player_name = self_player_name.clone().unwrap_or_else(|| "Unknown".into());
                    room.tx
                        .send(ServerMsg::PlayerStatus {
                            room_id: room.id.clone(),
                            player_id: pid.clone(),
                            status: "left_room".into(),
                            last_seen: ts(),
                        })
                        .ok();

                    // 방에서 플레이어 제거
                    leave_room(&room, pid.clone()).await;

                    // 방이 비어있으면 방 삭제
                    let inner = room.inner.read().await;
                    if inner.players.is_empty() {
                        drop(inner);
                        state.rooms.remove(&room.id);
                        println!("🗑️ 빈 방 삭제: {}", room.id);
                    }
                }
            }

            // ---------- DELETE_ROOM ----------
            "DELETE_ROOM" => {
                let rid = get_str(&data, "roomId");
                let pid = get_str(&data, "playerId");

                match delete_room(&state, rid.clone(), pid).await {
                    Ok(_) => {
                        // 방 삭제 성공 - 방에 있던 모든 플레이어들에게 알림
                        if let Some(room) = state.rooms.get(&rid) {
                            room.tx
                                .send(ServerMsg::PlayerStatus {
                                    room_id: rid.clone(),
                                    player_id: "system".to_string(),
                                    status: "room_deleted".into(),
                                    last_seen: ts(),
                                })
                                .ok();
                        }
                    }
                    Err(e) => {
                        send_err(&tx, "DELETE_ROOM_FAILED", &e, json!({"roomId":rid})).await;
                    }
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
                        .send(ServerMsg::ChatReceived {
                            room_id: rid,
                            player_id: pid,
                            player_name: name,
                            message: msg,
                            message_type: data
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
                            .send(ServerMsg::PlayerStatus {
                                room_id: room.id.clone(),
                                player_id: pid,
                                status: "connected".into(),
                                last_seen: inner.last_activity,
                            })
                            .ok();
                    }
                }
            }

            _ => {
                // 알 수 없는 메시지 타입에 대한 에러 응답
                send_err(
                    &tx,
                    "UNKNOWN_MESSAGE_TYPE",
                    &format!("알 수 없는 메시지 타입: {}", t),
                    json!({"receivedType": t}),
                )
                .await;
            }
        }
    }

    // 연결이 끊어졌을 때 정리 작업
    info!("🔌 클라이언트 연결 종료");
    if let Some(room) = joined_room {
        if let Some(pid) = self_player_id {
            info!("👋 플레이어 '{}' 연결 종료 - 방 '{}' 정리", pid, room.id);

            // 다른 플레이어들에게 연결 끊김 알림
            if let Err(e) = room.tx.send(ServerMsg::PlayerStatus {
                room_id: room.id.clone(),
                player_id: pid.clone(),
                status: "disconnected".into(),
                last_seen: ts(),
            }) {
                warn!("❌ 연결 끊김 알림 전송 실패: {}", e);
            }

            // 방에서 플레이어 제거
            leave_room(&room, pid).await;

            // 방이 비어있으면 방 삭제
            let inner = room.inner.read().await;
            if inner.players.is_empty() {
                drop(inner);
                state.rooms.remove(&room.id);
                info!("🗑️ 빈 방 삭제: {}", room.id);
            }
        }
    }
}

// ========================= 유틸리티 함수 =========================

async fn send_err(tx: &mpsc::Sender<String>, code: &str, message: &str, details: Value) {
    let env = ServerMsg::Error {
        code: code.into(),
        message: message.into(),
        details,
    }
    .wrap();
    let _ = tx.send(env).await;
}
