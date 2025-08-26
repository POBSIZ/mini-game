## 📈 점수/계산 시스템 개발 계획

### 범위

- 라운드 점수 계산 파이프라인과 총점 반영, 동점 규칙

### 작업

1. 단계 함수 구현: `applyBase`, `applyBonuses`, `applySpecialDice`, `applyCards`, `applyShields`, `applyEvents`, `finalize`
2. 파이프 오케스트레이션: `computeRoundScore(state, ctx)`
3. 동점 규칙 처리: 마지막 라운드 점수 → 에너지 → 카드 수 → 무승부

### API

- `src/systems/scoring.js`

### 완료 기준

- 구조 문서 일치: `../structure/scoring_system.md`
- 규칙서 참조: `../game/dice_battle_rule.md#점수-시스템`
