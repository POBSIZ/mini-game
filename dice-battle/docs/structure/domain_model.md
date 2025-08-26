## 🧩 도메인 모델

규칙과 AI 가이드를 반영한 핵심 엔티티와 관계입니다.

### 엔티티

- Game
  - 라운드 수, 현재 라운드, 총점(플레이어/AI), 이벤트 예약 큐(🍀/🌙/🎲), 기록(Log)
- Round
  - 성향 선언, 라운드 점수(임시), 사용 카드 목록(최대 2), 주사위 결과, 처리 단계 상태
- Player
  - 에너지(≤10), 방어막(0~2), 카드 인벤토리, 카드 게이지(0~5−), 성향, 정보 가시성
- Dice
  - 결과값(1~6), 특수효과(공격⚡/화염🔥/더블🎯, 방어🛡️/보너스⭐)
- CardDeck
  - 덱/버림/확률, 카드 종류(공격/방어/부스트/스틸/리셋)
- EventDeck
  - 덱/버림, 이벤트 종류(긍정/부정/중립, 없음 포함)
- Shield
  - 현재 보유 수, 차단 처리(차단 가능/불가/부분)
- Energy
  - 현재치, 획득/소모 로직(최대치 보정 포함)
- Gauge
  - 누적 규칙(같은 눈금/연속 6/누적 점수/연승·연패), 이월 처리
- Score
  - 라운드 점수, 총점, 최솟값 보장, 동점 규칙

### 관계 및 제약

- Player 1—N Card, 1—1 Gauge, 1—1 Shield, 1—1 Energy
- Game 1—N Round, 1—1 EventDeck, 1—1 CardDeck
- Round 진행 중 카드 사용: 라운드당 2장, 같은 종류 1장, 시점 제약(사전: 방어/부스트, 사후: 공격/스틸/리셋)
- 방어막 차단: ⚔️공격, ⚡공격, 🔥(이번 라운드 -3만), 🦹스틸만 차단

### 상태 전이(요약)

1. 성향 선언 → 2. 사전 카드 → 3. 주사위 → 4. 사후 카드 → 5. 점수 계산 → 6. 방어막 판정 → 7. 이벤트 → 8. 누적/기록

### 구현 가이드 (순수 JS)

- 파일 배치
  - `src/core/state.js`: 초기 상태/업데이트 헬퍼
  - `src/domain/models.js`: JSDoc 타입 정의와 팩토리
- 팩토리 예시

```js
// src/domain/models.js
/** @typedef {{energy:number, shields:number, cards:object[], gauge:number, score:number}} Player */
export function createPlayer() { return { energy: 0, shields: 0, cards: [], gauge: 0, score: 1 }; }
export function createGame(config) { return { round: 1, totalRounds: config.rounds, scheduled: {}, log: [] }; }
```

- 업데이트 헬퍼

```js
// src/core/state.js
export function withPatch(state, patch) { return { ...state, ...patch }; }
export function updatePlayer(state, which, patch) {
  const players = { ...state.players, [which]: { ...state.players[which], ...patch } };
  return { ...state, players };
}
```
