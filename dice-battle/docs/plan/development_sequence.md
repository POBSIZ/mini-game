## 🚦 개발 순서 및 체크리스트

시간 추정 없이, 안정적인 통합을 위한 권장 개발 순서와 체크리스트입니다.

### 1) 공통/초기화

- 우선순위: 최고
- 목표: 상태 스키마/유틸/초기화가 견고해야 나머지 모듈이 독립 개발 가능
- 작업 순서
  1. RNG, 이벤트 버스 구현 (`../structure/coding_conventions.md`, `../structure/common_state_and_shared_modules.md`)
  2. 초기 상태/덱 셔플/시드 처리
- 체크리스트
  - [ ] `createInitialState(config, seed)`로 동일 시드 재현
  - [ ] `on/off/emit` 이벤트 버스 정상 동작
  - [ ] 상태 트리 필수 키 존재(players/round/decks/scheduled/log)

### 2) 시스템 기초 (주사위/에너지)

- 우선순위: 높음
- 참고: `../structure/dice_system.md`, `../structure/energy_system.md`, `../game/dice_battle_rule.md`
- 체크리스트
  - [ ] `rollDice`, `resolveTendency`, `resolveSpecial` 케이스 커버
  - [ ] `gainEnergy`, `spendEnergy` 상한/하한 보정, 에러 처리
  - [ ] 이벤트 로그 기록(roll/energy)

### 3) 카드/게이지 + 방어막

- 우선순위: 높음
- 참고: `../structure/card_system.md`, `../structure/shield_system.md`
- 체크리스트
  - [ ] 라운드당 2장, 같은 종류 1장 제약 강제
  - [ ] 게이지 5 지급 및 초과 이월
  - [ ] 방어막 차단 범위 정확(⚔️/⚡/🔥(이번 라운드)/🦹)

### 4) 이벤트 시스템

- 우선순위: 중간
- 참고: `../structure/event_system.md`, `../game/dice_battle_rule.md#랜덤-이벤트-시스템`
- 체크리스트
  - [ ] 즉시/지연 구분, 예약 큐 작동
  - [ ] 도둑만 방어막 차단 가능
  - [ ] 동시 처리 우선순위 준수(리셋>감소>교환>증가>예약)

### 5) 점수/계산 파이프라인

- 우선순위: 중간
- 참고: `../structure/scoring_system.md`
- 체크리스트
  - [ ] 기본→보너스→특수주사위→카드→방어막→이벤트→합산 순서 고정
  - [ ] 🎯×2와 부스트 ×2의 ×4 중첩 처리
  - [ ] 라운드 점수 0, 총점 1 최솟값 보장(폭탄 예외 포함)

### 6) 엔진/플로우 오케스트레이션

- 우선순위: 중간
- 참고: `../structure/game_flow.md`, `../structure/architecture_overview.md`
- 체크리스트
  - [ ] 단계 전이 함수 연결 및 이벤트 버스 연동
  - [ ] 규칙 위반시 예외 처리(가드)
  - [ ] 로그/애니메이션 훅 포인트 노출(`phase:*`)

### 7) AI 시스템

- 우선순위: 이후
- 참고: `../structure/ai_system.md`, `../game/ai_strategy_guide.md`
- 체크리스트
  - [ ] 난이도 파라미터 테이블(Easy/Normal/Hard)
  - [ ] 성향/사전·사후 카드 의사결정 구현
  - [ ] 공개/부분/숨김 정보 경계 준수

### 8) 통합 테스트/시뮬레이터(선택)

- 체크리스트
  - [ ] 고정 시드로 100+ 라운드 시뮬레이션 통과
  - [ ] 규칙서의 예시 시나리오 재현 (`../game/dice_battle_rule.md`)
  - [ ] 로그 타임라인에 단계/효과 순서가 일관
