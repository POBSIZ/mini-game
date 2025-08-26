## 🤖 AI 시스템 개발 계획

### 범위

- 난이도 파라미터 테이블, 성향/카드 의사결정, 정보 경계 준수

### 작업

1. 파라미터 정의: `src/ai/params.js` (Easy/Normal/Hard)
2. 성향 결정: `decideTendency(state, params)`
3. 사전 카드: `decidePreCards(state, params)`
4. 사후 카드: `decidePostCards(state, params)`
5. 일관성 점검: 라운드당 2장, 같은 종류 1장, 시점 제약

### API

- `src/ai/{params.js,selector.js,policy.js}`

### 완료 기준

- 구조 문서 일치: `../structure/ai_system.md`
- 규칙서/가이드 참조: `../game/dice_battle_rule.md`, `../game/ai_strategy_guide.md`
