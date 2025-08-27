## 🧩 Dice Battle 구현 가이드라인 (통합)

본 문서는 `structure/` 문서들의 규칙을 일관된 엔진/시스템 인터페이스로 연결하여 바로 구현 가능한 가이드를 제공합니다. 순수 JS + 불변 업데이트를 기준으로 합니다.

---

### 1) 디렉터리 구조(권장)

- `src/core/engine.js` — 상태머신/단계 오케스트레이션
- `src/core/initial-state.js` — 초기 상태/시드/덱 셔플
- `src/systems/dice.js` — 주사위 규칙/특수 효과
- `src/systems/cards.js` — 카드 드로우/사용/제약
- `src/systems/energy.js` — 에너지 상한/획득/소모
- `src/systems/shield.js` — 방어막 생성/소모/차단
- `src/systems/events.js` — 이벤트 드로우/즉시/지연 처리
- `src/systems/scoring.js` — 점수 계산 파이프
- `src/ai/params.js` — 난이도 파라미터 테이블
- `src/ai/policy.js` — 성향/카드 의사결정 규칙
- `src/ai/selector.js` — 난이도별 액션 선택
- `src/shared/events.js` — 이벤트 버스
- `src/shared/rng.js` — 시드 가능한 RNG
- `src/shared/guards.js` — 공통 가드(카드 2장 제한 등)
- `src/shared/clone.js` — 얕은 복제

---

### 2) 상태 스키마 요약

`common_state_and_shared_modules.md`와 동일 스키마를 따른다. 필수 키만 발췌:

```js
{
  config: { rounds: 8, mode: 'normal' },
  round: { index: 1, tendency: null, usedCards: [], roll: null, tempScore: 0 },
  players: {
    me: { total: 1, energy: 0, shields: 0, gauge: 0, cards: [] },
    ai: { total: 1, energy: 0, shields: 0, gauge: 0, cards: [] }
  },
  decks: { cards: { draw: [], discard: [] }, events: { draw: [], discard: [] } },
  scheduled: { luckNext: false, curseNext: 0, bonusTurnNext: false },
  log: []
}
```

원칙: 모든 시스템 함수는 `(state, payload?) => newState` 순수 함수. 변경은 스프레드 복제.

---

### 3) 단계 오케스트레이션(엔진 스켈레톤)

플로우: `PreRound → PreCard → Roll → PostCard → Score → ShieldCheck → Event → Accumulate`.

```js
// src/core/engine.js
import { emit } from '../shared/events.js';
import { rollDice, resolveTendency, resolveSpecial } from '../systems/dice.js';
import { canPlay, playCard } from '../systems/cards.js';
import { computeRoundScore } from '../systems/scoring.js';
import { applyImmediate, scheduleDelayed, tickDelayed } from '../systems/events.js';

export function preRound(state, input) {
  emit('phase:PreRound', { index: state.round.index });
  const next = { ...state, round: { ...state.round, tendency: input.tendency, usedCards: [] } };
  return next;
}

export function preCard(state, cards) {
  emit('phase:PreCard');
  let s = state;
  for (const card of cards) {
    if (canPlay(s, card, 'pre')) s = playCard(s, card, 'pre');
  }
  return s;
}

export function rollPhase(state, rng) {
  emit('phase:Roll');
  const roll = rollDice(rng);
  const tendencyResult = resolveTendency(state.round.tendency, roll);
  const specials = resolveSpecial(state.round.tendency, roll, rng);
  return { ...state, round: { ...state.round, roll, tempScore: tendencyResult.baseScore }, log: [...state.log, ['roll', { roll, tendencyResult, specials }]] };
}

export function postCard(state, cards) {
  emit('phase:PostCard');
  let s = state;
  for (const card of cards) {
    if (canPlay(s, card, 'post')) s = playCard(s, card, 'post');
  }
  return s;
}

export function scorePhase(state, ctx) {
  emit('phase:Score');
  return computeRoundScore(state, ctx);
}

export function eventPhase(state) {
  emit('phase:Event');
  // 라운드 종료 시점: 드로우 → 즉시 → 지연 예약
  let s = tickDelayed(state);
  const { state: withDraw, event } = drawEventIfAny(s);
  s = withDraw;
  if (event) {
    s = applyImmediate(s, event);
    s = scheduleDelayed(s, event);
  }
  return s;
}

export function accumulate(state) {
  emit('phase:Accumulate');
  const me = state.players.me;
  const total = Math.max(1, me.total + state.round.tempScore);
  return { ...state, players: { ...state.players, me: { ...me, total } } };
}

// 헬퍼: 이벤트 드로우는 시스템 모듈로 위임하는 것을 권장
import { drawEvent } from '../systems/events.js';
function drawEventIfAny(state) { return drawEvent(state); }
```

제약 검증은 `guards`와 `cards.canPlay`가 담당. 라운드당 2장/동종 1장/시점 제약을 준수.

---

### 4) 시스템 통합 규칙(일관성 체크리스트)

- **계산 순서 고정**: `scoring_system.md`의 1→7 순서를 반드시 준수.
- **방어막 차단 범위**: `shield_system.md`와 동일(⚔️/⚡/🔥(이번 라운드 -3)/🦹만 차단).
- **주사위 특수**: `dice_system.md`의 공격6/방어2 트리거와 이벤트 발행 유지.
- **에너지 상한**: 모든 획득/소모 후 최소/최대 보정(0~10).
- **카드 제약**: 라운드 2장/동종 1장/사전·사후 시점 준수.
- **이벤트 우선순위**: 리셋 > 감소(💥/🦹/⚡/🌙) > 교환(🔄/🎴) > 증가(🔋/🎲) > 지연 예약.
- **AI 정보 경계**: 공개/부분/숨김 정보 라인을 넘지 않도록 `selector`에서 입력 제한.

---

### 5) 예시: 카드/방어막/특수 상호작용

```js
// 방어막 차단 예시 흐름(Score 단계 내부 5번)
import { canBlock, consumeShield } from '../systems/shield.js';

function applyShields(state, ctx) {
  let s = state;
  for (const effect of ctx.effects) {
    if (canBlock(effect) && s.players.me.shields > 0) {
      const res = consumeShield(s);
      s = res.state;
      s = { ...s, log: [...s.log, ['shield:block', { effect }]] };
      // 차단된 효과는 점수/자원 변화에서 제외 처리
      ctx = { ...ctx, effects: ctx.effects.filter(e => e !== effect) };
    }
  }
  return s;
}
```

---

### 6) 예시: AI 의사결정 입력/출력

```js
// src/ai/selector.js (요약)
import { paramsByLevel } from './params.js';
import { decideTendency, decidePreCards, decidePostCards } from './policy.js';

export function decideActions(state, level) {
  const p = paramsByLevel[level];
  const tendency = decideTendency(state, p);
  const pre = decidePreCards(state, p);
  // rollPhase 이후 호출
  const post = decidePostCards(state, p);
  return { tendency, pre, post };
}
```

정보 경계: 총점/라운드/에너지/방어막/카드수/게이지만 사용. 카드 종류/상대 성향 예측 금지.

---

### 7) 이벤트 처리 훅(지연 효과)

```js
// src/systems/events.js (요약)
export function tickDelayed(state) {
  let s = state;
  if (s.scheduled.curseNext > 0) {
    s = { ...s, round: { ...s.round, tempScore: s.round.tempScore - 2 }, scheduled: { ...s.scheduled, curseNext: s.scheduled.curseNext - 1 } };
  }
  if (s.scheduled.luckNext) {
    // 다음 라운드 주사위 2번 중 택1은 UI/엔진 입력으로 처리
  }
  return s;
}
```

---

### 8) 테스트 전략(권장)

- 시드 고정(`rng(seed)`)으로 주사위/덱 재현성 확보.
- 단위: 각 시스템 함수의 가드/상한/순수성 테스트.
- 통합: `engine` 단계별 시나리오(공격6+부스트×2+더블 → 방어막 차단/이벤트 적용) 스냅샷.

---

### 9) UI 연동 포인트

- `emit('phase:*')`, `log`의 도메인 이벤트를 구독해 `ui_ux_spec.md`의 컴포넌트 업데이트.
- 상태 원본 단방향 바인딩: `state.players`, `state.round`, `state.scheduled`.

---

### 10) 호환성 점검표

- 규칙 일치: `dice_system.md`, `card_system.md`, `shield_system.md`, `energy_system.md`, `event_system.md`, `scoring_system.md`, `game_flow.md`, `ai_system.md`.
- 우선순위 충돌 없음: 리셋(카드) > 리셋(이벤트). 방어막은 지연 효과 차단 불가.
- 상한/하한 보정 일관: 에너지(0~10), 방어막(0~2), 총점 최소 1.
