// 멀티플레이어 UI 관리
class MultiplayerUI {
  constructor() {
    this.currentScreen = "lobby"; // 'lobby', 'waiting', 'game'
    this.connectionStatus = "connected"; // 고정된 서버 사용
    this.currentRoom = null;
    this.playerName = "";
    this.serverUrl = "localhost:8080"; // 프로토콜 문서에 맞춰 업데이트
    this.isRoomOwner = false;
    this.opponentPlayer = null;
    this.isReady = false; // 준비 상태
    this.opponentReady = false; // 상대방 준비 상태

    // WebSocket 연결
    this.websocket = null;
    this.isConnected = false;
    this.playerId = null;

    this.initializeEventListeners();
    this.loadSavedSettings();

    // 고정된 서버로 연결 시도
    this.connectToServer();
  }

  // WebSocket 연결
  connectToServer() {
    try {
      this.websocket = new WebSocket(`ws://${this.serverUrl}/ws`);

      this.websocket.onopen = () => {
        console.log("WebSocket 연결 성공");
        this.isConnected = true;
        this.connectionStatus = "connected";
        this.updateConnectionStatus();

        // 연결 성공 후 방 목록 요청
        this.requestRoomList();
      };

      this.websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log(
            "📥 MultiplayerUI 메시지 수신:",
            message.type,
            "데이터:",
            message.data
          );
          this.handleServerMessage(message);
        } catch (error) {
          console.error("서버 메시지 파싱 오류:", error);
          console.log("📥 원본 메시지:", event.data);
        }
      };

      this.websocket.onclose = () => {
        console.log("WebSocket 연결 종료");
        this.isConnected = false;
        this.connectionStatus = "disconnected";
        this.updateConnectionStatus();
      };

      this.websocket.onerror = (error) => {
        console.error("WebSocket 오류:", error);
        this.connectionStatus = "error";
        this.updateConnectionStatus();
      };
    } catch (error) {
      console.error("WebSocket 연결 실패:", error);
      this.connectionStatus = "error";
      this.updateConnectionStatus();
    }
  }

  // 서버에 메시지 전송
  sendToServer(message) {
    if (this.websocket && this.isConnected) {
      try {
        this.websocket.send(JSON.stringify(message));
      } catch (error) {
        console.error("서버 전송 오류:", error);
      }
    } else {
      console.warn("서버에 연결되지 않음, 메시지 전송 실패:", message);
    }
  }

  // 서버 메시지 처리
  handleServerMessage(message) {
    console.log("📥 MultiplayerUI 메시지 처리:", message.type, message);

    switch (message.type) {
      case "ROOM_LIST":
        this.handleRoomList(message.data);
        break;
      case "ROOM_CREATED":
        this.handleRoomCreated(message.data);
        break;
      case "ROOM_JOINED":
        this.handleRoomJoined(message.data);
        break;
      case "PLAYER_READY":
        this.handlePlayerReady(message.data);
        break;
      case "GAME_STARTED":
        this.handleGameStarted(message.data);
        break;
      case "ROOM_LIST":
        this.handleRoomList(message.data);
        break;
      case "ERROR":
        this.handleError(message.data);
        break;
      default:
        console.log("알 수 없는 메시지 타입:", message.type);
    }
  }

  // 방 목록 요청 (필터링 지원)
  requestRoomList(filters = {}) {
    const message = {
      type: "GET_ROOM_LIST",
      timestamp: Date.now(),
      data: {
        filters: {
          status: filters.status || "all", // "waiting", "playing", "all"
          hasPassword:
            filters.hasPassword !== undefined ? filters.hasPassword : null,
          maxPlayers: filters.maxPlayers || null,
        },
      },
    };
    this.sendToServer(message);
    console.log("방 목록 요청:", filters);
  }

  // 방 목록 처리
  handleRoomList(data) {
    console.log("방 목록 수신:", data);

    if (data.rooms && Array.isArray(data.rooms)) {
      this.displayRooms(data.rooms);
      console.log(
        `총 ${data.totalCount || data.rooms.length}개의 방을 표시합니다.`
      );
    } else {
      console.warn("유효하지 않은 방 목록 데이터:", data);
      this.displayRooms([]);
    }

    // 필터 정보 로깅
    if (data.filters) {
      console.log("적용된 필터:", data.filters);
    }
  }

  // 방 생성 응답 처리
  handleRoomCreated(data) {
    this.currentRoom = {
      id: data.roomId,
      name: data.roomName,
      owner: data.owner,
      maxPlayers: data.maxPlayers,
      status: data.status,
    };
    this.isRoomOwner = true;

    console.log("방 생성됨:", data.roomName);
    this.showWaitingScreen();
  }

  // 방 참가 응답 처리
  handleRoomJoined(data) {
    console.log("방 참가 응답 데이터:", data);
    console.log("플레이어 목록:", data.players);

    this.currentRoom = {
      id: data.roomId,
      name: data.roomName,
      players: data.players || [],
    };

    // 내 정보 찾기 (playerId로 먼저 시도, 실패하면 playerName으로)
    let myPlayer = null;
    if (this.playerId) {
      myPlayer = data.players.find((p) => p.playerId === this.playerId);
    }

    if (!myPlayer) {
      myPlayer = data.players.find((p) => p.playerName === this.playerName);
    }

    if (myPlayer) {
      this.isRoomOwner = myPlayer.isOwner;
      this.playerId = myPlayer.playerId;
      this.isReady = myPlayer.isReady || false;
      console.log("내 플레이어 정보 설정됨:", myPlayer);
    } else {
      console.warn("내 플레이어 정보를 찾을 수 없음:", {
        playerId: this.playerId,
        playerName: this.playerName,
        players: data.players,
      });
      // 기본값 설정
      this.playerId = this.playerName;
    }

    console.log("방 참가됨:", data.roomName);
    console.log("현재 방 정보:", this.currentRoom);
    this.showWaitingScreen();
  }

  // 플레이어 준비 상태 처리
  handlePlayerReady(data) {
    console.log("플레이어 준비 상태 변경:", data);

    if (data.playerId === this.playerId) {
      this.isReady = data.isReady;
      console.log("내 준비 상태 변경:", this.isReady);
    } else {
      // 상대방 플레이어의 준비 상태 업데이트
      this.opponentReady = data.isReady;
      console.log("상대방 준비 상태 변경:", this.opponentReady);

      // currentRoom.players 배열에서도 업데이트
      if (this.currentRoom && this.currentRoom.players) {
        const opponentPlayer = this.currentRoom.players.find(
          (p) => p.playerId === data.playerId
        );
        if (opponentPlayer) {
          opponentPlayer.isReady = data.isReady;
          console.log("상대방 플레이어 정보 업데이트:", opponentPlayer);
        } else {
          console.log("상대방 플레이어 정보를 찾을 수 없음, 새로 추가");
          // 상대방 플레이어가 목록에 없는 경우 추가
          this.currentRoom.players.push({
            playerId: data.playerId,
            playerName: data.playerName || "상대방",
            isReady: data.isReady,
            isOwner: false,
          });
        }
      }
    }

    this.updateWaitingScreen();
  }

  // 게임 시작 처리
  handleGameStarted(data) {
    console.log("게임 시작됨:", data);

    // 게임 화면으로 전환
    this.showGameScreen();

    // 멀티플레이어 게임 시작
    if (window.multiplayerGame) {
      const myPlayer = data.players.find((p) => p.playerId === this.playerId);
      if (myPlayer) {
        window.multiplayerGame.startMultiplayerGame(
          data.roomId,
          myPlayer.side,
          data.players.find((p) => p.playerId !== this.playerId)?.playerId
        );

        // 게임 데이터 직접 전달
        window.multiplayerGame.handleGameStarted(data);
      }
    }
  }

  // 에러 처리
  handleError(data) {
    console.error("서버 에러:", data);
    alert(`오류: ${data.message}`);
  }

  initializeEventListeners() {
    // 게임 시작 버튼 (플레이어 이름 설정 후)
    document.getElementById("btn-connect").addEventListener("click", () => {
      this.startMultiplayer();
    });

    // 새 방 만들기 버튼
    document.getElementById("btn-create-room").addEventListener("click", () => {
      this.showCreateRoomDialog();
    });

    // 방 생성 확인 버튼
    document
      .getElementById("btn-confirm-create-room")
      .addEventListener("click", () => {
        this.createRoom();
      });

    // 방 새로고침 버튼
    document
      .getElementById("btn-refresh-rooms")
      .addEventListener("click", () => {
        this.refreshRooms();
      });

    // 필터 적용 버튼
    document
      .getElementById("btn-apply-filters")
      .addEventListener("click", () => {
        this.applyFilters();
      });

    // 게임 시작 버튼
    document.getElementById("btn-start-game").addEventListener("click", () => {
      this.startMultiplayerGame();
    });

    // 방 나가기 버튼
    document.getElementById("btn-leave-room").addEventListener("click", () => {
      this.leaveRoom();
    });

    // 로비로 돌아가기 버튼
    document
      .getElementById("btn-back-to-lobby")
      .addEventListener("click", () => {
        this.showLobby();
      });

    // 플레이어 이름 입력 필드 변경 감지
    document.getElementById("player-name").addEventListener("input", (e) => {
      this.playerName = e.target.value;
      this.saveSettings();
    });

    // 방 생성 다이얼로그에서 Enter 키 처리
    document.getElementById("room-name").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.createRoom();
      }
    });

    document
      .getElementById("room-password")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.createRoom();
        }
      });

    // 준비 버튼
    const readyBtn = document.getElementById("btn-ready");
    if (readyBtn) {
      readyBtn.addEventListener("click", () => {
        this.toggleReady();
      });
    }
  }

  loadSavedSettings() {
    const savedPlayerName = localStorage.getItem("senet-player-name");

    if (savedPlayerName) {
      this.playerName = savedPlayerName;
      document.getElementById("player-name").value = savedPlayerName;
    }
  }

  saveSettings() {
    localStorage.setItem("senet-player-name", this.playerName);
  }

  // 연결 상태 업데이트
  updateConnectionStatus() {
    const statusEl = document.querySelector(".server-status");
    if (statusEl) {
      statusEl.textContent =
        this.connectionStatus === "connected" ? "연결됨" : "연결 끊김";
      statusEl.className = `server-status ${this.connectionStatus}`;
    }
  }

  // 화면 전환
  showLobby() {
    this.currentScreen = "lobby";
    document.getElementById("lobby").style.display = "block";
    document.getElementById("waiting-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "none";

    // 방 목록 새로고침
    this.requestRoomList();
  }

  showWaitingScreen() {
    console.log("🔄 대기 화면으로 전환 시작");
    this.currentScreen = "waiting";
    
    const lobby = document.getElementById("lobby");
    const waitingScreen = document.getElementById("waiting-screen");
    const gameScreen = document.getElementById("game-screen");
    
    console.log("📱 화면 요소 확인:", {
      lobby: !!lobby,
      waitingScreen: !!waitingScreen,
      gameScreen: !!gameScreen
    });
    
    if (lobby) lobby.style.display = "none";
    if (waitingScreen) waitingScreen.style.display = "block";
    if (gameScreen) gameScreen.style.display = "none";

    console.log("✅ 대기 화면 표시 완료");
    this.updateWaitingScreen();
  }

  showGameScreen() {
    this.currentScreen = "game";
    document.getElementById("lobby").style.display = "none";
    document.getElementById("waiting-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "block";
  }

  // 멀티플레이어 시작
  startMultiplayer() {
    if (!this.playerName.trim()) {
      alert("플레이어 이름을 입력해주세요.");
      return;
    }

    if (!this.isConnected) {
      alert("서버에 연결되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    // 방 목록 패널 표시
    document.getElementById("rooms-panel").style.display = "block";
    document.getElementById("local-game-panel").style.display = "block";

    // 방 목록 요청
    this.requestRoomList();
  }

  // 방 목록 표시
  displayRooms(rooms) {
    const roomsList = document.getElementById("rooms-list");
    if (!roomsList) return;

    roomsList.innerHTML = "";

    if (rooms.length === 0) {
      roomsList.innerHTML = '<div class="no-rooms">생성된 방이 없습니다.</div>';
      return;
    }

    rooms.forEach((room) => {
      const roomElement = this.createRoomElement(room);
      roomsList.appendChild(roomElement);
    });
  }

  // 방 요소 생성
  createRoomElement(room) {
    const roomDiv = document.createElement("div");
    roomDiv.className = "room-item";

    const statusClass = room.status === "waiting" ? "waiting" : "playing";
    const statusText = room.status === "waiting" ? "대기중" : "게임중";

    // 생성 시간 포맷팅
    const createdAt = room.createdAt
      ? new Date(room.createdAt).toLocaleString()
      : "알 수 없음";

    roomDiv.innerHTML = `
      <div class="room-info">
        <div class="room-name">${room.name}</div>
        <div class="room-status ${statusClass}">${statusText}</div>
      </div>
      <div class="room-details">
        <div class="room-owner">방장: ${room.owner}</div>
        <div class="room-players">${room.currentPlayers || 0}/${
      room.maxPlayers || 2
    }명</div>
        ${
          room.hasPassword
            ? '<div class="room-password">🔒 비밀번호</div>'
            : '<div class="room-password">🔓 공개</div>'
        }
        <div class="room-created">생성: ${createdAt}</div>
      </div>
      <div class="room-actions">
        ${
          room.status === "waiting" &&
          (room.currentPlayers || 0) < (room.maxPlayers || 2)
            ? '<button class="btn-join-room" onclick="window.multiplayerUI.joinRoom(\'' +
              room.id +
              "', " +
              (room.hasPassword ? "true" : "false") +
              ')">참가</button>'
            : '<button class="btn-join-room" disabled>참가불가</button>'
        }
      </div>
    `;

    return roomDiv;
  }

  // 방 참가
  joinRoom(roomId, hasPassword) {
    let password = null;

    if (hasPassword) {
      password = prompt("방 비밀번호를 입력하세요:");
      if (password === null) return; // 취소
    }

    const message = {
      type: "JOIN_ROOM",
      timestamp: Date.now(),
      data: {
        roomId: roomId,
        password: password,
        playerName: this.playerName,
        playerId: this.playerName, // 간단히 이름을 ID로 사용
      },
    };

    this.sendToServer(message);
  }

  // 방 생성
  createRoom() {
    const roomName = document.getElementById("room-name").value.trim();
    const password = document.getElementById("room-password").value.trim();

    if (!roomName) {
      alert("방 이름을 입력해주세요.");
      return;
    }

    const message = {
      type: "CREATE_ROOM",
      timestamp: Date.now(),
      data: {
        roomName: roomName,
        password: password || null,
        maxPlayers: 2,
        playerName: this.playerName,
        playerId: this.playerName,
      },
    };

    this.sendToServer(message);

    // 다이얼로그 닫기
    document.getElementById("create-room").close();
    document.getElementById("room-name").value = "";
    document.getElementById("room-password").value = "";
  }

  // 방 새로고침
  refreshRooms() {
    // 기본적으로 모든 방을 조회 (필터 없이)
    this.requestRoomList();
  }

  // 필터링된 방 목록 조회
  refreshRoomsWithFilter(filters) {
    this.requestRoomList(filters);
  }

  // 필터 적용
  applyFilters() {
    const statusFilter = document.getElementById("filter-status").value;
    const passwordFilter = document.getElementById("filter-password").value;
    const playersFilter = document.getElementById("filter-players").value;

    const filters = {
      status: statusFilter !== "all" ? statusFilter : undefined,
      hasPassword:
        passwordFilter !== "" ? passwordFilter === "true" : undefined,
      maxPlayers: playersFilter !== "" ? parseInt(playersFilter) : undefined,
    };

    // undefined 값 제거
    Object.keys(filters).forEach((key) => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    console.log("필터 적용:", filters);
    this.refreshRoomsWithFilter(filters);
  }

  // 대기 화면 업데이트
  updateWaitingScreen() {
    if (this.currentScreen !== "waiting") return;

    const roomInfoDisplay = document.getElementById("room-info-display");
    const playersList = document.getElementById("players-list");
    const startGameBtn = document.getElementById("btn-start-game");
    const readyBtn = document.getElementById("btn-ready");

    if (roomInfoDisplay && this.currentRoom) {
      roomInfoDisplay.innerHTML = `
        <h3>${this.currentRoom.name}</h3>
        <p>방장: ${this.currentRoom.owner || this.playerName}</p>
        <p>상태: ${this.currentRoom.status || "대기중"}</p>
      `;
    }

    if (playersList && this.currentRoom) {
      // 플레이어 목록 생성 (기본 플레이어 + 상대방 플레이어들)
      let players = [];

      // 자신을 먼저 추가
      const myPlayer = {
        playerId: this.playerId,
        playerName: this.playerName,
        isOwner: this.isRoomOwner,
        isReady: this.isReady,
      };
      players.push(myPlayer);

      // currentRoom.players에 있는 다른 플레이어들 추가
      if (this.currentRoom.players) {
        this.currentRoom.players.forEach((player) => {
          if (player.playerId !== this.playerId) {
            players.push(player);
          }
        });
      }

      console.log("표시할 플레이어 목록:", players);

      playersList.innerHTML = "";
      players.forEach((player) => {
        const playerDiv = document.createElement("div");
        playerDiv.className = "player-item";
        playerDiv.innerHTML = `
          <div class="player-name">${player.playerName}</div>
          <div class="player-status">
            ${player.isOwner ? '<span class="owner-badge">방장</span>' : ""}
            <span class="ready-status ${
              player.isReady ? "ready" : "not-ready"
            }">
              ${player.isReady ? "✅ 준비됨" : "⏳ 준비 안됨"}
            </span>
          </div>
        `;
        playersList.appendChild(playerDiv);
      });
    }

    // 게임 시작 버튼 상태 업데이트
    if (startGameBtn) {
      const canStart = this.isRoomOwner && this.isReady && this.opponentReady;
      startGameBtn.disabled = !canStart;
      startGameBtn.textContent = canStart
        ? "게임 시작"
        : "모든 플레이어가 준비되어야 합니다";
    }

    // 준비 버튼 상태 업데이트
    if (readyBtn) {
      readyBtn.disabled = this.isRoomOwner; // 방장은 준비 버튼 비활성화
      readyBtn.textContent = this.isReady ? "준비 취소" : "준비";
      readyBtn.className = `ready-btn ${this.isReady ? "ready" : ""}`;
    }
  }

  // 준비 상태 토글
  toggleReady() {
    if (this.isRoomOwner) return; // 방장은 준비 상태 변경 불가

    this.isReady = !this.isReady;

    const message = {
      type: "READY_STATUS",
      timestamp: Date.now(),
      data: {
        roomId: this.currentRoom.id,
        playerId: this.playerId,
        isReady: this.isReady,
      },
    };

    this.sendToServer(message);
    this.updateWaitingScreen();
  }

  // 멀티플레이어 게임 시작
  startMultiplayerGame() {
    if (!this.isRoomOwner || !this.isReady || !this.opponentReady) {
      alert("모든 플레이어가 준비되어야 게임을 시작할 수 있습니다.");
      return;
    }

    const message = {
      type: "START_GAME",
      timestamp: Date.now(),
      data: {
        roomId: this.currentRoom.id,
        playerId: this.playerId,
      },
    };

    this.sendToServer(message);
  }

  // 방 나가기
  leaveRoom() {
    if (this.currentRoom) {
      const message = {
        type: "LEAVE_ROOM",
        timestamp: Date.now(),
        data: {
          roomId: this.currentRoom.id,
          playerId: this.playerId,
        },
      };

      this.sendToServer(message);
    }

    // 상태 초기화
    this.currentRoom = null;
    this.isRoomOwner = false;
    this.isReady = false;
    this.opponentReady = false;
    this.opponentPlayer = null;

    // 로비로 돌아가기
    this.showLobby();
  }

  // 방 생성 다이얼로그 표시
  showCreateRoomDialog() {
    document.getElementById("create-room").showModal();
  }

  // 플레이어 상태 업데이트 (멀티플레이어 게임에서 호출)
  updatePlayerStatus(data) {
    // 연결 상태 표시 업데이트
    if (data.status === "disconnected") {
      console.log(`플레이어 ${data.playerId} 연결 끊김`);
    }
  }

  // 샘플 방 데이터 로드 (개발용)
  loadSampleRooms() {
    const now = Date.now();
    const sampleRooms = [
      {
        id: "room-1",
        name: "초보자 방",
        status: "waiting",
        owner: "플레이어1",
        currentPlayers: 1,
        maxPlayers: 2,
        hasPassword: false,
        createdAt: now - 300000, // 5분 전
      },
      {
        id: "room-2",
        name: "고수 방",
        status: "waiting",
        owner: "플레이어2",
        currentPlayers: 1,
        maxPlayers: 2,
        hasPassword: true,
        createdAt: now - 600000, // 10분 전
      },
      {
        id: "room-3",
        name: "친구와 함께",
        status: "playing",
        owner: "플레이어3",
        currentPlayers: 2,
        maxPlayers: 2,
        hasPassword: false,
        createdAt: now - 1200000, // 20분 전
      },
    ];

    this.displayRooms(sampleRooms);
  }

  // 상대방 참가 시뮬레이션 (개발용)
  simulateOpponentJoin() {
    this.opponentPlayer = {
      name: "상대방",
      isReady: false,
    };

    setTimeout(() => {
      this.opponentReady = true;
      this.updateWaitingScreen();
    }, 2000);
  }
}

// 전역 인스턴스 생성
window.multiplayerUI = new MultiplayerUI();
