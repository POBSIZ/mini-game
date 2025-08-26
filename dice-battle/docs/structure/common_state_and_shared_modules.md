## 🧱 공통 상태/공유 모듈 가이드 (순수 JS)

게임 전반에 걸쳐 재사용되는 상태 구조, 엔진 레벨 업데이트 원칙, 공통 유틸 모듈을 정의합니다.

### 상태 트리 (권장 스키마)

```js
// 고정 키와 타입은 JSDoc 또는 TS-Check로 문서화 권장
{
  config: { rounds: 8, mode: 'normal' },
  round: {
    index: 1,
    tendency: null, // 'attack'|'defense'|'balance'
    usedCards: [],  // {id,type,cost}[] this round
    roll: null,     // 1..6 (보너스턴 포함 시 배열 확장 가능)
    tempScore: 0
  },
  players: {
    me: { total: 1, energy: 0, shields: 0, gauge: 0, cards: [] },
    ai: { total: 1, energy: 0, shields: 0, gauge: 0, cards: [] }
  },
  decks: {
    cards: { draw: [], discard: [] },
    events: { draw: [], discard: [] }
  },
  scheduled: {
    luckNext: false,     // 🍀
    curseNext: 0,        // 🌙 누적 수
    bonusTurnNext: false // 🎲
  },
  log: [] // 도메인 이벤트 타임라인
}
```

### 상태 업데이트 원칙

- 불변 업데이트: 객체/배열은 스프레드 복제로 갱신(`{ ...obj, k:v }`, `[...arr, x]`).
- 시스템 함수는 `(state, payload) => newState` 순수함수 형태로 유지.
- 공통 검증은 엔진 레벨에서 선행(카드 2장 제한, 에너지 상한 등).

### 공통 유틸 모듈 설계

- `src/shared/events.js` (도메인 이벤트 버스)

```js
const listeners = new Map();
export function on(type, fn) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(fn);
}
export function off(type, fn) { listeners.get(type)?.delete(fn); }
export function emit(type, payload) { listeners.get(type)?.forEach(fn => fn(payload)); }
```

- `src/shared/rng.js` (시드 가능한 RNG) — `coding_conventions.md` 참고

- `src/shared/guards.js` (규칙 가드)

```js
export function assertEnergy(state, need) {
  if (state.players.me.energy < need) throw new Error('[Rule] Not enough energy');
}
export function assertCardLimit(state) {
  if (state.round.usedCards.length >= 2) throw new Error('[Rule] Card limit exceeded');
}
```

- `src/shared/clone.js` (얕은 복제 헬퍼)

```js
export const clone = (o) => Array.isArray(o) ? [...o] : { ...o };
```

### 도메인 이벤트 로그 포맷

```js
// 예시: ['phase', 'roll', { who:'me', value:6 }]
// 예시: ['card:play', { who:'me', type:'boost' }]
// 예시: ['shield:block', { effect:'attack-die' }]
```

### 엔진-시스템 인터페이스 규약

- 엔진은 단계 전환 시 `emit('phase:*')`를 호출하여 외부(UI/로그)와 느슨 결합.
- 시스템은 도메인 이벤트를 `log`에 기록하고, 필요한 경우 `scheduled`에 지연 효과를 예약.

### 초기화와 재시드

- `createInitialState(config, seed)`에서 RNG를 초기화하고 덱을 셔플.
- 동일 시드로 재생산 가능한 시뮬레이션 보장.


