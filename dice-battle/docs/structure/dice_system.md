## 🎲 주사위 시스템

성향 선언과 결합된 주사위 규칙 및 특수 효과를 정의합니다.

### 성향별 판정

| 성향   | 성공 조건 | 실패 조건 | 보너스                          |
| ------ | --------- | --------- | ------------------------------- |
| 공격   | 4~6       | 1~3 → 1점 | 6 시 +3점 + 랜덤 특수(⚡/🔥/🎯) |
| 방어   | 2~5       | 1, 6      | 성공 시 방어막 +1(무료)         |
| 밸런스 | 1~6 전부  | 없음      | 매 라운드 에너지 +1, 게이지 +1  |

### 특수 주사위 효과

- 공격(공격 선언 + 6): ⚡공격(-2), 🔥화염(-3 + 다음 턴 -1), 🎯더블(자신 ×2) 중 1개 랜덤
- 방어(방어 선언 + 2): 🛡️방어(일회성 방어막), ⭐보너스(+2~+6) 중 1개 랜덤

### 방어막 상호작용

- 차단 가능: ⚡공격, 🔥화염(이번 라운드 -3만), ⚔️공격 카드, 🦹스틸
- 차단 불가: 🎯더블, ⭐보너스, 지연 효과(🔥다음 턴 -1, 🌙저주), 시스템/보호 효과

### 구현 메모

- PRNG 시드 고정 옵션 제공(리플레이/테스트)
- 특수 효과는 도메인 이벤트로 발행하여 순서 규칙에 따라 처리

### 구현 가이드 (순수 JS)

- 인터페이스
  - `rollDice(rng) => 1..6`
  - `resolveTendency(tendency, roll) => { baseScore, success, bonus }`
  - `resolveSpecial(tendency, roll, rng) => DomainEvent[]`
- 파일: `src/systems/dice.js`

```js
// src/systems/dice.js
export function rollDice(rng) {
  return rng.roll(6);
}
export function resolveTendency(tendency, roll) {
  if (tendency === "attack")
    return {
      success: roll >= 4,
      baseScore: roll >= 4 ? roll : 1,
      bonus: roll === 6 ? { attackSix: true } : null,
    };
  if (tendency === "defense")
    return {
      success: roll >= 2 && roll <= 5,
      baseScore: roll >= 2 && roll <= 5 ? roll : 0,
      bonus: roll >= 2 && roll <= 5 ? { shield: +1 } : null,
    };
  return { success: true, baseScore: roll, bonus: { energy: +1, gauge: +1 } };
}
export function resolveSpecial(tendency, roll, rng) {
  const events = [];
  if (tendency === "attack" && roll === 6) {
    const r = Math.floor(rng.next() * 3);
    events.push(["attack:special", ["⚡", "🔥", "🎯"][r]]);
  }
  if (tendency === "defense" && roll === 2) {
    const r = Math.floor(rng.next() * 2);
    events.push(["defense:special", ["🛡️", "⭐"][r]]);
  }
  return events;
}
```
