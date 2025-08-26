## 🤖 AI 시스템

AI 전략 가이드의 내용을 구현 관점으로 정리합니다.

### 난이도 레벨

- 쉬움(Easy): 고정 가중치(공격 20 / 방어 30 / 밸런스 50), 카드 사용 30%
- 보통(Normal): 상황 기반 적응, 카드 사용 60%, S 목표 1~2, E≤2면 밸런스
- 어려움(Hard): 최적화 선택, 카드 사용 90%, 점수차 임계 강화, 타이밍 최적화

### 정보 경계

- 공개: 총점, 라운드 수, 에너지, 방어막
- 부분: 카드 보유 수, 에너지 품질 힌트, 게이지
- 숨김: 다음 턴 성향, 카드 종류, 에너지 분배 계획

### 의사결정 루프

1. 공개 정보 수집 및 목표 설정(이길지/손해 최소화)
2. 성향 선택(공격/방어/밸런스) — 점수차/자원/게이지/이벤트 고려
3. 사전 카드(방어/부스트) 사용 판단 — 라운드당 2장 제약 고려
4. 주사위 결과 반영 — 특수 주사위 잠재성 평가
5. 사후 카드(공격/스틸/리셋) 사용 판단
6. 점수/방어막 판정 후 이벤트 대응(즉시/지연)
7. 누적/기록 업데이트(게이지, 연승·연패 등)

### 정책 요약

- 성향
  - 공격: D≤-3, E≥6, 공격/부스트 카드 보유 시 선호, 6 노림
  - 방어: D≥+3, S=0이거나 상대 공격 가능성 높을 때 선호
  - 밸런스: E≤2 또는 카드/게이지 확보 필요 시 기본 선택
- 카드
  - 사전: 방어(1)로 S 최소 1 확보, 부스트(4)는 고득점/보너스턴 시 가치↑
  - 사후: 공격(2) — 상대 S=0, 스틸(2) — 상대 E≥2, 리셋(4) — 상대 고득점 차단
- 자원/방어막/게이지
  - E 상한 10 유지, E≥6 공격 기회, E≤2 밸런스
  - S는 1~2 유지 권장, 방어 성공 시 무료 +1 고려
  - 게이지 5 도달 시 카드 지급, 초과 이월 — 타이밍 최적화

### 난이도별 파라미터(예시)

| 항목          | Easy | Normal | Hard |
| ------------- | ---- | ------ | ---- |
| 점수차 임계값 | 4    | 3      | 2    |
| 카드 사용률   | 0.3  | 0.6    | 0.9  |
| S 목표        | 0~1  | 1~2    | 1~2  |
| E 밸런스 임계 | ≤1   | ≤2     | ≤3   |

### 구현 가이드 (순수 JS)

- 구조
  - `src/ai/policy.js`: 성향/카드/자원 정책 함수 모음
  - `src/ai/selector.js`: 난이도 파라미터 + 상태 → 액션 선택
- 인터페이스
  - `decideTendency(state, params) => 'attack'|'defense'|'balance'`
  - `decidePreCards(state, params) => CardAction[]` (방어/부스트)
  - `decidePostCards(state, params) => CardAction[]` (공격/스틸/리셋)
- 난이도 파라미터
  - `src/ai/params.js`에 테이블 정의 후 주입
- 예시

```js
// src/ai/selector.js
export function decideTendency(state, p) {
  const diff = state.players.me.total - state.players.ai.total;
  if (diff <= -p.diffAttack || state.players.me.energy >= 6) return "attack";
  if (diff >= p.diffDefense || state.players.me.shields === 0) return "defense";
  if (state.players.me.energy <= p.balanceEnergy) return "balance";
  return "balance";
}
```
