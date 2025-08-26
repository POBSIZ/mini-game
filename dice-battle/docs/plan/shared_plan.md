## 🧱 공통 상태/공유 모듈 개발 계획

### 범위

- 상태 트리 스키마 고정 및 초기화, RNG/이벤트 버스/가드/복제 유틸

### 작업

1. 상태 스키마 구현: `players`, `round`, `decks`, `scheduled`, `log`
2. 유틸 구현: `rng.js`, `events.js`, `guards.js`, `clone.js`
3. 공통 가드: 에너지 부족, 카드 사용 제한, 방어막 상한
4. 초기화: 시드 고정 셔플 및 초기 덱 구성

### API

- `createInitialState(config, seed)`
- `on/off/emit` from `events.js`

### 완료 기준

- 구조 문서 일치: `../structure/common_state_and_shared_modules.md`, `../structure/coding_conventions.md`
- 규칙서/AI 참조: `../game/dice_battle_rule.md`, `../game/ai_strategy_guide.md`
