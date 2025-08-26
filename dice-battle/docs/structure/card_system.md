## 🃏 전략 카드 시스템

카드 획득(게이지), 덱 구성, 사용 시점/제약, 우선순위를 정리합니다.

### 덱 구성/확률

- 총 20장: 공격 7(35%), 방어 7(35%), 부스트 3(15%), 스틸 2(10%), 리셋 1(5%)
- 덱 소진 시 셔플 후 재사용(확률 유지)

### 게이지 기반 획득

- 게이지 5 도달 시 카드 1장 지급 후 0으로 초기화, 초과분 이월
- 획득 조건: 같은 눈금 2회, 연속 6 두 번(즉시 카드, 게이지 변화 없음), 누적 15점, 2연패, 3연승

### 사용 시점

- 사전(성향 선언 직후): 🛡️ 방어(1), ⚡ 부스트(4)
- 사후(주사위 직후, 점수 확정 전): ⚔️ 공격(2), 🦹 스틸(2), 🧹 리셋(4)

### 사용 제한

- 라운드당 최대 2장, 같은 종류 1장
- 에너지 요구량 미달 시 사용 불가

### 우선순위(동시 고려)

1. 방어 효과(방어막/방어 카드)
2. 공격·감점 효과(⚔️, ⚡공격)
3. 배가 효과(⚡부스트, 🎯더블)
4. 특수 처리(🦹, 🧹)

### 구현 메모

- 덱/버림 상태를 보존하고, 드로우/사용/반환을 도메인 이벤트로 기록
- 리셋 카드는 라운드 내 다른 효과를 무효화(우선순위 규칙 주의)

### 구현 가이드 (순수 JS)

- 파일: `src/systems/cards.js`
- 인터페이스
  - `drawCard(state) => { state, card }`
  - `playCard(state, card, timing) => state` (timing: `pre`|`post`)
  - `canPlay(state, card, timing) => boolean` (제약 검증)
- 예시

```js
// src/systems/cards.js
export function canPlay(state, card, timing) {
  const usedThisRound = state.round.usedCards;
  if (usedThisRound.some((c) => c.type === card.type)) return false;
  if (usedThisRound.length >= 2) return false;
  if (timing === "pre" && !(card.type === "defense" || card.type === "boost"))
    return false;
  if (timing === "post" && !["attack", "steal", "reset"].includes(card.type))
    return false;
  return state.players.me.energy >= card.cost;
}
```
