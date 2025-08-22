const Game = require('../models/Game');
const Player = require('../models/Player');

class GameService {
  constructor() {
    this.games = new Map(); // 게임 ID -> 게임 인스턴스
    this.playerGames = new Map(); // 플레이어 ID -> 게임 ID
  }

  // 새 게임 생성
  createGame(hostName, rounds = 5, gameMode = 'basic') {
    const game = new Game([], rounds, gameMode);
    const host = game.addPlayer(hostName);
    
    this.games.set(game.id, game);
    this.playerGames.set(host.id, game.id);
    
    return {
      gameId: game.id,
      host: host.getInfo(),
      gameInfo: game.getGameInfo()
    };
  }

  // 게임 참가
  joinGame(gameId, playerName) {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('게임을 찾을 수 없습니다.');
    }
    
    if (game.gameState !== 'waiting') {
      throw new Error('이미 시작된 게임입니다.');
    }
    
    if (game.players.length >= 6) {
      throw new Error('게임이 가득 찼습니다.');
    }
    
    const player = game.addPlayer(playerName);
    this.playerGames.set(player.id, gameId);
    
    return {
      player: player.getInfo(),
      gameInfo: game.getGameInfo()
    };
  }

  // 게임 시작
  startGame(gameId, hostId) {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('게임을 찾을 수 없습니다.');
    }
    
    const host = game.players.find(p => p.id === hostId);
    if (!host || !host.isHost) {
      throw new Error('게임을 시작할 권한이 없습니다.');
    }
    
    if (game.players.length < 2) {
      throw new Error('게임을 시작하려면 최소 2명의 플레이어가 필요합니다.');
    }
    
    const result = game.startGame();
    
    return {
      ...result,
      gameInfo: game.getGameInfo()
    };
  }

  // 주사위 굴리기
  rollDice(gameId, playerId, diceType = 'normal') {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('게임을 찾을 수 없습니다.');
    }
    
    if (game.gameState !== 'playing') {
      throw new Error('게임이 진행 중이 아닙니다.');
    }
    
    const result = game.rollDice(playerId, diceType);
    
    return {
      ...result,
      gameInfo: game.getGameInfo()
    };
  }

  // 다음 턴으로 이동
  nextTurn(gameId) {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('게임을 찾을 수 없습니다.');
    }
    
    if (game.gameState !== 'playing') {
      throw new Error('게임이 진행 중이 아닙니다.');
    }
    
    const result = game.nextTurn();
    
    return {
      ...result,
      gameInfo: game.getGameInfo()
    };
  }

  // 게임 정보 조회
  getGameInfo(gameId) {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('게임을 찾을 수 없습니다.');
    }
    
    return game.getGameInfo();
  }

  // 플레이어가 참가한 게임 조회
  getPlayerGame(playerId) {
    const gameId = this.playerGames.get(playerId);
    if (!gameId) {
      return null;
    }
    
    return this.getGameInfo(gameId);
  }

  // 게임 목록 조회
  getGameList() {
    return Array.from(this.games.values()).map(game => ({
      id: game.id,
      gameMode: game.gameMode,
      playerCount: game.players.length,
      gameState: game.gameState,
      currentRound: game.currentRound,
      maxRounds: game.maxRounds,
      host: game.players.find(p => p.isHost)?.name || 'Unknown'
    }));
  }

  // 대기 중인 게임 목록 조회
  getWaitingGames() {
    return this.getGameList().filter(game => game.gameState === 'waiting');
  }

  // 게임 종료
  endGame(gameId) {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('게임을 찾을 수 없습니다.');
    }
    
    if (game.gameState === 'finished') {
      return game.getGameInfo();
    }
    
    // 강제로 게임 종료
    game.gameState = 'finished';
    const result = game.endGame();
    
    // 플레이어 게임 매핑 정리
    game.players.forEach(player => {
      this.playerGames.delete(player.id);
    });
    
    return {
      ...result,
      gameInfo: game.getGameInfo()
    };
  }

  // 게임 삭제
  deleteGame(gameId) {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('게임을 찾을 수 없습니다.');
    }
    
    // 플레이어 게임 매핑 정리
    game.players.forEach(player => {
      this.playerGames.delete(player.id);
    });
    
    this.games.delete(gameId);
    
    return { message: '게임이 삭제되었습니다.' };
  }

  // 플레이어 게임에서 제거
  removePlayerFromGame(gameId, playerId) {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('게임을 찾을 수 없습니다.');
    }
    
    const playerIndex = game.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      throw new Error('플레이어를 찾을 수 없습니다.');
    }
    
    const player = game.players[playerIndex];
    game.players.splice(playerIndex, 1);
    this.playerGames.delete(playerId);
    
    // 호스트가 나간 경우 새로운 호스트 지정
    if (player.isHost && game.players.length > 0) {
      game.players[0].isHost = true;
    }
    
    // 게임 상태 업데이트
    if (game.players.length < 2 && game.gameState === 'playing') {
      game.gameState = 'waiting';
    }
    
    return {
      message: `${player.name}이(가) 게임에서 나갔습니다.`,
      gameInfo: game.getGameInfo()
    };
  }

  // 게임 재시작
  restartGame(gameId, hostId) {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('게임을 찾을 수 없습니다.');
    }
    
    const host = game.players.find(p => p.id === hostId);
    if (!host || !host.isHost) {
      throw new Error('게임을 재시작할 권한이 없습니다.');
    }
    
    game.restartGame();
    
    return {
      message: '게임이 재시작되었습니다.',
      gameInfo: game.getGameInfo()
    };
  }

  // 게임 통계 조회
  getGameStats() {
    const totalGames = this.games.size;
    const activeGames = Array.from(this.games.values()).filter(g => g.gameState === 'playing').length;
    const waitingGames = Array.from(this.games.values()).filter(g => g.gameState === 'waiting').length;
    const finishedGames = Array.from(this.games.values()).filter(g => g.gameState === 'finished').length;
    
    const totalPlayers = Array.from(this.games.values()).reduce((sum, game) => sum + game.players.length, 0);
    
    return {
      totalGames,
      activeGames,
      waitingGames,
      finishedGames,
      totalPlayers,
      averagePlayersPerGame: totalGames > 0 ? (totalPlayers / totalGames).toFixed(1) : 0
    };
  }

  // 게임 히스토리 조회
  getGameHistory(gameId) {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('게임을 찾을 수 없습니다.');
    }
    
    return game.gameHistory;
  }
}

module.exports = GameService;
