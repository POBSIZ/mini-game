// UI 화면 전환 및 관리 모듈
import { gameStateManager } from './game-state.js';

export class UIManager {
  constructor() {
    this.currentScreen = 'main-menu';
  }

  // 화면 전환
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    
    document.getElementById(screenId).classList.add('active');
    this.currentScreen = screenId;
  }

  // 메인 메뉴 표시
  showMainMenu() {
    this.showScreen('main-menu');
    
    // 모든 서브 섹션 숨기기
    document.querySelector(".game-options").classList.remove("hidden");
    document.getElementById("create-room-section").classList.add("hidden");
    document.getElementById("join-room-section").classList.add("hidden");
    document.getElementById("public-rooms-section").classList.add("hidden");
    document.getElementById("back-section").classList.add("hidden");
    
    this.clearMessages();
    gameStateManager.resetAll();
  }

  // 방 생성 화면 표시
  showCreateRoom() {
    this.showScreen('main-menu');
    document.querySelector(".game-options").classList.add("hidden");
    document.getElementById("create-room-section").classList.remove("hidden");
    document.getElementById("back-section").classList.remove("hidden");
    this.clearMessages();
  }

  // 방 참가 화면 표시
  showJoinRoom() {
    this.showScreen('main-menu');
    document.querySelector(".game-options").classList.add("hidden");
    document.getElementById("join-room-section").classList.remove("hidden");
    document.getElementById("back-section").classList.remove("hidden");
    this.clearMessages();
  }

  // 공개 방 목록 표시
  showPublicRooms() {
    this.showScreen('main-menu');
    document.querySelector(".game-options").classList.add("hidden");
    document.getElementById("public-rooms-section").classList.remove("hidden");
    document.getElementById("back-section").classList.remove("hidden");
    this.clearMessages();
    this.loadPublicRooms();
  }

  // 대기실 표시
  showWaitingRoom() {
    this.showScreen('waiting-room');
    
    // 방 정보 업데이트
    const roomNameDisplay = document.getElementById("room-name-display");
    const roomCodeDisplay = document.getElementById("room-code-display");
    
    if (roomNameDisplay) {
      roomNameDisplay.textContent = gameStateManager.currentRoom.name || "방 이름";
    }
    if (roomCodeDisplay) {
      roomCodeDisplay.textContent = `방 코드: ${gameStateManager.currentRoom.id || "ABC123"}`;
    }
    
    this.updatePlayersList();
    
    // 시작 버튼 업데이트를 약간 지연시켜 DOM이 완전히 로드된 후 실행
    setTimeout(() => this.updateStartButton(), 50);
  }

  // 대기실 참가
  joinWaitingRoom(roomId, roomName, playerName, isOwner) {
    gameStateManager.setCurrentRoom({ id: roomId, name: roomName });
    gameStateManager.setCurrentPlayer({ name: playerName, isOwner: isOwner });
    
    console.log("대기실 참가:", {
      roomId,
      roomName,
      playerName,
      isOwner,
      currentPlayer: gameStateManager.currentPlayer
    });
    
    this.showWaitingRoom();
    
    // 방장인 경우 시작 버튼 상태 업데이트
    if (isOwner) {
      setTimeout(() => this.updateStartButton(), 100);
    }
  }

  // 메시지 표시
  showMessage(message, type = "info") {
    const messageArea = document.getElementById("message-area");
    if (!messageArea) return;
    
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageArea.appendChild(messageDiv);

    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 5000);
  }

  // 메시지 초기화
  clearMessages() {
    const messageArea = document.getElementById("message-area");
    if (messageArea) {
      messageArea.innerHTML = "";
    }
  }

  // 공개 방 목록 로드
  loadPublicRooms() {
    const roomsList = document.getElementById("rooms-list");
    if (!roomsList) return;
    
    roomsList.innerHTML = '<div class="loading">방 목록을 불러오는 중...</div>';
    // WebSocket 메시지는 외부에서 처리
    if (window.wsManager) {
      window.wsManager.send("GET_ROOM_LIST", {
        filters: {
          status: "waiting",
          hasPassword: false
        }
      });
    }
  }

  // 방 목록 업데이트
  updateRoomList(rooms) {
    const roomsList = document.getElementById("rooms-list");
    if (!roomsList) return;
    
    roomsList.innerHTML = "";
    if (rooms.length === 0) {
      roomsList.innerHTML = '<div class="no-rooms">현재 생성된 방이 없습니다.</div>';
      return;
    }
    
    rooms.forEach((room) => {
      const roomItem = this.createRoomItem(room);
      roomsList.appendChild(roomItem);
    });
  }

  // 방 아이템 생성
  createRoomItem(room) {
    const roomItem = document.createElement("div");
    roomItem.className = "room-item";

    const playerDots = Array.from(
      { length: room.maxPlayers },
      (_, i) =>
        `<div class="player-dot ${i < room.currentPlayers ? "active" : ""}"></div>`
    ).join("");

    const statusText = room.status === "waiting" ? "대기 중" : 
                      room.status === "playing" ? "게임 중" : "종료";

    roomItem.innerHTML = `
      <div class="room-info">
        <div class="room-name">${room.name}</div>
        <div class="room-status">${statusText} • ${room.id}</div>
      </div>
      <div class="player-count">
        <span>${room.currentPlayers}/${room.maxPlayers}</span>
        <div class="player-dots">${playerDots}</div>
      </div>
      <button class="btn-join" ${
        room.status === "playing" ? "disabled" : ""
      } onclick="joinRoom('${room.id}')">
        ${room.status === "playing" ? "게임 중" : "참가"}
      </button>
    `;

    return roomItem;
  }

  // 플레이어 목록 업데이트
  updatePlayersList() {
    const playersList = document.getElementById("players-list");
    if (!playersList) return;
    
    playersList.innerHTML = "";
    gameStateManager.waitingState.players.forEach(player => {
      const playerItem = document.createElement("div");
      playerItem.className = "player-item";
      const isReady = gameStateManager.waitingState.readyPlayers.has(player.playerId);
      const isCurrentPlayer = player.playerId === gameStateManager.currentPlayer.id;
      const isOwner = player.isOwner;
      
      // 클래스 추가
      if (isOwner) playerItem.classList.add("host");
      if (isReady) playerItem.classList.add("ready");
      
      playerItem.innerHTML = `
        <div class="player-info">
          <div class="player-avatar">${player.playerName.charAt(0).toUpperCase()}</div>
          <span class="player-name">${player.playerName}</span>
          ${isOwner ? '<span class="player-badge host">방장</span>' : ''}
          ${isCurrentPlayer ? '<span class="player-badge current">나</span>' : ''}
        </div>
        <div class="player-status">
          <span class="ready-indicator ${isReady ? 'ready' : 'not-ready'}">
            ${isReady ? '준비완료' : '준비중'}
          </span>
          ${player.side ? `<span class="side-badge ${player.side}">${player.side === 'W' ? '흰말' : '검은말'}</span>` : ''}
        </div>
      `;
      
      playersList.appendChild(playerItem);
    });
  }

  // 시작 버튼 업데이트
  updateStartButton() {
    const startBtn = document.getElementById("start-game-btn");
    if (!startBtn) {
      console.log("시작 버튼을 찾을 수 없습니다.");
      return;
    }
    
    const allReady = gameStateManager.waitingState.players.length >= 2 && 
                     gameStateManager.waitingState.players.every(p => gameStateManager.waitingState.readyPlayers.has(p.playerId));
    
    startBtn.disabled = !gameStateManager.currentPlayer.isOwner || !allReady;
    startBtn.textContent = allReady ? "게임 시작" : "모든 플레이어가 준비되어야 합니다";
    
    // 방장이 아닌 경우 시작 버튼 숨기기
    const hostControls = document.getElementById("host-controls");
    if (hostControls) {
      hostControls.style.display = gameStateManager.currentPlayer.isOwner ? "block" : "none";
    }
    
    // 디버깅을 위한 로그
    console.log("시작 버튼 업데이트:", {
      startBtnExists: !!startBtn,
      hostControlsExists: !!hostControls,
      isOwner: gameStateManager.currentPlayer.isOwner,
      playersCount: gameStateManager.waitingState.players.length,
      readyPlayersCount: gameStateManager.waitingState.readyPlayers.size,
      allReady: allReady,
      buttonDisabled: startBtn.disabled,
      buttonText: startBtn.textContent,
      hostControlsDisplay: hostControls ? hostControls.style.display : "N/A",
      players: gameStateManager.waitingState.players.map(p => ({
        id: p.playerId,
        name: p.playerName,
        isReady: gameStateManager.waitingState.readyPlayers.has(p.playerId)
      })),
      readyPlayers: Array.from(gameStateManager.waitingState.readyPlayers)
    });
  }

  // 게임 종료 상태 표시
  showGameOverState(winnerName, winnerSide, reason = "normal") {
    // 게임 화면에서 승리 상태 표시
    const statusEl = document.getElementById("status");
    if (statusEl) {
      if (reason === "opponent_left") {
        statusEl.textContent = `🎉 승리! 상대방이 나가서 ${winnerSide === "W" ? "흰말" : "검은말"} 승리!`;
        statusEl.style.color = "#4CAF50";
        statusEl.style.fontWeight = "bold";
        statusEl.style.fontSize = "16px";
      } else {
        statusEl.textContent = `🎉 ${winnerName}님 (${winnerSide === "W" ? "흰말" : "검은말"}) 승리!`;
        statusEl.style.color = "#4CAF50";
        statusEl.style.fontWeight = "bold";
      }
    }
    
    // 턴 표시 업데이트
    const turnLabel = document.getElementById("turn-label");
    if (turnLabel) {
      if (reason === "opponent_left") {
        turnLabel.textContent = `게임 종료 - ${winnerName}님 승리! (상대방 나감)`;
      } else {
        turnLabel.textContent = `게임 종료 - ${winnerName}님 승리!`;
      }
    }
    
    // 주사위 굴리기 버튼 비활성화
    const rollBtn = document.getElementById("roll");
    if (rollBtn) {
      rollBtn.disabled = true;
      rollBtn.textContent = "게임 종료";
    }

    // 승리 팝업 표시
    this.showVictoryPopup(winnerName, winnerSide, reason);
  }

  // 승리 팝업 표시
  showVictoryPopup(winnerName, winnerSide, reason = "normal") {
    console.log("showVictoryPopup 호출됨:", { winnerName, winnerSide, reason });
    
    const popup = document.getElementById("victory-popup");
    const messageEl = document.getElementById("victory-message");
    const detailsEl = document.getElementById("victory-details");
    const okBtn = document.getElementById("victory-ok-btn");

    console.log("팝업 요소들:", { popup, messageEl, detailsEl, okBtn });

    if (!popup || !messageEl || !detailsEl || !okBtn) {
      console.error("승리 팝업 요소를 찾을 수 없습니다.");
      return;
    }

    // 메시지 설정
    const winnerSideName = winnerSide === "W" ? "흰말" : "검은말";
    messageEl.textContent = `${winnerName}님 (${winnerSideName})이 승리했습니다!`;

    // 상세 정보 설정
    detailsEl.innerHTML = "";
    if (reason === "opponent_left") {
      const reasonEl = document.createElement("p");
      reasonEl.className = "reason opponent-left";
      reasonEl.textContent = "🏃‍♂️ 상대방이 게임을 나가서 승리했습니다!";
      detailsEl.appendChild(reasonEl);
    } else {
      const reasonEl = document.createElement("p");
      reasonEl.className = "reason";
      reasonEl.textContent = "🎯 모든 말을 탈출시켜 승리했습니다!";
      detailsEl.appendChild(reasonEl);
    }

    // 확인 버튼 이벤트 리스너
    okBtn.onclick = () => {
      popup.close();
    };

    // 팝업 표시
    console.log("팝업 표시 시도...");
    popup.showModal();
    console.log("팝업 표시 완료");
  }
}

// 싱글톤 인스턴스 생성
export const uiManager = new UIManager();
