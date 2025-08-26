## 🎭 이벤트 시스템 개발 계획

### 범위

- 이벤트 덱, 즉시/지연 효과 적용, 예약/틱 훅

### 작업

1. `drawEvent(state)`
2. `applyImmediate(state, event)`
3. `scheduleDelayed(state, event)`
4. `tickDelayed(state)` (라운드 시작/주사위 직후 훅)

### API

- `src/systems/events.js`

### 완료 기준

- 구조 문서 일치: `../structure/event_system.md`
- 규칙서 참조: `../game/dice_battle_rule.md#랜덤-이벤트-시스템`
