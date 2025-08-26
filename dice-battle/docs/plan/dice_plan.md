## 🎲 주사위 시스템 개발 계획

### 범위

- 주사위 굴림, 성향 판정, 특수 효과 도메인 이벤트

### 작업

1. `rollDice(rng)`
2. `resolveTendency(tendency, roll)`
3. `resolveSpecial(tendency, roll, rng)`
4. 특수 이벤트 방출 및 로그 기록

### API

- `src/systems/dice.js` 내 공개 함수 3종

### 완료 기준

- 구조 문서 일치: `../structure/dice_system.md`
- 규칙서 참조: `../game/dice_battle_rule.md#주사위-시스템`
