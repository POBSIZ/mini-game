// 방 관리 모듈
import { gameStateManager } from './game-state.js';
import { wsManager } from './websocket.js';
import { uiManager } from './ui-manager.js';
import { chatSystem } from './chat-system.js';

export class RoomManager {
  constructor() {
    // 이벤트 리스너는 DOM 로드 후 main.js에서 초기화됩니다
  }

  // 이벤트 리스너 초기화
  initializeEventListeners() {
    // 방 생성 폼 제출
    const createRoomForm = document.getElementById("create-room-form");
    if (createRoomForm) {
      createRoomForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.createRoom();
      });
    }

    // 방 참가 폼 제출
    const joinRoomForm = document.getElementById("join-room-form");
    if (joinRoomForm) {
      joinRoomForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.joinRoom();
      });
    }

    // 뒤로가기 버튼
    const backBtn = document.getElementById("back-btn");
    if (backBtn) {
      backBtn.addEventListener("click", () => uiManager.showMainMenu());
    }

    // 대기실에서 메인 메뉴로 가기 버튼
    const backToMenuFromWaitingBtn = document.getElementById("btn-back-to-menu-from-waiting");
    if (backToMenuFromWaitingBtn) {
      backToMenuFromWaitingBtn.addEventListener("click", () => this.leaveRoom());
    }

    // 준비 상태 토글 버튼
    const readyBtn = document.getElementById("ready-btn");
    if (readyBtn) {
      readyBtn.addEventListener("click", () => this.toggleReadyStatus());
    }

    // 게임 시작 버튼
    const startGameBtn = document.getElementById("start-game-btn");
    if (startGameBtn) {
      startGameBtn.addEventListener("click", () => this.startGameRequest());
    }

    // 방 나가기 버튼
    const leaveRoomBtn = document.getElementById("leave-room-btn");
    if (leaveRoomBtn) {
      leaveRoomBtn.addEventListener("click", () => this.leaveRoom());
    }
  }

  // 방 생성
  createRoom() {
    const roomName = document.getElementById("room-name").value;
    const playerName = document.getElementById("player-name").value;
    const password = document.getElementById("room-password").value;

    if (!roomName || !playerName) {
      uiManager.showMessage("방 이름과 플레이어 이름을 입력해주세요.", "error");
      return;
    }

    gameStateManager.setCurrentPlayer({ name: playerName });
    uiManager.showMessage("방을 생성하는 중...", "success");

    wsManager.send("CREATE_ROOM", {
      roomName,
      playerName,
      password: password || null,
      maxPlayers: 2,
    });
  }

  // 방 참가 (폼에서)
  joinRoom() {
    const roomCode = document.getElementById("room-code").value;
    const playerName = document.getElementById("join-player-name").value;
    const password = document.getElementById("join-room-password").value;

    if (!roomCode || !playerName) {
      uiManager.showMessage("방 코드와 플레이어 이름을 입력해주세요.", "error");
      return;
    }

    gameStateManager.setCurrentPlayer({ name: playerName });
    uiManager.showMessage(`방 ${roomCode}에 참가 중...`, "success");

    wsManager.send("JOIN_ROOM", {
      roomId: roomCode,
      playerName: playerName,
      password: password || null
    });
  }

  // 방 참가 (버튼 클릭)
  joinRoomByCode(roomCode) {
    const playerName = prompt("플레이어 이름을 입력하세요:");
    if (playerName) {
      gameStateManager.setCurrentPlayer({ name: playerName });
      uiManager.showMessage(`방 ${roomCode}에 참가 중...`, "success");
      this.joinGameRoom(roomCode, playerName);
    }
  }

  // 게임 방 참가
  joinGameRoom(roomCode, playerName) {
    wsManager.send("JOIN_ROOM", {
      roomId: roomCode,
      playerName: playerName
    });
  }

  // 방 나가기
  leaveRoom() {
    console.log("방 나가기 요청:", {
      currentRoom: gameStateManager.currentRoom,
      currentPlayer: gameStateManager.currentPlayer
    });
    
    if (gameStateManager.currentRoom.id) {
      wsManager.send("LEAVE_ROOM", {
        roomId: gameStateManager.currentRoom.id,
        playerId: gameStateManager.currentPlayer.id
      });
    }
    
    // 게임 상태 초기화
    gameStateManager.resetAll();
    
    // 메인메뉴로 이동
    uiManager.showMainMenu();
  }

  // 게임 시작 요청
  startGameRequest() {
    if (!gameStateManager.currentPlayer.isOwner) return;
    
    wsManager.send("START_GAME", {
      roomId: gameStateManager.currentRoom.id,
      playerId: gameStateManager.currentPlayer.id
    });
  }

  // 준비 상태 변경
  toggleReadyStatus() {
    const isReady = gameStateManager.waitingState.readyPlayers.has(gameStateManager.currentPlayer.id);
    
    console.log("준비 상태 변경 요청:", {
      currentPlayerId: gameStateManager.currentPlayer.id,
      currentReady: isReady,
      newReady: !isReady,
      roomId: gameStateManager.currentRoom.id
    });
    
    wsManager.send("READY_STATUS", {
      roomId: gameStateManager.currentRoom.id,
      playerId: gameStateManager.currentPlayer.id,
      isReady: !isReady
    });
  }

  // 게임 리셋 요청
  resetGameRequest() {
    if (!gameStateManager.currentPlayer.isOwner) return;
    
    wsManager.send("RESET_GAME", {
      roomId: gameStateManager.currentRoom.id,
      playerId: gameStateManager.currentPlayer.id
    });
  }
}

// 싱글톤 인스턴스 생성
export const roomManager = new RoomManager();

// 전역 함수로 노출 (HTML에서 onclick 이벤트에서 사용)
window.roomManager = roomManager;
window.joinRoom = (roomCode) => roomManager.joinRoomByCode(roomCode);
