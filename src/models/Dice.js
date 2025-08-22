class Dice {
  constructor(type = 'normal') {
    this.type = type; // normal, attack, defense, bonus
    this.sides = 6;
    this.isUsed = false;
  }

  // 주사위 굴리기
  roll() {
    if (this.isUsed) {
      return null; // 이미 사용된 주사위
    }
    
    const result = Math.floor(Math.random() * this.sides) + 1;
    
    // 특수 주사위는 사용 후 비활성화
    if (this.type !== 'normal') {
      this.isUsed = true;
    }
    
    return {
      value: result,
      type: this.type,
      effect: this.getSpecialEffect(result)
    };
  }

  // 특수 효과 반환
  getSpecialEffect(value) {
    switch (this.type) {
      case 'attack':
        return {
          type: 'attack',
          damage: 2,
          description: `상대 플레이어 점수 -${2}`
        };
      
      case 'defense':
        return {
          type: 'defense',
          protection: 2,
          description: `공격 효과 무효화`
        };
      
      case 'bonus':
        return {
          type: 'bonus',
          bonus: value,
          description: `+${value} 추가 점수`
        };
      
      default:
        return null;
    }
  }

  // 주사위 재활성화
  reset() {
    this.isUsed = false;
  }

  // 주사위 정보 반환
  getInfo() {
    return {
      type: this.type,
      sides: this.sides,
      isUsed: this.isUsed
    };
  }

  // 주사위 타입별 이모지
  getEmoji() {
    const emojis = {
      normal: '🎲',
      attack: '⚡',
      defense: '🛡️',
      bonus: '⭐'
    };
    return emojis[this.type] || '🎲';
  }

  // 주사위 타입별 이름
  getTypeName() {
    const names = {
      normal: '일반 주사위',
      attack: '공격 주사위',
      defense: '방어 주사위',
      bonus: '보너스 주사위'
    };
    return names[this.type] || '알 수 없는 주사위';
  }
}

module.exports = Dice;
