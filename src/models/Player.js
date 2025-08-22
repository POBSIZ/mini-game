class Player {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.score = 0;
    this.roundScores = [];
    this.items = [];
    this.isActive = false;
    this.isHost = false;
    this.avatar = this.generateAvatar();
    this.stats = {
      totalGames: 0,
      wins: 0,
      totalScore: 0,
      bestScore: 0
    };
  }

  // 아바타 생성 (이모지 기반)
  generateAvatar() {
    const avatars = ['🎮', '🎲', '⚔️', '🛡️', '⭐', '🔥', '💎', '🌟'];
    return avatars[Math.floor(Math.random() * avatars.length)];
  }

  // 주사위 굴리기
  rollDice() {
    return Math.floor(Math.random() * 6) + 1;
  }

  // 점수 추가
  addScore(points) {
    this.score += points;
    this.stats.totalScore += points;
    if (this.score > this.stats.bestScore) {
      this.stats.bestScore = this.score;
    }
  }

  // 라운드 점수 기록
  addRoundScore(roundScore) {
    this.roundScores.push(roundScore);
    this.addScore(roundScore);
  }

  // 아이템 사용
  useItem(itemId) {
    const itemIndex = this.items.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
      const item = this.items[itemIndex];
      this.items.splice(itemIndex, 1);
      return item;
    }
    return null;
  }

  // 아이템 획득
  addItem(item) {
    this.items.push(item);
  }

  // 게임 통계 업데이트
  updateStats(gameWon, finalScore) {
    this.stats.totalGames++;
    if (gameWon) {
      this.stats.wins++;
    }
    this.stats.totalScore += finalScore;
  }

  // 게임 리셋
  resetGame() {
    this.score = 0;
    this.roundScores = [];
    this.items = [];
    this.isActive = false;
  }

  // 플레이어 정보 반환
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      avatar: this.avatar,
      score: this.score,
      roundScores: this.roundScores,
      items: this.items,
      isActive: this.isActive,
      isHost: this.isHost,
      stats: this.stats
    };
  }
}

module.exports = Player;
