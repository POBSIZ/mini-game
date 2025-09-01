// 멀티플레이어 Senet 게임 로직
class MultiplayerSenetGame {
  constructor() {
    this.board = document.getElementById("board");
    this.result = document.getElementById("result");
    this.statusEl = document.getElementById("status");
    this.rollBtn = document.getElementById("roll");
    this.resetBtn = document.getElementById("btn-reset");
    this.rulesBtn = document.getElementById("btn-rules");
    this.turnLabel = document.getElementById("turn-label");
    this.turnDot = document.getElementById("turn-dot");
    this.sticksEls = [0, 1, 2, 3].map((i) => document.getElementById("s" + i));

    // 게임 상태
    this.turn = "W";
    this.roll = null;
    this.pieces = { W: [1, 3, 5, 7, 9], B: [2, 4, 6, 8, 10] };
    this.gameOver = false;
    this.isMultiplayer = false;
    this.mySide = null; // 내가 플레이하는 말 색상
    this.currentPlayer = null; // 현재 플레이어 정보

    // 멀티플레이어 관련
    this.roomId = null;
    this.opponentId = null;
    this.gameId = null;
    this.gameState = "waiting"; // 'waiting', 'playing', 'finished'
    this.moveQueue = []; // 이동 대기열
    this.lastMove = null; // 마지막 이동 정보
    this.playerId = null; // 내 플레이어 ID
    this.playerName = null; // 내 플레이어 이름

    // WebSocket 연결 (MultiplayerUI와 공유)
    this.websocket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.heartbeatInterval = null;

    // 상수
    this.SAFE = new Set([15, 26]);
    this.WATER = 27;
    this.EXIT = 30;
    this.GLYPH = { 15: "✚", 26: "★", 27: "⎈", 30: "⟶" };

    // 자동 초기화하지 않음 - 필요할 때만 활성화
    this.isActive = false;
  }

  // WebSocket 연결 (MultiplayerUI의 WebSocket 공유)
  connectToServer() {
    if (window.multiplayerUI && window.multiplayerUI.websocket) {
      console.log("🔗 MultiplayerUI의 기존 WebSocket 연결 사용");
      this.websocket = window.multiplayerUI.websocket;
      this.isConnected = window.multiplayerUI.isConnected;

      // MultiplayerUI의 메시지 핸들러에 게임 메시지 처리 추가
      this.setupSharedMessageHandler();
    } else {
      console.log("⚠️ MultiplayerUI WebSocket이 없음, 대기 중...");
      // 짧은 지연 후 다시 시도
      setTimeout(() => this.connectToServer(), 1000);
    }
  }

  // 공유 메시지 핸들러 설정
  setupSharedMessageHandler() {
    if (window.multiplayerUI && window.multiplayerUI.handleServerMessage) {
      // MultiplayerUI의 기존 핸들러 백업
      if (!window.multiplayerUI._originalHandleServerMessage) {
        window.multiplayerUI._originalHandleServerMessage =
          window.multiplayerUI.handleServerMessage.bind(window.multiplayerUI);
      }

      const originalHandler = window.multiplayerUI._originalHandleServerMessage;

      // 새로운 핸들러로 교체 (UI와 게임 메시지 모두 처리)
      window.multiplayerUI.handleServerMessage = (message) => {
        console.log("📥 공유 메시지 핸들러:", message.type, message);

        // UI 관련 메시지는 MultiplayerUI에서 처리
        const uiMessages = [
          "ROOM_LIST",
          "ROOM_CREATED",
          "ROOM_JOINED",
          "PLAYER_READY",
        ];
        if (uiMessages.includes(message.type)) {
          console.log("🎨 UI 메시지 처리:", message.type);
          originalHandler(message);
          return;
        }

        // 게임 관련 메시지는 MultiplayerGame에서 처리
        const gameMessages = [
          "STICKS_ROLLED",
          "PIECE_MOVED",
          "TURN_CHANGED",
          "GAME_ENDED",
        ];
        if (gameMessages.includes(message.type)) {
          console.log("🎮 게임 메시지 처리:", message.type);
          this.handleServerMessage(message);
          return;
        }

        // 공통 메시지는 둘 다 처리 (UI 전환과 게임 로직 모두 필요)
        const commonMessages = [
          "ERROR",
          "PLAYER_STATUS",
          "GAME_STARTED", // 게임 시작은 UI 전환과 게임 활성화 모두 필요
        ];
        if (commonMessages.includes(message.type)) {
          console.log("🔄 공통 메시지 처리:", message.type);
          originalHandler(message);
          this.handleServerMessage(message);
          return;
        }

        // 처리되지 않은 메시지 로깅
        console.warn("⚠️ 처리되지 않은 메시지:", message.type, message);
      };

      console.log("✅ 공유 메시지 핸들러 설정 완료");
    }
  }

  // 서버 연결 해제
  disconnectFromServer() {
    // 공유 연결이므로 여기서는 연결을 닫지 않음
    this.websocket = null;
    this.isConnected = false;
    this.stopHeartbeat();
  }

  // 하트비트 시작
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendHeartbeat();
      }
    }, 30000); // 30초마다
  }

  // 하트비트 중지
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 하트비트 전송
  sendHeartbeat() {
    const message = {
      type: "HEARTBEAT",
      timestamp: Date.now(),
      data: {
        playerId: this.playerId,
        roomId: this.roomId,
      },
    };
    this.sendToServer(message);
  }

  // 플레이어 등록
  registerPlayer() {
    if (!this.playerId || !this.playerName) return;

    const message = {
      type: "PLAYER_REGISTER",
      timestamp: Date.now(),
      data: {
        playerId: this.playerId,
        playerName: this.playerName,
      },
    };
    this.sendToServer(message);
  }

  // 서버에 메시지 전송
  sendToServer(message) {
    if (this.websocket && this.isConnected) {
      try {
        const messageStr = JSON.stringify(message);
        console.log("📤 서버로 메시지 전송:", messageStr);
        this.websocket.send(messageStr);
      } catch (error) {
        console.error("서버 전송 오류:", error);
      }
    } else if (window.multiplayerUI && window.multiplayerUI.sendToServer) {
      // MultiplayerUI의 전송 메소드 사용
      console.log("📤 MultiplayerUI를 통한 메시지 전송:", message);
      window.multiplayerUI.sendToServer(message);
    } else {
      console.warn("서버에 연결되지 않음, 메시지 전송 실패:", message);
    }
  }

  // 서버 메시지 처리
  handleServerMessage(message) {
    console.log(
      "📥 MultiplayerGame 서버 메시지 수신:",
      message.type,
      "타임스탬프:",
      message.timestamp
    );

    switch (message.type) {
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
      case "STICKS_ROLLED":
        this.handleSticksRolled(message.data);
        break;
      case "PIECE_MOVED":
        this.handlePieceMoved(message.data);
        break;
      case "TURN_CHANGED":
        this.handleTurnChanged(message.data);
        break;
      case "GAME_ENDED":
        this.handleGameEnded(message.data);
        break;
      case "GAME_RESET":
        this.handleGameReset(message.data);
        break;
      case "PLAYER_STATUS":
        this.handlePlayerStatus(message.data);
        break;
      case "ERROR":
        this.handleError(message.data);
        break;
      case "CHAT_RECEIVED":
        this.handleChatReceived(message.data);
        break;
      case "GAME_STATE_SYNC":
        this.handleGameStateSync(message.data);
        break;
      default:
        console.log("알 수 없는 메시지 타입:", message.type);
    }
  }

  // 방 생성 응답 처리
  handleRoomCreated(data) {
    this.roomId = data.roomId;
    console.log("방 생성됨:", data.roomName);

    // UI 업데이트
    if (window.multiplayerUI) {
      window.multiplayerUI.updateWaitingScreen();
    }
  }

  // 방 참가 응답 처리
  handleRoomJoined(data) {
    this.roomId = data.roomId;
    console.log("방 참가됨:", data.roomName);

    // 플레이어 정보 업데이트
    if (window.multiplayerUI) {
      window.multiplayerUI.updateWaitingScreen();
    }
  }

  // 플레이어 준비 상태 처리
  handlePlayerReady(data) {
    console.log("플레이어 준비 상태 변경:", data);

    if (window.multiplayerUI) {
      window.multiplayerUI.updateWaitingScreen();
    }
  }

  // 게임 시작 처리
  handleGameStarted(data) {
    console.log("🎮 MultiplayerGame 게임 시작 처리:", data);

    this.gameId = data.gameId;
    this.gameState = "playing";

    // 게임 상태 초기화
    if (data.gameState && data.gameState.pieces) {
      console.log("📊 초기 게임 상태 설정:", data.gameState);
      this.pieces = data.gameState.pieces;
      this.turn = data.gameState.turn || "W";
      this.roll = data.gameState.roll || null;
      this.gameOver = data.gameState.game_over || false;
    }

    // 내 말 색상 설정
    if (data.players) {
      const myPlayer = data.players.find((p) => p.playerId === this.playerId);
      if (myPlayer) {
        this.mySide = myPlayer.side;
        console.log("🎯 내 말 색상 설정:", this.mySide);
      }
    }

    // 게임 활성화
    this.activateGame();

    // UI 업데이트
    this.updateMultiplayerUI();
    this.enableGameControls();

    console.log("✅ 멀티플레이어 게임 활성화 완료");
  }

  // 막대기 던지기 결과 처리
  handleSticksRolled(data) {
    console.log("🎲 STICKS_ROLLED 메시지 처리 시작");
    console.log("📊 수신된 데이터:", JSON.stringify(data, null, 2));
    console.log("🎯 현재 플레이어 ID:", this.playerId);
    console.log("🎯 메시지의 플레이어 ID:", data.playerId);

    // 모든 클라이언트가 동일한 결과를 받아야 함
    console.log("🔄 게임 상태 업데이트 시작");
    console.log("📊 이전 상태:", { roll: this.roll, turn: this.turn });

    this.roll = data.roll;
    this.turn = data.turn;

    console.log("📊 새로운 상태:", { roll: this.roll, turn: this.turn });

    // 막대기 상태 업데이트
    if (data.faces && Array.isArray(data.faces)) {
      console.log("🎲 막대기 면 업데이트:", data.faces);
      this.sticksEls.forEach((el, i) => {
        if (el) {
          const isOn = !!data.faces[i];
          el.classList.toggle("on", isOn);
          console.log(`  막대기 ${i}: ${isOn ? "ON" : "OFF"}`);
        }
      });
    } else {
      console.warn("⚠️ 막대기 면 데이터가 없거나 잘못된 형식:", data.faces);
    }

    if (this.result) {
      this.result.textContent = data.roll;
      console.log("🎯 결과 표시 업데이트:", data.roll);
    } else {
      console.warn("⚠️ 결과 표시 요소를 찾을 수 없음");
    }

    console.log("🎨 UI 업데이트 시작");
    this.updateTurnUI();
    this.highlightMovablePieces();
    console.log("🎨 UI 업데이트 완료");

    console.log("✅ STICKS_ROLLED 메시지 처리 완료:", {
      roll: this.roll,
      turn: this.turn,
      canMove: data.canMove,
      playerId: data.playerId,
    });
  }

  // 말 이동 결과 처리
  handlePieceMoved(data) {
    console.log("🎯 PIECE_MOVED 메시지 처리 시작");
    console.log("📊 메시지 데이터:", JSON.stringify(data, null, 2));

    // 서버의 게임 상태를 완전히 동기화
    if (data.gameState) {
      console.log("🔄 게임 상태 동기화 시작");
      console.log("📊 서버에서 받은 게임 상태:", data.gameState);

      // pieces 구조 변환 (서버에서 오는 pieces는 {W: [...], B: [...]} 형태)
      if (data.gameState.pieces) {
        console.log("📋 말 위치 동기화:", data.gameState.pieces);
        this.pieces = data.gameState.pieces;
      }

      if (data.gameState.turn) {
        console.log("🎲 턴 동기화:", data.gameState.turn);
        this.turn = data.gameState.turn;
      }

      if (typeof data.gameState.game_over === "boolean") {
        console.log("🏁 게임 종료 상태 동기화:", data.gameState.game_over);
        this.gameOver = data.gameState.game_over;
      }

      console.log("✅ 게임 상태 동기화 완료:", {
        turn: this.turn,
        pieces: this.pieces,
        gameOver: this.gameOver,
      });
    }

    // UI 업데이트
    console.log("🎨 UI 업데이트 시작");
    this.draw();
    this.updateTurnUI();
    this.clearHighlights();
    console.log("🎨 UI 업데이트 완료");
  }

  // 턴 변경 처리
  handleTurnChanged(data) {
    console.log("🔄 턴 변경 처리:", data);
    this.turn = data.newTurn;
    this.roll = null;

    if (this.result) {
      this.result.textContent = "–";
    }

    this.sticksEls.forEach((el) => {
      if (el) {
        el.classList.remove("on");
      }
    });
    this.clearHighlights();

    this.updateTurnUI();

    console.log("✅ 턴 변경 완료:", data.newTurn, "이유:", data.reason);
  }

  // 게임 종료 처리
  handleGameEnded(data) {
    this.gameState = "finished";
    this.gameOver = true;

    // 승자 표시
    const winnerName = data.winnerName || "알 수 없음";
    if (this.statusEl) {
      this.statusEl.textContent = `게임 종료! ${winnerName} 승리!`;
    }

    this.disableGameControls();

    console.log("게임 종료:", data);
  }

  // 게임 리셋 처리
  handleGameReset(data) {
    this.resetGame();
    this.gameId = data.newGameId;
    this.gameState = "waiting";

    console.log("게임 리셋됨:", data);
  }

  // 플레이어 상태 처리
  handlePlayerStatus(data) {
    console.log("플레이어 상태 변경:", data);

    // UI에 연결 상태 표시
    if (window.multiplayerUI) {
      window.multiplayerUI.updatePlayerStatus(data);
    }
  }

  // 에러 처리
  handleError(data) {
    console.error("서버 에러:", data);

    // 사용자에게 에러 표시
    alert(`오류: ${data.message}`);

    // 특정 에러에 대한 처리
    switch (data.code) {
      case "NOT_YOUR_TURN":
        if (this.statusEl) {
          this.statusEl.textContent = "아직 내 턴이 아닙니다.";
        }
        break;
      case "INVALID_MOVE":
        if (this.statusEl) {
          this.statusEl.textContent = "유효하지 않은 이동입니다.";
        }
        break;
      case "GAME_NOT_STARTED":
        if (this.statusEl) {
          this.statusEl.textContent = "게임이 아직 시작되지 않았습니다.";
        }
        break;
    }
  }

  // 채팅 메시지 처리
  handleChatReceived(data) {
    console.log("채팅 메시지:", data);
  }

  // 게임 상태 동기화 처리
  handleGameStateSync(data) {
    if (data.gameState) {
      this.pieces = data.gameState.pieces;
      this.turn = data.gameState.turn;
      this.roll = data.gameState.roll;
      this.gameOver = data.gameState.game_over;

      // 보드 업데이트
      this.draw();
    }
  }

  // 게임 활성화 (멀티플레이어 또는 로컬 게임 시작 시)
  activateGame() {
    if (this.isActive) return; // 이미 활성화된 경우 중복 실행 방지

    console.log("🎮 게임 활성화 시작");
    this.isActive = true;

    // 이벤트 리스너 설정
    if (this.rollBtn) {
      this.rollBtn.addEventListener("click", () => this.onRollClick());
    }
    if (this.resetBtn) {
      this.resetBtn.addEventListener("click", () => this.onResetClick());
    }
    if (this.rulesBtn) {
      this.rulesBtn.addEventListener("click", () => this.onRulesClick());
    }

    // 키보드 이벤트
    document.addEventListener("keydown", (e) => this.onKeyDown(e));

    // 초기 게임 보드 그리기
    this.draw();

    console.log("✅ 게임 활성화 완료");
  }

  // 멀티플레이어 게임 시작
  startMultiplayerGame(roomId, mySide, opponentId) {
    console.log("🎮 멀티플레이어 게임 시작 요청:", {
      roomId,
      mySide,
      opponentId,
    });

    this.isMultiplayer = true;
    this.roomId = roomId;
    this.mySide = mySide;
    this.opponentId = opponentId;
    this.gameState = "playing";

    // 플레이어 정보 설정
    if (window.multiplayerUI) {
      this.playerId =
        window.multiplayerUI.playerId || window.multiplayerUI.playerName;
      this.playerName = window.multiplayerUI.playerName;
      this.isConnected = window.multiplayerUI.isConnected;
    }

    console.log(`🎮 멀티플레이어 게임 설정 완료:`, {
      roomId: this.roomId,
      mySide: this.mySide,
      playerId: this.playerId,
      playerName: this.playerName,
    });

    // WebSocket 연결 확인 및 설정
    this.connectToServer();

    // 게임 활성화는 GAME_STARTED 메시지에서 처리
    console.log("✅ 멀티플레이어 게임 시작 설정 완료");
  }

  // 멀티플레이어 UI 업데이트
  updateMultiplayerUI() {
    if (this.isMultiplayer) {
      // 멀티플레이어 상태 표시
      const multiplayerStatus = document.getElementById("multiplayer-status");
      if (multiplayerStatus) {
        multiplayerStatus.style.display = "block";
        multiplayerStatus.innerHTML = `
          <div class="status-item">
            <span class="status-label">방:</span>
            <span class="status-value">${this.roomId || "연결 중..."}</span>
          </div>
          <div class="status-item">
            <span class="status-label">내 말:</span>
            <span class="status-value">${
              this.mySide === "W" ? "흰말" : "검은말"
            }</span>
          </div>
          <div class="status-item">
            <span class="status-label">연결:</span>
            <span class="status-value ${
              this.isConnected ? "connected" : "disconnected"
            }">
              ${this.isConnected ? "연결됨" : "연결 끊김"}
            </span>
          </div>
        `;
      }

      // 턴 표시에 플레이어 정보 추가
      this.updateTurnUI();
    }
  }

  // 게임 컨트롤 활성화/비활성화
  enableGameControls() {
    if (this.rollBtn) {
      this.rollBtn.disabled = false;
    }
    if (this.resetBtn) {
      this.resetBtn.disabled = false;
    }
  }

  disableGameControls() {
    if (this.rollBtn) {
      this.rollBtn.disabled = true;
    }
    if (this.resetBtn) {
      this.resetBtn.disabled = true;
    }
  }

  // 내 턴인지 확인
  isMyTurn() {
    if (!this.isMultiplayer) return true;
    return this.turn === this.mySide;
  }

  // 턴 UI 업데이트
  updateTurnUI() {
    if (!this.turnLabel || !this.turnDot) return;

    let name = "";
    if (this.isMultiplayer) {
      if (this.turn === this.mySide) {
        name = "내 차례";
      } else {
        name = "상대방 차례";
      }
    } else {
      name = this.turn === "W" ? "흰말 차례" : "검은말 차례";
    }

    this.turnLabel.textContent =
      name + (this.roll ? ` · 이동: ${this.roll}` : "");
    this.turnDot.className = "turn-dot " + this.turn;
  }

  // 막대기 던지기 클릭 이벤트
  onRollClick() {
    // 디버그 모드 체크 (Shift+클릭 또는 window.DEBUG_MODE)
    const debugMode = window.DEBUG_MODE || false;

    if (!debugMode && (this.gameOver || this.roll || !this.isMyTurn())) {
      console.log("🚫 주사위 굴리기 불가:", {
        gameOver: this.gameOver,
        roll: this.roll,
        isMyTurn: this.isMyTurn(),
      });
      console.log("💡 디버그 모드: window.DEBUG_MODE = true 설정 후 다시 시도");
      return;
    }

    if (debugMode) {
      console.log("🔧 디버그 모드 활성화 - 턴 제한 무시");
    }

    console.log("🎲 막대기 던지기 시작");
    console.log("📊 현재 게임 상태:", {
      gameOver: this.gameOver,
      roll: this.roll,
      isMyTurn: this.isMyTurn(),
      isMultiplayer: this.isMultiplayer,
      playerId: this.playerId,
      roomId: this.roomId,
    });

    // 멀티플레이어인 경우 서버에 막대기 던지기 요청
    if (this.isMultiplayer) {
      console.log("🎯 멀티플레이어 모드 - 서버에 ROLL_STICKS 요청");
      this.sendRollSticks();
      // 서버 응답을 기다리므로 여기서는 roll을 설정하지 않음
    } else {
      console.log("🎯 로컬 게임 모드 - 즉시 주사위 굴림");
      // 로컬 게임인 경우 즉시 결과 설정
      this.roll = this.rollSticks();
      this.updateTurnUI();
      this.passTurnIfNoMoves();
      this.highlightMovablePieces();
    }
  }

  // 키보드 이벤트
  onKeyDown(e) {
    if (e.key === "r" || e.key === "R") {
      if (!this.roll && !this.gameOver && this.isMyTurn()) {
        if (this.isMultiplayer) {
          this.sendRollSticks();
        } else {
          this.roll = this.rollSticks();
          this.updateTurnUI();
          this.passTurnIfNoMoves();
          this.highlightMovablePieces();
        }
      }
    }
  }

  // 리셋 버튼 클릭
  onResetClick() {
    if (this.isMultiplayer) {
      // 멀티플레이어에서는 방장만 리셋 가능
      if (window.multiplayerUI && window.multiplayerUI.isRoomOwner) {
        this.resetGame();
        this.sendGameReset();
      } else {
        alert("방장만 게임을 리셋할 수 있습니다.");
      }
    } else {
      this.resetGame();
    }
  }

  // 규칙 버튼 클릭
  onRulesClick() {
    const rulesModal = document.getElementById("rules");
    if (rulesModal) {
      rulesModal.showModal();
    }
  }

  // 게임 리셋
  resetGame() {
    this.turn = "W";
    this.roll = null;
    this.pieces = { W: [1, 3, 5, 7, 9], B: [2, 4, 6, 8, 10] };
    this.gameOver = false;

    if (this.statusEl) {
      this.statusEl.textContent = "";
    }
    if (this.result) {
      this.result.textContent = "–";
    }

    this.sticksEls.forEach((el) => {
      if (el) {
        el.classList.remove("on");
      }
    });
    this.draw();
  }

  // 막대기 던지기
  rollSticks() {
    const faces = [0, 0, 0, 0].map(() => (Math.random() < 0.5 ? 0 : 1));
    const sum = faces.reduce((a, b) => a + b, 0);
    const p = sum === 0 ? 5 : sum;

    this.sticksEls.forEach((el, i) => {
      if (el) {
        el.classList.toggle("on", !!faces[i]);
      }
    });

    if (this.result) {
      this.result.textContent = p;
    }

    return p;
  }

  // 게임 보드 그리기
  draw() {
    if (!this.isActive || !this.board) return; // 게임이 활성화되지 않은 경우 그리지 않음

    this.board.innerHTML = "";
    for (let i = 1; i <= 30; i++) {
      const cell = document.createElement("div");
      cell.className =
        "cell" +
        (this.SAFE.has(i) ? " safe" : "") +
        (i === this.WATER ? " water" : "");
      cell.dataset.idx = i;

      const { r, c } = this.indexToRC(i);
      cell.style.gridRow = r + 1;
      cell.style.gridColumn = c + 1;

      const idxTag = document.createElement("div");
      idxTag.className = "idx";
      idxTag.textContent = i;
      cell.appendChild(idxTag);

      if (this.GLYPH[i]) {
        const g = document.createElement("div");
        g.className = "glyph";
        g.textContent = this.GLYPH[i];
        cell.appendChild(g);
      }

      const p = this.pieceAt(i);
      if (p) {
        const el = document.createElement("div");
        el.className = "piece " + p.side;
        el.textContent = p.side;

        // 멀티플레이어에서는 내 말만 클릭 가능
        if (this.isMultiplayer && p.side !== this.mySide) {
          el.classList.add("disabled");
        } else {
          el.onclick = () => this.onPieceClick(p.side, p.i);
        }

        cell.appendChild(el);
      }
      this.board.appendChild(cell);
    }

    this.updateTurnUI();
    this.highlightMovablePieces();
  }

  // 인덱스를 행/열로 변환
  indexToRC(idx) {
    const r = Math.floor((idx - 1) / 10);
    let c = (idx - 1) % 10;
    if (r % 2 === 1) c = 9 - c;
    return { r, c };
  }

  // 특정 위치의 말 정보
  pieceAt(idx) {
    for (const s of ["W", "B"]) {
      const k = this.pieces[s].indexOf(idx);
      if (k !== -1) return { side: s, i: k };
    }
    return null;
  }

  // 말 클릭 이벤트
  onPieceClick(side, i) {
    if (!this.roll || this.gameOver || !this.isMyTurn()) return;

    console.log("🎯 말 클릭:", { side, i, roll: this.roll });

    const from = this.pieces[side][i];
    const to = from + this.roll;

    if (this.isValidMove(side, i, to)) {
      if (this.isMultiplayer) {
        // 멀티플레이어에서는 서버에 이동 요청
        this.sendMoveUpdate(side, i, from, to);
      } else {
        // 로컬 게임에서는 즉시 이동
        this.move(side, i, to);
      }
    }
  }

  // 유효한 이동인지 확인
  isValidMove(side, i, to) {
    if (to > this.EXIT) return false;

    const from = this.pieces[side][i];
    const opp = side === "W" ? "B" : "W";

    // 경로가 막혀있는지 확인
    if (this.pathBlockedByOpponent(from, to, opp)) return false;

    // 목적지에 같은 편 말이 있는지 확인
    const occ = this.pieceAt(to);
    if (occ && occ.side === side) return false;

    return true;
  }

  // 상대방 말로 인한 경로 차단 확인
  pathBlockedByOpponent(from, to, opp) {
    for (let s = from + 1; s <= to; s++) {
      if (this.isBlockadeSquare(s, opp)) return true;
    }
    return false;
  }

  // 차단된 칸인지 확인
  isBlockadeSquare(idx, side) {
    const here = this.pieceAt(idx);
    if (!here || here.side !== side) return false;
    return this.isAdjacentSameColor(idx, side);
  }

  // 인접한 같은 색상 말 확인
  isAdjacentSameColor(idx, side) {
    const L = this.pieceAt(idx - 1);
    const R = this.pieceAt(idx + 1);
    return (L && L.side === side) || (R && R.side === side);
  }

  // 말 이동
  move(side, i, to) {
    if (this.gameOver) return;

    const from = this.pieces[side][i];
    const opp = side === "W" ? "B" : "W";
    let extraTurn = this.roll === 4 || this.roll === 5;

    const finalize = () => {
      if (this.checkWin(side)) {
        this.roll = null;
        if (this.result) {
          this.result.textContent = "–";
        }
        this.sticksEls.forEach((el) => {
          if (el) {
            el.classList.remove("on");
          }
        });
        this.clearHighlights();
        this.draw();
        return;
      }

      this.roll = null;
      if (this.result) {
        this.result.textContent = "–";
      }
      this.sticksEls.forEach((el) => {
        if (el) {
          el.classList.remove("on");
        }
      });
      this.clearHighlights();
      this.draw();

      if (!extraTurn) {
        this.turn = opp;
        // 멀티플레이어인 경우 턴 변경을 서버에 전송
        if (this.isMultiplayer) {
          this.sendTurnChange();
        }
      } else {
        if (this.statusEl) {
          this.statusEl.textContent =
            (side === "W" ? "흰말" : "검은말") + " 추가턴! (4/5)";
        }
      }

      this.updateTurnUI();
    };

    if (to === this.WATER) {
      const back = !this.pieceAt(15) ? 15 : !this.pieceAt(26) ? 26 : null;
      if (!back) return;
      this.pieces[side][i] = back;
      extraTurn = false;
      this.animateMove(from, this.WATER, side, finalize);
      return;
    }

    if (to === this.EXIT) {
      this.pieces[side][i] = 0;
      this.animateMove(from, this.EXIT, side, finalize);
      return;
    }

    const occ = this.pieceAt(to);
    if (occ && occ.side === opp) {
      this.pieces[occ.side][occ.i] = from;
    }

    this.pieces[side][i] = to;
    this.animateMove(from, to, side, finalize);

    // 멀티플레이어인 경우 이동 정보를 서버에 전송 (이미 위에서 전송됨)
    if (this.isMultiplayer) {
      console.log("✅ 말 이동 완료 (서버 응답 대기 중)");
    }
  }

  // 승리 확인
  checkWin(side) {
    return this.pieces[side].every((p) => p === 0);
  }

  // 이동 애니메이션
  animateMove(fromIdx, toIdx, side, done) {
    if (!this.board) {
      done();
      return;
    }

    const fromCell = this.board.querySelector(
      '.cell[data-idx="' + fromIdx + '"]'
    );
    const toCell =
      this.board.querySelector('.cell[data-idx="' + toIdx + '"]') ||
      this.board.querySelector('.cell[data-idx="30"]');
    if (!fromCell || !toCell) {
      done();
      return;
    }
    const pieceEl = fromCell.querySelector(".piece");
    const fb = fromCell.getBoundingClientRect();
    const tb = toCell.getBoundingClientRect();
    const ghost = document.createElement("div");
    ghost.className = "float-piece " + side;
    ghost.style.background =
      side === "W"
        ? "linear-gradient(180deg,#e6f0ff,#cfe0ff)"
        : "linear-gradient(180deg,#2b2f4f,#1c203b)";
    ghost.style.color = side === "W" ? "#09121f" : "#e7eaff";
    ghost.textContent = side;
    document.body.appendChild(ghost);
    ghost.style.left = fb.left + window.scrollX + (fb.width - 58) / 2 + "px";
    ghost.style.top = fb.top + window.scrollY + (fb.height - 58) / 2 + "px";
    ghost.style.transition = "transform .28s ease";
    const dx = tb.left - fb.left;
    const dy = tb.top - fb.top;
    requestAnimationFrame(() => {
      ghost.style.transform = "translate(" + dx + "px," + dy + "px)";
    });
    setTimeout(() => {
      ghost.remove();
      done();
    }, 300);
  }

  // 이동할 수 있는 말 하이라이트
  highlightMovablePieces() {
    if (!this.roll || !this.board) return;

    this.clearHighlights();

    for (const side of ["W", "B"]) {
      if (side !== this.turn) continue;

      for (let i = 0; i < this.pieces[side].length; i++) {
        const from = this.pieces[side][i];
        if (from === 0) continue;

        const to = from + this.roll;
        if (this.isValidMove(side, i, to)) {
          const piece = this.board.querySelector(`[data-idx="${from}"] .piece`);
          if (piece) {
            piece.classList.add("can-move");
          }
        }
      }
    }
  }

  // 하이라이트 제거
  clearHighlights() {
    if (!this.board) return;

    this.board.querySelectorAll(".piece.can-move").forEach((el) => {
      el.classList.remove("can-move");
    });
  }

  // 이동할 수 없는 경우 턴 패스
  passTurnIfNoMoves() {
    let hasMoves = false;

    for (const side of ["W", "B"]) {
      if (side !== this.turn) continue;

      for (let i = 0; i < this.pieces[side].length; i++) {
        const from = this.pieces[side][i];
        if (from === 0) continue;

        const to = from + this.roll;
        if (this.isValidMove(side, i, to)) {
          hasMoves = true;
          break;
        }
      }

      if (hasMoves) break;
    }

    if (!hasMoves) {
      if (this.statusEl) {
        this.statusEl.textContent =
          "이동할 수 있는 말이 없습니다. 턴을 패스합니다.";
      }
      setTimeout(() => {
        this.turn = this.turn === "W" ? "B" : "W";
        this.roll = null;
        if (this.result) {
          this.result.textContent = "–";
        }
        this.sticksEls.forEach((el) => {
          if (el) {
            el.classList.remove("on");
          }
        });
        if (this.statusEl) {
          this.statusEl.textContent = "";
        }
        this.updateTurnUI();
        this.highlightMovablePieces();

        if (this.isMultiplayer) {
          this.sendTurnChange();
        }
      }, 1500);
    }
  }

  // 멀티플레이어 통신 메서드들 (프로토콜 기반)
  sendRollSticks() {
    // 연결 상태 상세 디버깅
    console.log("🔍 클라이언트 상태 디버깅:");
    console.log("  - roomId:", this.roomId);
    console.log("  - playerId:", this.playerId);
    console.log("  - gameId:", this.gameId);
    console.log("  - turn:", this.turn);
    console.log("  - WebSocket 상태:", this.websocket?.readyState);
    console.log("  - WebSocket URL:", this.websocket?.url);

    const message = {
      type: "ROLL_STICKS",
      timestamp: Date.now(),
      data: {
        roomId: this.roomId,
        playerId: this.playerId,
        gameId: this.gameId,
        turn: this.turn,
      },
    };

    console.log("🎲 ROLL_STICKS 메시지 전송:", message);
    this.sendToServer(message);
  }

  sendTurnChange() {
    const message = {
      type: "TURN_CHANGE",
      timestamp: Date.now(),
      data: {
        roomId: this.roomId,
        playerId: this.playerId,
        gameId: this.gameId,
        newTurn: this.turn,
      },
    };
    this.sendToServer(message);
  }

  sendMoveUpdate(side, i, from, to) {
    const message = {
      type: "MOVE_PIECE",
      timestamp: Date.now(),
      data: {
        roomId: this.roomId,
        playerId: this.playerId,
        gameId: this.gameId,
        move: {
          side: side,
          pieceIndex: i,
          from: from,
          to: to,
          roll: this.roll,
        },
      },
    };

    console.log("🎯 MOVE_PIECE 메시지 전송:", message);
    this.sendToServer(message);
  }

  sendGameReset() {
    const message = {
      type: "RESET_GAME",
      timestamp: Date.now(),
      data: {
        roomId: this.roomId,
        playerId: this.playerId,
        gameId: this.gameId,
      },
    };
    this.sendToServer(message);
  }

  // 게임 종료
  endGame() {
    this.gameState = "finished";
    this.disableGameControls();

    if (this.isMultiplayer) {
      // 멀티플레이어 게임 종료 처리
      console.log("멀티플레이어 게임 종료");
    }
  }
}

// 전역에서 접근 가능하도록 설정
window.MultiplayerSenetGame = MultiplayerSenetGame;
