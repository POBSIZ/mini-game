// 게임 상태 관리 모듈
export class GameStateManager {
  constructor() {
    this.currentPlayer = {
      id: null,
      name: null,
      isOwner: false,
      side: null
    };
    
    this.currentRoom = {
      id: null,
      name: null,
      status: null
    };
    
    this.gameState = {
      turn: "W",
      roll: null,
      pieces: { W: [1, 3, 5, 7, 9], B: [2, 4, 6, 8, 10] },
      gameOver: false,
      gameId: null
    };
    
    this.waitingState = {
      players: [],
      readyPlayers: new Set(),
      canStart: false
    };
  }

  // 플레이어 정보 설정
  setCurrentPlayer(playerInfo) {
    this.currentPlayer = { ...this.currentPlayer, ...playerInfo };
  }

  // 방 정보 설정
  setCurrentRoom(roomInfo) {
    this.currentRoom = { ...this.currentRoom, ...roomInfo };
  }

  // 게임 상태 업데이트
  updateGameState(newState) {
    this.gameState = { ...this.gameState, ...newState };
  }

  // 대기실 상태 업데이트
  updateWaitingState(newState) {
    this.waitingState = { ...this.waitingState, ...newState };
  }

  // 플레이어 준비 상태 변경
  togglePlayerReady(playerId) {
    if (this.waitingState.readyPlayers.has(playerId)) {
      this.waitingState.readyPlayers.delete(playerId);
    } else {
      this.waitingState.readyPlayers.add(playerId);
    }
  }

  // 플레이어 추가
  addPlayer(player) {
    this.waitingState.players.push(player);
  }

  // 플레이어 제거
  removePlayer(playerId) {
    this.waitingState.players = this.waitingState.players.filter(p => p.playerId !== playerId);
    this.waitingState.readyPlayers.delete(playerId);
  }

  // 게임 리셋
  resetGame() {
    this.gameState = {
      turn: "W",
      roll: null,
      pieces: { W: [1, 3, 5, 7, 9], B: [2, 4, 6, 8, 10] },
      gameOver: false,
      gameId: null
    };
  }

  // 전체 상태 리셋
  resetAll() {
    this.currentPlayer = { id: null, name: null, isOwner: false, side: null };
    this.currentRoom = { id: null, name: null, status: null };
    this.waitingState = { players: [], readyPlayers: new Set(), canStart: false };
    this.resetGame();
  }

  // 게임 시작 가능 여부 확인
  canStartGame() {
    return this.currentPlayer.isOwner && 
           this.waitingState.players.length >= 2 && 
           this.waitingState.players.every(p => this.waitingState.readyPlayers.has(p.playerId));
  }

  // 내 차례인지 확인
  isMyTurn() {
    return this.gameState.turn === this.currentPlayer.side;
  }

  // 게임이 끝났는지 확인
  isGameOver() {
    return this.gameState.gameOver;
  }
}

// 싱글톤 인스턴스 생성
export const gameStateManager = new GameStateManager();
