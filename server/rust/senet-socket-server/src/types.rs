use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{sync::Arc, time::SystemTime};
use tokio::sync::{broadcast, mpsc, RwLock};

// ========================= 공통 타입 =========================

#[derive(Debug, Clone, Serialize)]
pub struct Envelope<T> {
    pub r#type: String,
    pub timestamp: u128,
    pub data: T,
}

pub fn ts() -> u128 {
    SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis()
}

// ========================= 서버 상태 =========================

#[derive(Clone)]
pub struct AppState {
    pub rooms: Arc<DashMap<String, Arc<Room>>>,
}

#[derive(Clone)]
pub struct Room {
    pub id: String,
    pub tx: broadcast::Sender<crate::messages::ServerMsg>,
    pub inner: Arc<RwLock<RoomInner>>,
}

#[derive(Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum RoomStatus {
    Waiting,
    Playing,
    Finished,
}

#[derive(Clone)]
pub struct RoomInner {
    pub status: RoomStatus,
    pub name: String,
    pub owner: String, // playerId
    pub password: Option<String>,
    pub max_players: usize,               // always 2 for Senet
    pub players: DashMap<String, Player>, // playerId -> Player
    #[allow(dead_code)]
    pub spectators: DashMap<String, Spectator>,
    // 좌석은 W/B (White/Black)
    pub seats: DashMap<char, String>, // 'W' or 'B' -> playerId
    pub ready: DashMap<String, bool>,
    pub game: crate::game::GameState,
    pub game_id: String,
    pub last_activity: u128,
}

#[derive(Clone)]
pub struct Player {
    #[allow(dead_code)]
    pub id: String,
    pub name: String,
    #[allow(dead_code)]
    pub tx: mpsc::Sender<String>, // 문자열(직렬화된 JSON)을 바로 보냄
}

#[derive(Clone)]
pub struct Spectator {
    #[allow(dead_code)]
    pub id: String,
    #[allow(dead_code)]
    pub name: String,
    #[allow(dead_code)]
    pub tx: mpsc::Sender<String>,
}

// ========================= 유틸리티 함수 =========================

pub fn collect_players(inner: &RoomInner) -> Vec<Value> {
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

pub fn get_str(d: &Value, key: &str) -> String {
    d.get(key)
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .to_string()
}
