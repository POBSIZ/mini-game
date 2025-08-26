## 🃏 카드 시스템 개발 계획

### 범위

- 카드 덱 관리, 게이지 획득/지급, 사용 시점/제약 검증, 효과 적용

### 작업

1. 덱/버림 관리: `drawCard`, `discardCard`
2. 게이지 처리: 조건 평가/이월, 5 도달 시 지급
3. 사용 검증: `canPlay(state, card, timing)`
4. 사용 처리: `playCard(state, card, timing)`

### API

- `src/systems/cards.js`

### 완료 기준

- 구조 문서 일치: `../structure/card_system.md`
- 규칙서 참조: `../game/dice_battle_rule.md#전략-카드-시스템`
