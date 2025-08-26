## 🛡️ 방어막 시스템 개발 계획

### 범위

- 방어막 생성/상한, 차단 규칙, 소모/우선순위 처리

### 작업

1. `addShield(state, n)` (최대 2)
2. `canBlock(effect)` 규칙 고정
3. `consumeShield(state)`로 차단 적용 및 로그 기록

### API

- `src/systems/shield.js`

### 완료 기준

- 구조 문서 일치: `../structure/shield_system.md`
- 규칙서 참조: `../game/dice_battle_rule.md#방어막-시스템`
