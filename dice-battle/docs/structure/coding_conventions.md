## 🧭 코딩 컨벤션 (순수 JavaScript)

### 파일/모듈 구조

- ES Modules 사용: `import`/`export`
- 디렉토리 제안: `src/core/`(엔진), `src/systems/`(주사위/에너지/카드/방어막/이벤트/점수), `src/ai/`, `src/shared/`(이벤트버스, RNG, 유틸)
- 각 모듈은 순수 함수 우선. 상태 변경은 엔진에서만 수행

### 네이밍/스타일

- 파일: `snake_case.js` 또는 `kebab-case.js` → 본 프로젝트는 `kebab-case.js`
- 함수: 동사 시작(`computeScore`, `applyEvent`)
- 상수: `UPPER_SNAKE_CASE`
- 들여쓰기: 2 spaces, 세미콜론 사용, 작은따옴표 `'`

### 타입/문서화

- JSDoc으로 타입 정의
- 공개 API에는 반드시 JSDoc 작성

### 상태/불변성

- 입력 상태는 불변으로 취급, 필요 시 얕은/깊은 복제 후 변경
- 시스템 함수는 `(state, payload) => newState` 형태 권장

### 에러 처리

- 규칙 위반은 `throw new Error('[Rule] message')`
- 사용자 입력 경계는 선검증 후 실행

### RNG/재현성

- `shared/rng.js`에서 시드 가능한 PRNG 제공
- 모든 무작위 로직은 RNG 의존성 주입으로 테스트 가능

### 이벤트/로깅

- `shared/events.js` 단일 이벤트 버스: `emit`, `on`
- 엔진 단계별 이벤트를 발행하여 디버깅/애니메이션 연동

### 예시 유틸

```js
// src/shared/rng.js
export function createRng(seed = 123456789) {
  let s = seed >>> 0;
  return {
    next() {
      // xorshift32
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return (s >>> 0) / 0xffffffff;
    },
    roll(max = 6) {
      return 1 + Math.floor(this.next() * max);
    },
  };
}
```
