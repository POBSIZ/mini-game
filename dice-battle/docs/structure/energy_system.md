## 🔋 에너지 시스템

획득/소모/상한 규칙과 시스템 상호작용을 정의합니다.

### 획득 규칙

- 매 라운드 시작: 2~3 랜덤(직전 라운드 패배 시 3 고정)
- 라운드 승리 보너스: +1
- 이벤트: 🔋 에너지충전(상한 보정)

### 소모 규칙

- 방어막 생성: 3 (최대 2개)
- 카드 사용: 공격 2, 방어 1, 부스트 4, 스틸 2, 리셋 4

### 상한/하한

- 최대 10 유지(초과 시 10으로 보정), 0 미만 불가

### 상호작용

- 밸런스 성향: 매 라운드 +1 획득(게이지 +1과 동시)
- 이벤트 ⚡에너지소진: 현재 E≥3일 때만 -2, 최소 1 보장

### 구현 메모

- 모든 획득/소모 API는 상한/하한 보정을 내부에서 강제
- UI에는 보정 전/후 값을 이벤트로 노출하여 피드백 제공

### 구현 가이드 (순수 JS)

- 파일: `src/systems/energy.js`
- 인터페이스
  - `gainEnergy(state, amount) => state` (상한 10 보정)
  - `spendEnergy(state, amount) => state` (0 미만 불가)
  - `applyEnergyEvent(state, kind) => state` (`charge`/`drain`)
- 예시

```js
// src/systems/energy.js
export function gainEnergy(state, amount) {
  const e = Math.min(10, state.players.me.energy + amount);
  return {
    ...state,
    players: { ...state.players, me: { ...state.players.me, energy: e } },
  };
}
export function spendEnergy(state, amount) {
  const e = Math.max(0, state.players.me.energy - amount);
  if (e < 0) throw new Error("[Energy] not enough");
  return {
    ...state,
    players: { ...state.players, me: { ...state.players.me, energy: e } },
  };
}
```
