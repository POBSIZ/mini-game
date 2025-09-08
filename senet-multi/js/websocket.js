// WebSocket 연결 및 메시지 처리 모듈
import { gameStateManager } from "./game-state.js";
import { uiManager } from "./ui-manager.js";
import { chatSystem } from "./chat-system.js";
import { gameLogic } from "./game-logic.js";

export class WebSocketManager {
  constructor() {
    this.ws = null;
    this.heartbeatInterval = null;
    this.messageHandlers = this.createMessageHandlers();
  }

  // WebSocket 연결
  connect() {
    this.ws = new WebSocket("ws://localhost:8080/ws");

    this.ws.onopen = () => {
      console.log("WebSocket 연결됨");
      this.startHeartbeat();
    };

    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      console.log("수신:", msg);
      this.handleMessage(msg);
    };

    this.ws.onclose = () => {
      console.log("WebSocket 연결 끊어짐");
      this.stopHeartbeat();
      setTimeout(() => this.connect(), 1000);
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket 에러:", error);
    };
  }

  // 메시지 전송
  send(type, data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  // 하트비트 시작
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (
        this.ws &&
        this.ws.readyState === WebSocket.OPEN &&
        gameStateManager.currentRoom.id
      ) {
        this.send("HEARTBEAT", {
          roomId: gameStateManager.currentRoom.id,
          playerId: gameStateManager.currentPlayer.id,
        });
      }
    }, 30000);
  }

  // 하트비트 중지
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 메시지 핸들러 생성
  createMessageHandlers() {
    return {
      ROOM_LIST: this.handleRoomList.bind(this),
      ROOM_CREATED: this.handleRoomCreated.bind(this),
      ROOM_JOINED: this.handleRoomJoined.bind(this),
      PLAYER_JOINED: this.handlePlayerJoined.bind(this),
      PLAYER_LEFT: this.handlePlayerLeft.bind(this),
      PLAYER_READY: this.handlePlayerReady.bind(this),
      PLAYER_UNREADY: this.handlePlayerUnready.bind(this),
      GAME_STARTED: this.handleGameStarted.bind(this),
      STICKS_ROLLED: this.handleSticksRolled.bind(this),
      PIECE_MOVED: this.handlePieceMoved.bind(this),
      TURN_CHANGED: this.handleTurnChanged.bind(this),
      PASS_TURN: this.handlePassTurn.bind(this),
      GAME_ENDED: this.handleGameEnded.bind(this),
      GAME_RESET: this.handleGameReset.bind(this),
      CHAT_RECEIVED: this.handleChatReceived.bind(this),
      PLAYER_STATUS: this.handlePlayerStatus.bind(this),
      ERROR: this.handleError.bind(this),
    };
  }

  // 메시지 처리
  handleMessage(msg) {
    const handler = this.messageHandlers[msg.type];
    if (handler) {
      handler(msg.data);
    } else {
      console.log("알 수 없는 메시지 타입:", msg.type);
    }
  }

  // 메시지 핸들러들
  handleRoomList(data) {
    uiManager.updateRoomList(data.rooms);
  }

  handleRoomCreated(data) {
    gameStateManager.setCurrentRoom({
      id: data.roomId,
      name: data.roomName,
      status: data.status,
    });
    gameStateManager.setCurrentPlayer({ isOwner: true });

    uiManager.showMessage(
      `방이 생성되었습니다! 방 코드: ${data.roomId}`,
      "success"
    );
    uiManager.joinWaitingRoom(
      data.roomId,
      data.roomName,
      gameStateManager.currentPlayer.name,
      true
    );
  }

  handleRoomJoined(data) {
    gameStateManager.setCurrentRoom({
      id: data.roomId,
      name: data.roomName,
      status: data.status,
    });

    // 플레이어 정보 설정
    const player = data.players.find(
      (p) => p.playerName === gameStateManager.currentPlayer.name
    );
    if (player) {
      gameStateManager.setCurrentPlayer({
        id: player.playerId,
        isOwner: player.isOwner,
        side: player.side,
      });
    } else {
      console.error("현재 플레이어를 찾을 수 없습니다:", {
        currentPlayerName: gameStateManager.currentPlayer.name,
        allPlayers: data.players,
      });
    }

    // 대기실 상태 설정
    gameStateManager.updateWaitingState({
      players: data.players,
      readyPlayers: new Set(
        data.players.filter((p) => p.isReady).map((p) => p.playerId)
      ),
    });

    uiManager.joinWaitingRoom(
      data.roomId,
      data.roomName,
      gameStateManager.currentPlayer.name,
      player ? player.isOwner : false
    );

    // 디버깅을 위한 로그
    console.log("방 참가 후 상태:", {
      currentPlayer: gameStateManager.currentPlayer,
      waitingState: gameStateManager.waitingState,
      canStart: gameStateManager.canStartGame(),
    });
  }

  handlePlayerJoined(data) {
    gameStateManager.addPlayer(data.player);
    uiManager.updatePlayersList();
    chatSystem.addSystemMessage(
      `${data.player.playerName}님이 방에 참가했습니다.`
    );
  }

  handlePlayerLeft(data) {
    console.log("handlePlayerLeft 호출됨:", data);
    
    // 플레이어 이름이 없으면 대기실에서 찾기
    let playerName = data.playerName;
    if (!playerName || playerName === "Unknown") {
      const player = gameStateManager.waitingState.players.find(
        (p) => p.playerId === data.playerId
      );
      playerName = player ? player.playerName : "Unknown";
    }
    
    gameStateManager.removePlayer(data.playerId);
    uiManager.updatePlayersList();
    uiManager.updateStartButton();
    chatSystem.addSystemMessage(`${playerName}님이 방을 나갔습니다.`);

    // 게임 중일 때 상대방이 나간 경우 자동 승리 처리
    if (gameStateManager.currentRoom.status === "playing" && 
        gameStateManager.gameState && 
        !gameStateManager.gameState.gameOver) {
      
      console.log("게임 중 플레이어 나감 감지:", {
        roomStatus: gameStateManager.currentRoom.status,
        gameOver: gameStateManager.gameState.gameOver,
        leftPlayerId: data.playerId
      });
      
      // 나간 플레이어가 상대방인지 확인
      const leftPlayerSide = this.getPlayerSide(data.playerId);
      const currentPlayerSide = gameStateManager.currentPlayer.side;
      
      console.log("플레이어 사이드 확인:", {
        leftPlayerSide,
        currentPlayerSide,
        leftPlayerId: data.playerId,
        currentPlayerId: gameStateManager.currentPlayer.id
      });
      
      if (leftPlayerSide && leftPlayerSide !== currentPlayerSide) {
        console.log("상대방이 나감 - 자동 승리 처리 시작");
        // 상대방이 나갔으므로 현재 플레이어가 승리
        this.handleOpponentDisconnect(currentPlayerSide);
        return; // 일반적인 플레이어 나가기 처리는 건너뛰기
      }
    }

    // 방장이 나간 경우 새로운 방장 설정
    if (data.newOwner) {
      const newOwner = gameStateManager.waitingState.players.find(
        (p) => p.playerId === data.newOwner
      );
      if (newOwner) {
        chatSystem.addSystemMessage(
          `${newOwner.playerName}님이 새로운 방장이 되었습니다.`
        );
        if (newOwner.playerId === gameStateManager.currentPlayer.id) {
          gameStateManager.setCurrentPlayer({ isOwner: true });
          uiManager.updateStartButton();
        }
      }
    }
  }

  handlePlayerReady(data) {
    if (data.isReady) {
      gameStateManager.waitingState.readyPlayers.add(data.playerId);
    } else {
      gameStateManager.waitingState.readyPlayers.delete(data.playerId);
    }
    uiManager.updatePlayersList();
    uiManager.updateStartButton();

    const player = gameStateManager.waitingState.players.find(
      (p) => p.playerId === data.playerId
    );
    if (player) {
      const action = data.isReady ? "준비 완료" : "준비 취소";
      chatSystem.addSystemMessage(
        `${player.playerName}님이 ${action}했습니다.`
      );
    }

    // 디버깅을 위한 로그
    console.log("플레이어 준비 상태 변경:", {
      playerId: data.playerId,
      isReady: data.isReady,
      readyPlayers: Array.from(gameStateManager.waitingState.readyPlayers),
      players: gameStateManager.waitingState.players,
      canStart: gameStateManager.canStartGame(),
      isOwner: gameStateManager.currentPlayer.isOwner,
    });
  }

  handlePlayerUnready(data) {
    // handlePlayerReady와 동일한 로직으로 처리
    this.handlePlayerReady(data);
  }

  handleGameStarted(data) {
    gameStateManager.setCurrentRoom({ status: "playing" });
    gameStateManager.updateGameState({
      gameId: data.gameId,
      turn: data.initialTurn,
      pieces: data.gameState.pieces,
      gameOver: false,
    });

    // 플레이어 정보 업데이트
    gameStateManager.updateWaitingState({ players: data.players });
    const player = data.players.find(
      (p) => p.playerId === gameStateManager.currentPlayer.id
    );
    if (player) {
      gameStateManager.setCurrentPlayer({ side: player.side });
    }

    uiManager.showScreen("game-screen");
    gameLogic.initGame();
    // 게임 시작 시 상태 메시지 초기화
    gameLogic.clearStatusMessage();
    chatSystem.addSystemMessage("게임이 시작되었습니다!");
  }

  handleSticksRolled(data) {
    gameStateManager.updateGameState({
      roll: data.roll,
      turn: data.turn,
    });

    // 주사위 UI 업데이트
    gameLogic.updateSticksUI(data.faces);
    gameLogic.updateTurnUI();

    if (data.canMove) {
      gameLogic.highlightMovablePieces();
    } else {
      gameLogic.passTurnIfNoMoves();
    }
    
    // 디버깅을 위한 로그
    console.log("막대기 굴림:", {
      roll: data.roll,
      turn: data.turn,
      canMove: data.canMove,
      faces: data.faces
    });
  }

  handlePieceMoved(data) {
    const move = data.move;
    
    // 추가 턴인 경우 roll 값을 null로 초기화하여 다시 주사위를 굴릴 수 있게 함
    const rollValue = move.extraTurn ? null : data.gameState.roll;
    
    gameStateManager.updateGameState({
      pieces: data.gameState.pieces,
      turn: data.gameState.turn,
      roll: rollValue,
      gameOver: data.gameState.gameOver,
    });

    // 말 이동 애니메이션
    gameLogic.animateMove(move.from, move.to, move.side, () => {
      gameLogic.draw();
      gameLogic.updateTurnUI();

      if (move.captured) {
        chatSystem.addSystemMessage(
          `${move.side === "W" ? "흰말" : "검은말"}이 상대방 말을 잡았습니다!`
        );
      }

      if (move.extraTurn) {
        chatSystem.addSystemMessage(
          `${move.side === "W" ? "흰말" : "검은말"} 추가턴!`
        );
      }
      
      // 디버깅을 위한 로그
      console.log("말 이동 완료:", {
        move: move,
        newTurn: data.gameState.turn,
        newRoll: rollValue,
        extraTurn: move.extraTurn
      });
    });
  }

  handleTurnChanged(data) {
    gameStateManager.updateGameState({ 
      turn: data.newTurn,
      roll: null  // 턴이 바뀔 때 roll 값 초기화
    });
    gameLogic.updateTurnUI();
    
    // 내 차례가 돌아왔을 때만 상태 메시지 초기화
    if (data.newTurn === gameStateManager.currentPlayer.side) {
      gameLogic.clearStatusMessage();
    }
    
    chatSystem.addSystemMessage(
      `${data.newTurn === "W" ? "흰말" : "검은말"} 차례입니다.`
    );
  }

  handlePassTurn(data) {
    // 턴 패스 처리 - 서버에서 자동으로 턴을 변경해줄 것으로 예상
    console.log("턴 패스 처리:", data);
    
    // 상태 메시지 업데이트
    const statusEl = document.getElementById("status");
    if (statusEl) {
      statusEl.textContent = `${data.turn === "W" ? "흰말" : "검은말"} 이동 불가 — 턴을 넘깁니다.`;
    }
    
    // 잠시 후 메시지 지우기
    setTimeout(() => {
      if (statusEl) statusEl.textContent = "";
    }, 2000);
  }

  handleGameEnded(data) {
    gameStateManager.updateGameState({
      gameOver: true,
      pieces: data.finalState.pieces,
    });

    const winner = data.winner === "W" ? "흰말" : "검은말";
    const winnerName = data.winnerName;

    uiManager.showMessage(`${winnerName} (${winner}) 승리!`, "success");
    chatSystem.addSystemMessage(
      `게임이 종료되었습니다. ${winnerName}님이 승리했습니다!`
    );

    // UI 매니저를 통해 게임 종료 상태 표시 (팝업 포함)
    uiManager.showGameOverState(winnerName, data.winner, "normal");

    // 팝업이 닫힌 후 대기실로 돌아가기 (팝업 확인 버튼 클릭 시)
    const popup = document.getElementById("victory-popup");
    if (popup) {
      popup.addEventListener("close", () => {
        uiManager.showWaitingRoom();
      }, { once: true });
    } else {
      // 팝업이 없는 경우 3초 후 대기실로 돌아가기
      setTimeout(() => {
        uiManager.showWaitingRoom();
      }, 3000);
    }
  }

  handleGameReset(data) {
    gameStateManager.resetGame();
    gameStateManager.updateGameState({ gameId: data.newGameId });

    gameLogic.draw();
    gameLogic.updateTurnUI();
    chatSystem.addSystemMessage("게임이 리셋되었습니다.");
  }

  handleChatReceived(data) {
    chatSystem.addPlayerMessage(
      data.message,
      data.playerName,
      data.playerId === gameStateManager.currentPlayer.id
    );
  }

  handlePlayerStatus(data) {
    console.log("PLAYER_STATUS 메시지 수신:", data);
    
    if (data.status === "disconnected") {
      chatSystem.addSystemMessage("플레이어가 연결이 끊어졌습니다.");
    } else if (data.status === "connected") {
      chatSystem.addSystemMessage("플레이어가 다시 연결되었습니다.");
    } else if (data.status === "left_room") {
      // 플레이어가 방을 나간 경우 PLAYER_LEFT와 동일하게 처리
      console.log("플레이어가 방을 나감:", data);
      this.handlePlayerLeft({
        playerId: data.playerId,
        playerName: "Unknown", // 서버에서 이름을 보내지 않으므로 임시로 Unknown
        newOwner: null // 필요시 추가 로직으로 처리
      });
    } else if (data.status === "game_cancelled") {
      chatSystem.addSystemMessage("게임이 취소되었습니다.");
    } else if (data.status === "new_owner") {
      chatSystem.addSystemMessage("새로운 방장이 지정되었습니다.");
    }
  }

  handleError(data) {
    uiManager.showMessage(`에러: ${data.message}`, "error");
    console.error("서버 에러:", data);
  }

  // 플레이어 ID로 사이드 찾기
  getPlayerSide(playerId) {
    const player = gameStateManager.waitingState.players.find(
      (p) => p.playerId === playerId
    );
    return player ? player.side : null;
  }

  // 상대방 연결 끊김 처리
  handleOpponentDisconnect(winnerSide) {
    console.log("handleOpponentDisconnect 호출됨:", winnerSide);
    
    // 게임 상태를 종료로 설정
    gameStateManager.updateGameState({ gameOver: true });
    
    // 승리 메시지 표시
    const winnerName = gameStateManager.currentPlayer.name;
    const winnerSideName = winnerSide === "W" ? "흰말" : "검은말";
    
    uiManager.showMessage(
      `🎉 승리! 상대방이 나가서 ${winnerName}님 (${winnerSideName})이 승리했습니다!`, 
      "success"
    );
    
    // 채팅에 시스템 메시지 추가
    chatSystem.addSystemMessage(
      `게임이 종료되었습니다. 상대방이 나가서 ${winnerName}님이 승리했습니다!`
    );
    
    // UI 매니저를 통해 게임 종료 상태 표시 (팝업 포함)
    uiManager.showGameOverState(winnerName, winnerSide, "opponent_left");
    
    // 팝업이 닫힌 후 대기실로 돌아가기 (팝업 확인 버튼 클릭 시)
    const popup = document.getElementById("victory-popup");
    if (popup) {
      popup.addEventListener("close", () => {
        uiManager.showWaitingRoom();
      }, { once: true });
    } else {
      // 팝업이 없는 경우 5초 후 대기실로 돌아가기
      setTimeout(() => {
        uiManager.showWaitingRoom();
      }, 5000);
    }
  }
}

// 싱글톤 인스턴스 생성
export const wsManager = new WebSocketManager();
