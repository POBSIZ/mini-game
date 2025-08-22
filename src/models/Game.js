const Player = require('./Player');
const Dice = require('./Dice');
const Event = require('./Event');

class Game {
  constructor(players = [], rounds = 5, gameMode = 'basic') {
    this.id = this.generateGameId();
    this.players = players;
    this.maxRounds = rounds;
    this.currentRound = 1;
    this.currentPlayerIndex = 0;
    this.gameState = 'waiting'; // waiting, playing, finished
    this.gameMode = gameMode; // basic, strategy, tournament, cooperative
    this.eventSystem = new Event();
    this.gameHistory = [];
    this.currentEvent = null;
    this.specialEffects = {
      doubleRoll: false,
      doubleScore: false
    };
    
    // 게임 설정
    this.settings = {
      allowSpecialDice: gameMode !== 'basic',
      allowEvents: gameMode !== 'basic',
      allowItems: gameMode === 'strategy',
      timeLimit: gameMode === 'tournament' ? 30 : null
    };
    
    this.initializeGame();
  }

  // 게임 ID 생성
  generateGameId() {
    return 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 게임 초기화
  initializeGame() {
    if (this.players.length > 0) {
      this.players[0].isHost = true;
      this.players.forEach(player => player.resetGame());
    }
  }

  // 플레이어 추가
  addPlayer(name) {
    const playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const player = new Player(playerId, name);
    
    if (this.players.length === 0) {
      player.isHost = true;
    }
    
    this.players.push(player);
    return player;
  }

  // 게임 시작
  startGame() {
    if (this.players.length < 2) {
      throw new Error('게임을 시작하려면 최소 2명의 플레이어가 필요합니다.');
    }
    
    this.gameState = 'playing';
    this.currentRound = 1;
    this.currentPlayerIndex = 0;
    this.players.forEach(player => player.isActive = true);
    
    // 첫 번째 플레이어 활성화
    this.players[this.currentPlayerIndex].isActive = true;
    
    return {
      message: '🎮 게임이 시작되었습니다!',
      currentPlayer: this.players[this.currentPlayerIndex].name,
      round: this.currentRound
    };
  }

  // 주사위 굴리기
  rollDice(playerId, diceType = 'normal') {
    const player = this.players.find(p => p.id === playerId);
    if (!player || !player.isActive) {
      throw new Error('현재 턴이 아닙니다.');
    }

    // 주사위 생성 및 굴리기
    const dice = new Dice(diceType);
    const rollResult = dice.roll();
    
    if (!rollResult) {
      throw new Error('주사위를 사용할 수 없습니다.');
    }

    let finalScore = rollResult.value;
    let specialMessage = '';

    // 특수 효과 처리
    if (rollResult.effect) {
      switch (rollResult.effect.type) {
        case 'attack':
          const targetPlayer = this.getRandomTargetPlayer(playerId);
          if (targetPlayer) {
            targetPlayer.score = Math.max(0, targetPlayer.score - rollResult.effect.damage);
            specialMessage = `⚡ ${targetPlayer.name}의 점수가 ${rollResult.effect.damage}점 감소했습니다!`;
          }
          break;
        
        case 'bonus':
          finalScore += rollResult.effect.bonus;
          specialMessage = `⭐ 보너스 ${rollResult.effect.bonus}점을 받았습니다!`;
          break;
      }
    }

    // 골든 주사위 효과 적용
    if (this.specialEffects.doubleScore) {
      finalScore *= 2;
      specialMessage += ' 🎯 골든 주사위 효과로 점수가 2배가 되었습니다!';
      this.specialEffects.doubleScore = false;
    }

    // 점수 기록
    player.addRoundScore(finalScore);

    // 게임 히스토리에 기록
    this.gameHistory.push({
      round: this.currentRound,
      player: player.name,
      diceType: diceType,
      rollValue: rollResult.value,
      finalScore: finalScore,
      specialMessage: specialMessage,
      timestamp: new Date()
    });

    return {
      rollResult: rollResult,
      finalScore: finalScore,
      specialMessage: specialMessage,
      playerScore: player.score,
      roundScore: player.roundScores[player.roundScores.length - 1]
    };
  }

  // 다음 턴으로 이동
  nextTurn() {
    this.players[this.currentPlayerIndex].isActive = false;
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.players[this.currentPlayerIndex].isActive = true;

    // 모든 플레이어가 턴을 마쳤는지 확인
    if (this.currentPlayerIndex === 0) {
      return this.endRound();
    }

    return {
      message: `🎲 ${this.players[this.currentPlayerIndex].name}의 턴입니다!`,
      currentPlayer: this.players[this.currentPlayerIndex].name,
      round: this.currentRound
    };
  }

  // 라운드 종료
  endRound() {
    // 라운드 점수 순위 계산
    const roundRanking = this.calculateRoundRanking();
    
    // 랜덤 이벤트 발생 확인
    let eventResult = null;
    if (this.settings.allowEvents && this.eventSystem.shouldTriggerEvent()) {
      const randomEvent = this.eventSystem.getRandomEvent();
      eventResult = this.eventSystem.executeEvent(randomEvent.id, this.players);
      this.currentEvent = randomEvent;
    }

    // 보너스 점수 계산
    this.calculateBonusScores();

    // 라운드 정보 저장
    const roundInfo = {
      round: this.currentRound,
      ranking: roundRanking,
      event: eventResult,
      playerScores: this.players.map(p => ({
        name: p.name,
        score: p.score,
        roundScore: p.roundScores[p.roundScores.length - 1]
      }))
    };

    this.currentRound++;
    
    // 게임 종료 확인
    if (this.currentRound > this.maxRounds) {
      return this.endGame();
    }

    // 다음 라운드 시작
    this.currentPlayerIndex = 0;
    this.players.forEach(player => player.isActive = false);
    this.players[0].isActive = true;

    return {
      message: `🎯 라운드 ${this.currentRound - 1}이 종료되었습니다!`,
      roundInfo: roundInfo,
      nextRound: this.currentRound,
      currentPlayer: this.players[0].name
    };
  }

  // 라운드 순위 계산
  calculateRoundRanking() {
    const playerScores = this.players.map(player => ({
      name: player.name,
      score: player.score,
      roundScore: player.roundScores[player.roundScores.length - 1]
    }));

    return playerScores.sort((a, b) => b.score - a.score);
  }

  // 보너스 점수 계산
  calculateBonusScores() {
    this.players.forEach(player => {
      let bonus = 0;

      // 연속 6점 보너스
      if (player.roundScores.length >= 3) {
        const lastThree = player.roundScores.slice(-3);
        if (lastThree.every(score => score === 6)) {
          bonus += 5;
        }
      }

      // 패턴 보너스 (1,2,3 또는 4,5,6)
      if (player.roundScores.length >= 3) {
        const lastThree = player.roundScores.slice(-3);
        if (JSON.stringify(lastThree) === JSON.stringify([1, 2, 3]) ||
            JSON.stringify(lastThree) === JSON.stringify([4, 5, 6])) {
          bonus += 3;
        }
      }

      // 균형잡힌 점수 보너스
      if (player.roundScores.length >= 2) {
        const maxDiff = Math.max(...player.roundScores) - Math.min(...player.roundScores);
        if (maxDiff <= 2) {
          bonus += 2;
        }
      }

      if (bonus > 0) {
        player.addScore(bonus);
      }
    });
  }

  // 게임 종료
  endGame() {
    this.gameState = 'finished';
    
    // 최종 순위 계산
    const finalRanking = this.calculateFinalRanking();
    
    // 승자 결정
    const winner = finalRanking[0];
    winner.updateStats(true, winner.score);
    
    // 다른 플레이어들 통계 업데이트
    this.players.forEach(player => {
      if (player.id !== winner.id) {
        player.updateStats(false, player.score);
      }
    });

    return {
      message: `🏆 게임이 종료되었습니다!`,
      winner: winner.name,
      finalRanking: finalRanking,
      gameStats: {
        totalRounds: this.maxRounds,
        totalPlayers: this.players.length,
        gameMode: this.gameMode
      }
    };
  }

  // 최종 순위 계산
  calculateFinalRanking() {
    const playerScores = this.players.map(player => ({
      name: player.name,
      score: player.score,
      roundScores: player.roundScores
    }));

    return playerScores.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // 동점 시 마지막 라운드 점수 비교
      const aLastScore = a.roundScores[a.roundScores.length - 1] || 0;
      const bLastScore = b.roundScores[b.roundScores.length - 1] || 0;
      return bLastScore - aLastScore;
    });
  }

  // 랜덤 타겟 플레이어 선택
  getRandomTargetPlayer(excludePlayerId) {
    const availablePlayers = this.players.filter(p => p.id !== excludePlayerId);
    if (availablePlayers.length === 0) return null;
    return availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
  }

  // 게임 정보 반환
  getGameInfo() {
    return {
      id: this.id,
      gameState: this.gameState,
      currentRound: this.currentRound,
      maxRounds: this.maxRounds,
      currentPlayer: this.players[this.currentPlayerIndex]?.name,
      players: this.players.map(p => p.getInfo()),
      gameMode: this.gameMode,
      settings: this.settings,
      currentEvent: this.currentEvent
    };
  }

  // 게임 상태 확인
  isGameFinished() {
    return this.gameState === 'finished';
  }

  // 게임 재시작
  restartGame() {
    this.currentRound = 1;
    this.currentPlayerIndex = 0;
    this.gameState = 'waiting';
    this.gameHistory = [];
    this.currentEvent = null;
    this.specialEffects = { doubleRoll: false, doubleScore: false };
    
    this.players.forEach(player => {
      player.resetGame();
      player.isHost = false;
    });
    
    if (this.players.length > 0) {
      this.players[0].isHost = true;
    }
  }
}

module.exports = Game;
