## 🛡️ 방어막 시스템

생성, 보유 상한, 차단 범위, 우선순위를 정의합니다.

### 생성/보유

- 에너지 3으로 방어막 1개 생성, 최대 2개 보유
- 방어 성향 성공 시 방어막 +1(무료). 최대치 초과 시 생성되지 않음

### 차단 규칙

- 차단 가능: ⚔️공격 카드, ⚡공격 주사위(-2), 🔥화염(이번 라운드 -3만), 🦹스틸
- 차단 불가: 🎯더블, ⭐보너스, 🔥다음 턴 -1, 이벤트(💥/🔄/🧹/🍀/🎲/🔋/⚡)

### 우선순위

1. 차단 가능한 효과부터, 피해가 큰 효과 우선
2. 지연 효과는 차단 불가

### 구현 메모

- 방어막 소모는 효과 단위로 1개씩 자동 소모
- 차단 결과는 로그와 UI 애니메이션(회색 X)로 노출

### 구현 가이드 (순수 JS)

- 파일: `src/systems/shield.js`
- 인터페이스
  - `addShield(state, n=1) => state` (최대 2)
  - `consumeShield(state) => { state, blocked:boolean }`
  - `canBlock(effect) => boolean` (공격/화염(부분)/스틸만)
- 예시

```js
// src/systems/shield.js
export function canBlock(effect) {
  return ["attack-card", "attack-die", "flame-die-now", "steal-card"].includes(
    effect
  );
}
```
