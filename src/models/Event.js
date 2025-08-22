class Event {
  constructor() {
    this.events = [
      {
        id: 'bomb',
        name: '폭탄! 💣',
        description: '모든 플레이어 점수 절반 감소',
        probability: 0.15,
        effect: (players) => {
          players.forEach(player => {
            const currentScore = player.score;
            player.score = Math.floor(currentScore / 2);
          });
          return { message: '💣 폭탄! 모든 플레이어의 점수가 절반으로 감소했습니다!' };
        }
      },
      {
        id: 'lucky_goddess',
        name: '행운의 여신 🍀',
        description: '주사위 2번 굴려 높은 값 선택',
        probability: 0.20,
        effect: (players) => {
          return { 
            message: '🍀 행운의 여신이 나타났습니다! 이번 라운드에 주사위를 2번 굴릴 수 있습니다!',
            special: 'double_roll'
          };
        }
      },
      {
        id: 'thief',
        name: '도둑 🦹',
        description: '상대 플레이어 점수 일부 훔치기',
        probability: 0.15,
        effect: (players) => {
          const activePlayers = players.filter(p => p.isActive);
          if (activePlayers.length < 2) return { message: '도둑 이벤트가 발생했지만 적용할 수 없습니다.' };
          
          const thief = activePlayers[Math.floor(Math.random() * activePlayers.length)];
          const victims = activePlayers.filter(p => p.id !== thief.id);
          const victim = victims[Math.floor(Math.random() * victims.length)];
          
          const stolenPoints = Math.floor(victim.score / 3);
          victim.score -= stolenPoints;
          thief.score += stolenPoints;
          
          return { 
            message: `🦹 도둑이 나타났습니다! ${victim.name}의 점수 ${stolenPoints}점을 ${thief.name}가 훔쳤습니다!`
          };
        }
      },
      {
        id: 'star_blessing',
        name: '별의 축복 ⭐',
        description: '모든 플레이어 +1점',
        probability: 0.25,
        effect: (players) => {
          players.forEach(player => {
            player.score += 1;
          });
          return { message: '⭐ 별의 축복! 모든 플레이어가 1점을 받았습니다!' };
        }
      },
      {
        id: 'time_reverse',
        name: '시간 역행 ⏰',
        description: '이전 라운드 점수로 되돌리기',
        probability: 0.10,
        effect: (players) => {
          players.forEach(player => {
            if (player.roundScores.length > 1) {
              const previousScore = player.roundScores[player.roundScores.length - 2];
              const currentScore = player.roundScores[player.roundScores.length - 1];
              player.score = player.score - currentScore + previousScore;
              player.roundScores[player.roundScores.length - 1] = previousScore;
            }
          });
          return { message: '⏰ 시간이 역행되었습니다! 이전 라운드의 점수로 되돌렸습니다!' };
        }
      },
      {
        id: 'golden_dice',
        name: '골든 주사위 🎯',
        description: '이번 턴 점수 2배',
        probability: 0.15,
        effect: (players) => {
          return { 
            message: '🎯 골든 주사위! 이번 턴에 굴린 주사위 점수가 2배가 됩니다!',
            special: 'double_score'
          };
        }
      }
    ];
  }

  // 랜덤 이벤트 발생 여부 확인
  shouldTriggerEvent() {
    return Math.random() < 0.20; // 20% 확률
  }

  // 랜덤 이벤트 선택
  getRandomEvent() {
    const availableEvents = this.events.filter(event => Math.random() < event.probability);
    if (availableEvents.length === 0) {
      return this.events[Math.floor(Math.random() * this.events.length)];
    }
    return availableEvents[Math.floor(Math.random() * availableEvents.length)];
  }

  // 이벤트 실행
  executeEvent(eventId, players) {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      return event.effect(players);
    }
    return { message: '알 수 없는 이벤트입니다.' };
  }

  // 모든 이벤트 정보 반환
  getAllEvents() {
    return this.events.map(event => ({
      id: event.id,
      name: event.name,
      description: event.description,
      probability: event.probability
    }));
  }

  // 특정 이벤트 정보 반환
  getEventInfo(eventId) {
    const event = this.events.find(e => e.id === eventId);
    return event ? {
      id: event.id,
      name: event.name,
      description: event.description,
      probability: event.probability
    } : null;
  }
}

module.exports = Event;
