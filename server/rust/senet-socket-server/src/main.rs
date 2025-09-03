use axum::{routing::get, Router};
use dashmap::DashMap;
use std::sync::Arc;
use tokio::net::TcpListener;
use tracing::{error, info};

mod game;
mod handlers;
mod messages;
mod room;
mod types;

use handlers::ws_handler;
use types::AppState;

#[tokio::main]
async fn main() {
    // 더 상세한 로깅 설정
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .with_target(false)
        .with_thread_ids(true)
        .with_thread_names(true)
        .init();

    let state = AppState {
        rooms: Arc::new(DashMap::new()),
    };

    let app = Router::new()
        .route("/ws", get(ws_handler))
        .with_state(state);

    let addr = "0.0.0.0:8080";
    info!("🚀 Senet WebSocket 서버 시작 중...");

    match TcpListener::bind(addr).await {
        Ok(listener) => {
            info!("✅ 서버가 {} 에서 시작되었습니다", addr);
            info!("📡 WebSocket 연결을 기다리는 중...");

            if let Err(e) = axum::serve(listener, app).await {
                error!("❌ 서버 실행 중 오류 발생: {}", e);
            }
        }
        Err(e) => {
            error!("❌ 서버 바인딩 실패: {} - {}", addr, e);
        }
    }
}
