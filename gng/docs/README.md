# GNG 프로젝트 문서

이 폴더는 GNG 프로젝트의 개발 및 유지보수를 위한 종합 문서를 포함합니다.

## 📁 문서 구조

- **[코드 컨벤션](./code-conventions.md)** - JavaScript, CSS, HTML 코딩 스타일 가이드
- **[프로젝트 아키텍처](./project-architecture.md)** - 폴더 구조, 모듈 설계, 의존성 관리
- **[리팩토링 가이드](./refactoring-guide.md)** - GameData.js 리팩토링 상세 가이드
- **[개발 가이드라인](./development-guidelines.md)** - 개발 워크플로우, 브랜치 전략, 커밋 규칙
- **[Phaser.js 패턴](./phaser-patterns.md)** - Phaser 3 프레임워크 사용 패턴과 베스트 프랙티스
- **[에셋 관리](./asset-management.md)** - 이미지, 사운드, 데이터 파일 관리 규칙
- **[성능 최적화](./performance-optimization.md)** - 게임 성능 최적화 가이드라인

## 🚀 빠른 시작

새로운 개발자를 위한 필수 읽기 순서:

1. [프로젝트 아키텍처](./project-architecture.md) - 프로젝트 구조 이해
2. [코드 컨벤션](./code-conventions.md) - 코딩 스타일 학습
3. [Phaser.js 패턴](./phaser-patterns.md) - 게임 프레임워크 이해
4. [개발 가이드라인](./development-guidelines.md) - 개발 프로세스 숙지

## 📋 프로젝트 개요

GNG는 Phaser 3와 Vite를 사용한 모던 웹 게임 프로젝트입니다.

### 주요 기술 스택

- **프레임워크**: Phaser 3.90.0
- **빌드 도구**: Vite 7.1.2
- **언어**: ES6+ JavaScript (ES Modules)
- **스타일링**: CSS3
- **패키지 관리**: npm

### 게임 특징

- 로그라이크 던전 탐험 게임
- 팝업 미니게임 (요리 게임)
- 반응형 UI 디자인
- 물리 엔진 기반 게임플레이

## 🔧 개발 환경 설정

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

## 📞 문의 및 기여

프로젝트 관련 문의사항이나 개선 제안이 있으시면 이슈를 생성해 주세요.
