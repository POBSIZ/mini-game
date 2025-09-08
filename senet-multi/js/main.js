// 메인 진입점 및 초기화 모듈
import { gameStateManager } from './game-state.js';
import { wsManager } from './websocket.js';
import { uiManager } from './ui-manager.js';
import { roomManager } from './room-manager.js';

// URL 파라미터 처리
const params = new URLSearchParams(location.search);
const room = params.get("room");
const player = params.get("player");

// 전역 함수들 (HTML에서 onclick 이벤트에서 사용)
window.showMainMenu = () => uiManager.showMainMenu();
window.showCreateRoom = () => uiManager.showCreateRoom();
window.showJoinRoom = () => uiManager.showJoinRoom();
window.showPublicRooms = () => uiManager.showPublicRooms();

// 전역 객체들 (모듈 간 참조용)
window.wsManager = wsManager;
window.gameStateManager = gameStateManager;
window.uiManager = uiManager;
window.roomManager = roomManager;

// 초기화 함수
function initializeApp() {
  // WebSocket 연결
  wsManager.connect();
  
  // 이벤트 리스너 초기화
  roomManager.initializeEventListeners();
  
  // URL 파라미터가 있으면 게임 화면으로 바로 이동
  if (room && player) {
    gameStateManager.setCurrentPlayer({ name: player });
    roomManager.joinGameRoom(room, player);
  }
}

// DOM이 로드된 후 초기화
document.addEventListener("DOMContentLoaded", initializeApp);
