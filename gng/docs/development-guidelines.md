# 개발 가이드라인

GNG 프로젝트의 개발 워크플로우와 유지보수 가이드라인입니다.

## 📋 목차

- [개발 환경 설정](#개발-환경-설정)
- [Git 워크플로우](#git-워크플로우)
- [코드 리뷰 프로세스](#코드-리뷰-프로세스)
- [테스트 가이드라인](#테스트-가이드라인)
- [배포 프로세스](#배포-프로세스)
- [버그 리포트 가이드](#버그-리포트-가이드)
- [성능 모니터링](#성능-모니터링)

## 개발 환경 설정

### 1. 필수 도구

```bash
# Node.js (v18 이상)
node --version

# npm (v8 이상)
npm --version

# Git
git --version
```

### 2. 프로젝트 설정

```bash
# 저장소 클론
git clone <repository-url>
cd gng

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

### 3. IDE 설정 (VSCode 권장)

#### 확장 프로그램

- **ES6 String HTML** - 템플릿 리터럴 문법 하이라이팅
- **Phaser 3 Snippets** - Phaser 코드 스니펫
- **Auto Rename Tag** - HTML 태그 자동 이름 변경
- **Bracket Pair Colorizer** - 괄호 색상 구분
- **GitLens** - Git 히스토리 및 blame 정보
- **Prettier** - 코드 포맷팅
- **ESLint** - 코드 린팅

#### 설정 파일 (`.vscode/settings.json`)

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  },
  "files.associations": {
    "*.js": "javascript"
  }
}
```

## Git 워크플로우

### 1. 브랜치 전략

```
main
├── develop
│   ├── feature/player-movement
│   ├── feature/enemy-ai
│   └── hotfix/critical-bug-fix
└── release/v1.0.0
```

#### 브랜치 유형

- **main**: 프로덕션 배포용 브랜치
- **develop**: 개발 통합 브랜치
- **feature/**: 새로운 기능 개발
- **hotfix/**: 긴급 버그 수정
- **release/**: 릴리스 준비

### 2. 커밋 메시지 규칙

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### 타입 (Type)

- **feat**: 새로운 기능
- **fix**: 버그 수정
- **docs**: 문서 변경
- **style**: 코드 포맷팅, 세미콜론 누락 등
- **refactor**: 코드 리팩토링
- **test**: 테스트 코드 추가/수정
- **chore**: 빌드 프로세스, 도구 변경

#### 예시

```bash
feat(player): 플레이어 점프 기능 추가

- 스페이스바 입력으로 점프 구현
- 점프 높이와 중력 설정
- 점프 애니메이션 추가

Closes #123
```

### 3. Pull Request 규칙

#### PR 제목

```
[FEAT] 플레이어 점프 기능 추가
[FIX] 적 AI 패스파인딩 버그 수정
[DOCS] API 문서 업데이트
```

#### PR 템플릿

```markdown
## 변경 사항

- [ ] 새로운 기능 추가
- [ ] 버그 수정
- [ ] 문서 업데이트

## 상세 설명

변경 내용을 자세히 설명해주세요.

## 테스트

- [ ] 기존 테스트 통과
- [ ] 새로운 테스트 추가
- [ ] 수동 테스트 완료

## 체크리스트

- [ ] 코드 리뷰 완료
- [ ] 문서 업데이트
- [ ] 브랜치 최신화
```

## 코드 리뷰 프로세스

### 1. 리뷰 체크리스트

#### 기능적 측면

- [ ] 요구사항이 올바르게 구현되었는가?
- [ ] 에러 처리가 적절한가?
- [ ] 성능에 문제가 없는가?
- [ ] 보안 취약점이 없는가?

#### 코드 품질

- [ ] 코드가 읽기 쉽고 이해하기 쉬운가?
- [ ] 네이밍이 명확하고 일관성 있는가?
- [ ] 중복 코드가 없는가?
- [ ] 적절한 주석이 있는가?

#### 아키텍처

- [ ] 설계 원칙을 따르고 있는가?
- [ ] 의존성이 적절한가?
- [ ] 확장 가능한 구조인가?
- [ ] 테스트 가능한 코드인가?

### 2. 리뷰 코멘트 가이드

#### 좋은 리뷰 코멘트

```javascript
// ✅ 구체적이고 건설적인 피드백
// 이 함수는 너무 많은 책임을 가지고 있습니다.
// 플레이어 이동과 충돌 검사를 분리하는 것이 좋겠습니다.

// ✅ 대안 제시
// 이 부분은 ObjectPool 패턴을 사용하면
// 메모리 사용량을 줄일 수 있을 것 같습니다.

// ✅ 질문으로 시작
// 이 로직이 모든 케이스를 처리하는지 확인해보셨나요?
```

#### 피해야 할 리뷰 코멘트

```javascript
// ❌ 모호한 피드백
// 이 코드가 이상해요.

// ❌ 개인적 공격
// 이렇게 코딩하면 안 됩니다.

// ❌ 지시적 톤
// 이렇게 바꾸세요.
```

## 테스트 가이드라인

### 1. 테스트 유형

#### 단위 테스트

```javascript
// utils/GameLogic.test.js
import { calculateScore, generateDishName } from "./Utils.js";

describe("GameLogic", () => {
  describe("calculateScore", () => {
    test("기본 점수 계산", () => {
      const plate = [{ name: "소고기", tags: ["단백질"] }];
      const palate = { likes: ["단백질"], hates: [] };

      const result = calculateScore(plate, palate);

      expect(result.score).toBeGreaterThan(0);
      expect(result.notes).toContain("페어 시너지");
    });
  });
});
```

#### 통합 테스트

```javascript
// scenes/RoguelikeScene.test.js
describe("RoguelikeScene", () => {
  test("씬 초기화", () => {
    const scene = new RoguelikeScene();
    scene.create();

    expect(scene.gameState).toBeDefined();
    expect(scene.player).toBeDefined();
  });
});
```

### 2. 테스트 실행

```bash
# 모든 테스트 실행
npm test

# 특정 파일 테스트
npm test -- GameLogic.test.js

# 커버리지 리포트
npm run test:coverage

# 감시 모드
npm run test:watch
```

### 3. 테스트 커버리지 목표

- **라인 커버리지**: 80% 이상
- **함수 커버리지**: 90% 이상
- **브랜치 커버리지**: 70% 이상

## 배포 프로세스

### 1. 개발 환경

```bash
# 개발 서버 실행
npm run dev

# 포트: http://localhost:5173
# 핫 리로드 활성화
# 소스맵 포함
```

### 2. 스테이징 환경

```bash
# 스테이징 빌드
npm run build:staging

# 환경 변수 설정
NODE_ENV=staging
API_URL=https://staging-api.example.com
```

### 3. 프로덕션 환경

```bash
# 프로덕션 빌드
npm run build

# 빌드 최적화
# 소스맵 제외
# 압축 및 최적화
```

### 4. 배포 자동화

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: "18"
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Deploy
        run: npm run deploy
```

## 버그 리포트 가이드

### 1. 버그 리포트 템플릿

```markdown
## 버그 제목

간단하고 명확한 버그 설명

## 환경 정보

- OS: macOS 12.0
- Browser: Chrome 96.0
- Node.js: 18.0.0
- 게임 버전: 1.2.3

## 재현 단계

1. 게임 시작
2. 플레이어 이동
3. 적과 충돌
4. 게임 크래시 발생

## 예상 결과

게임이 정상적으로 계속 진행되어야 함

## 실제 결과

게임이 크래시되고 에러 메시지 표시

## 추가 정보

- 스크린샷 첨부
- 에러 로그 첨부
- 발생 빈도: 항상/가끔/드물게
```

### 2. 우선순위 분류

- **P0 (Critical)**: 게임 크래시, 데이터 손실
- **P1 (High)**: 주요 기능 동작 안함
- **P2 (Medium)**: 부수적 기능 문제
- **P3 (Low)**: UI 개선, 성능 최적화

## 성능 모니터링

### 1. 성능 지표

#### 게임 성능

- **FPS**: 60fps 유지 목표
- **메모리 사용량**: 100MB 이하
- **로딩 시간**: 3초 이하
- **응답 시간**: 100ms 이하

#### 코드 품질

- **번들 크기**: 1MB 이하
- **의존성 수**: 50개 이하
- **순환 복잡도**: 10 이하

### 2. 모니터링 도구

```javascript
// 성능 모니터링
class PerformanceMonitor {
  constructor(scene) {
    this.scene = scene;
    this.fps = 0;
    this.memory = 0;
    this.setupMonitoring();
  }

  setupMonitoring() {
    // FPS 모니터링
    this.scene.events.on("postupdate", () => {
      this.fps = this.scene.game.loop.actualFps;
    });

    // 메모리 모니터링
    if (performance.memory) {
      this.memory = performance.memory.usedJSHeapSize;
    }
  }

  logPerformance() {
    console.log(`FPS: ${this.fps}, Memory: ${this.memory}MB`);
  }
}
```

### 3. 성능 최적화 체크리스트

- [ ] 불필요한 오브젝트 생성 방지
- [ ] 오브젝트 풀링 사용
- [ ] 텍스처 아틀라스 사용
- [ ] 불필요한 업데이트 방지
- [ ] 메모리 누수 방지
- [ ] 번들 크기 최적화

## 문서화 가이드라인

### 1. 코드 문서화

```javascript
/**
 * 플레이어의 점수를 계산합니다.
 * @param {Array} plate - 접시에 담긴 재료 배열
 * @param {Object} palate - 플레이어의 취향 설정
 * @param {Array} palate.likes - 선호하는 태그 배열
 * @param {Array} palate.hates - 싫어하는 태그 배열
 * @returns {Object} 계산된 점수와 노트
 * @returns {number} returns.score - 최종 점수
 * @returns {Array} returns.notes - 점수 계산 노트
 *
 * @example
 * const plate = [{ name: '소고기', tags: ['단백질'] }];
 * const palate = { likes: ['단백질'], hates: [] };
 * const result = calculateScore(plate, palate);
 * console.log(result.score); // 5
 */
export function calculateScore(plate, palate) {
  // 구현...
}
```

### 2. README 업데이트

- 새로운 기능 추가 시 README 업데이트
- 설치 및 실행 방법 명시
- 주요 기능 목록 유지
- 예제 코드 포함

### 3. 변경 로그 관리

```markdown
# Changelog

## [1.2.0] - 2024-01-15

### Added

- 플레이어 점프 기능
- 새로운 적 타입 추가

### Changed

- UI 디자인 개선
- 성능 최적화

### Fixed

- 메모리 누수 문제 해결
- 충돌 감지 버그 수정
```

이러한 가이드라인을 따르면 일관성 있고 효율적인 개발 프로세스를 유지할 수 있습니다.
