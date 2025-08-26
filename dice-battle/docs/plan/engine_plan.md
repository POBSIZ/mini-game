## 🔧 엔진/게임 플로우 개발 계획

### 범위

- 라운드 단계 실행(Pre→Roll→Post→Score→Shield→Event→Accumulate)
- 이벤트 버스 연동(`phase:*`), 로그 기록
- 상태 불변 업데이트 및 제약 검증(카드 2장, 같은 종류 1장, 에너지 상한 등)

### 작업

1. 초기 상태 생성: `createInitialState(config, seed)`
2. 단계 함수 구현: `preRound`, `rollPhase`, `postCard`, `scorePhase`, `eventPhase`, `accumulate`
3. 이벤트 버스 연결: 각 단계 진입/탈출 시 `emit`
4. 오류 처리: 규칙 위반시 예외 발생

### API

- `createEngine({ rng, events })`
- `startGame(config)` / `startRound()` / `endRound()`

### 완료 기준

- 규칙서의 순서 준수: `../game/dice_battle_rule.md#점수-계산-순서`
- 구조 문서 일치: `../structure/game_flow.md`, `../structure/architecture_overview.md`
