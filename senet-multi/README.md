# 세넷 (Senet) 멀티플레이어 게임

고대 이집트의 전략 보드게임 세넷을 온라인에서 즐길 수 있는 SPA(Single Page Application)입니다.

## 🎮 게임 특징

- **SPA 구조**: 메인 메뉴와 게임 화면이 하나의 페이지에서 전환됩니다
- **멀티플레이어 지원**: WebSocket을 통한 실시간 멀티플레이어 게임
- **반응형 디자인**: 모바일과 데스크톱에서 모두 최적화된 UI
- **한국어 지원**: 완전한 한국어 인터페이스

## 🚀 시작하기

### 요구사항
- 웹 브라우저 (Chrome, Firefox, Safari, Edge)
- WebSocket 서버 (별도 실행 필요)

### 실행 방법

1. **서버 실행**
   ```bash
   # Rust WebSocket 서버 실행
   cd server/rust/senet-socket-server
   cargo run
   ```

2. **클라이언트 실행**
   ```bash
   # 웹 서버 실행 (예: Python)
   cd senet-multi
   python -m http.server 8000
   ```

3. **브라우저에서 접속**
   ```
   http://localhost:8000
   ```

## 📁 파일 구조

```
senet-multi/
├── index.html          # 메인 SPA 파일
├── script.js           # 게임 로직 및 SPA 라우팅
├── style.css           # 스타일시트
└── README.md           # 이 파일
```

## 🎯 게임 규칙

### 기본 규칙
1. **막대기 던지기**: 4개의 막대기를 던져 앞면의 수만큼 이동
   - 모두 뒷면이면 5칸 이동
   - 4 또는 5가 나오면 추가 턴 (물칸 착지 시 제외)

2. **말 이동**
   - 같은 편 말 위에는 착지 불가
   - 상대 말 한 개면 자리 교환
   - 안전칸(15, 26) 또는 연속 보호 중인 말은 교환 불가

3. **특수 칸**
   - **15, 26**: 안전칸 (공격받지 않음)
   - **27**: 물칸 (착지 시 15 또는 26으로 귀환)
   - **30**: 탈출칸 (정확히 도착해야 탈출)

4. **승리 조건**: 모든 말을 30번 칸으로 탈출시키면 승리

## 🎨 SPA 구조

### 화면 구성
- **메인 메뉴**: 게임 시작 옵션 선택
- **방 생성**: 새 게임 방 생성
- **방 참가**: 기존 방에 참가
- **공개 방 목록**: 다른 플레이어들의 방 목록
- **게임 화면**: 실제 게임 플레이

### 라우팅
- URL 파라미터를 통한 게임 방 자동 참가
- 화면 전환 시 부드러운 애니메이션
- 상태 관리 및 데이터 동기화

## 🔧 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Rust (WebSocket 서버)
- **통신**: WebSocket
- **스타일링**: CSS Grid, Flexbox, CSS Variables

## 🎮 조작법

### 키보드
- **R**: 막대기 던지기
- **ESC**: 규칙 모달 닫기

### 마우스
- 말 클릭: 이동 가능한 말 선택
- 목표 칸 클릭: 말 이동
- 버튼 클릭: 각종 기능 실행

## 📱 반응형 지원

- **데스크톱**: 최적화된 레이아웃과 큰 게임 보드
- **태블릿**: 중간 크기 보드와 적응형 컨트롤
- **모바일**: 터치 친화적 인터페이스와 작은 보드

## 🔄 업데이트 내역

### v2.0.0 (SPA 버전)
- SPA 구조로 완전 재구성
- 메인 메뉴와 게임 화면 통합
- 향상된 사용자 경험
- 코드 구조 개선

### v1.0.0 (초기 버전)
- 기본 게임 기능 구현
- 멀티플레이어 지원
- WebSocket 통신

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🙏 감사의 말

- 고대 이집트의 세넷 게임을 현대적으로 재해석
- WebSocket 기술을 활용한 실시간 멀티플레이어 구현
- 반응형 디자인으로 모든 디바이스에서 즐길 수 있도록 설계
