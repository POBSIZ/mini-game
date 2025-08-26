## 🎭 이벤트 시스템

덱 구성, 발동 시점, 즉시/지연 효과, 우선순위를 정의합니다.

### 덱 구성(예시 20장)

- 이벤트 없음 8, 긍정 4(🍀, 점수부스트, 🎲, 🔋), 부정 4(💥, 🦹, 🌙, ⚡), 중립 4(🔄, 🧹, 🎴×2)

### 발생/처리 시점

1. 라운드 종료 후 플레이어/AI 각각 1장 드로우
2. 발동 조건 확인(조건부 이벤트 검증)
3. 즉시 효과 적용 → 지연 효과 예약(다음 라운드 큐)
4. 최종 점수 합산

### 즉시/지연 효과

- 즉시: 💥 폭탄(총점 ÷2, 최소 3 보장), 🔄 점수교환, 🧹 리셋(라운드 점수만 0), 🔋 충전, ⚡ 소진, 🦹 도둑(방어막으로 차단 가능), 점수부스트(+2)
- 지연: 🍀 행운의 여신(다음 라운드 주사위 2번 중 택1), 🌙 저주(다음 라운드 -2), 🎲 보너스턴(주사위 1회 추가)

### 우선순위

1. 무효화/초기화: 🧹 리셋
2. 감소: 💥/🦹/⚡/🌙
3. 교환: 🔄/🎴
4. 증가: ⚡(점수부스트)/🔋/🎲
5. 지연 예약: 🍀/🌙

### 차단 범위(방어막)

- 가능: 🦹 도둑만
- 불가: 그 외 시스템/지연/자기 유리 효과 전부

### 구현 메모

- 이벤트는 시스템 레벨 효과로, 카드/주사위/방어막 처리 이후에 적용
- 지연 효과는 다음 라운드 시작/주사위 단계에 맞춰 훅으로 처리

### 구현 가이드 (순수 JS)

- 파일: `src/systems/events.js`
- 인터페이스
  - `drawEvent(state) => { state, event }`
  - `applyImmediate(state, event) => state`
  - `scheduleDelayed(state, event) => state` (🍀/🌙/🎲)
  - `tickDelayed(state) => state` (라운드 시작/주사위 시점 훅)
- 예시

```js
// src/systems/events.js
export function applyImmediate(state, event) {
  switch (event.type) {
    case 'bomb': {
      const next = Math.max(3, Math.floor(state.players.me.total/2));
      return { ...state, players: { ...state.players, me: { ...state.players.me, total: next } } };
    }
    default: return state;
  }
}
```


