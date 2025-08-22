# 🎲 주사위 배틀 (Dice Battle) - Node.js 프로젝트 구조

## 📁 프로젝트 구조

```
mini-game/
├── game-1/
│   ├── docs/
│   │   ├── dice_battle_plan.md          # 게임 기획 문서
│   │   └── project_structure.md         # 프로젝트 구조 문서 (현재 파일)
│   ├── src/
│   │   ├── models/                      # 데이터 모델
│   │   │   ├── Player.js               # 플레이어 클래스
│   │   │   ├── Game.js                 # 게임 로직 클래스
│   │   │   ├── Dice.js                 # 주사위 클래스
│   │   │   └── Event.js                # 랜덤 이벤트 클래스
│   │   ├── services/                    # 비즈니스 로직
│   │   │   ├── GameService.js          # 게임 진행 서비스
│   │   │   ├── ScoreService.js         # 점수 계산 서비스
│   │   │   └── EventService.js         # 이벤트 처리 서비스
│   │   ├── controllers/                 # API 컨트롤러
│   │   │   ├── GameController.js       # 게임 관련 API
│   │   │   └── PlayerController.js     # 플레이어 관련 API
│   │   ├── routes/                      # API 라우트
│   │   │   ├── game.js                 # 게임 라우트
│   │   │   └── player.js               # 플레이어 라우트
│   │   ├── middleware/                  # 미들웨어
│   │   │   ├── auth.js                 # 인증 미들웨어
│   │   │   └── validation.js           # 입력 검증 미들웨어
│   │   ├── utils/                       # 유틸리티 함수
│   │   │   ├── diceUtils.js            # 주사위 관련 유틸리티
│   │   │   └── gameUtils.js            # 게임 관련 유틸리티
│   │   └── config/                      # 설정 파일
│   │       ├── database.js             # 데이터베이스 설정
│   │       └── gameConfig.js           # 게임 설정
│   ├── public/                          # 정적 파일
│   │   ├── css/
│   │   │   └── style.css               # 게임 스타일
│   │   ├── js/
│   │   │   ├── game.js                 # 프론트엔드 게임 로직
│   │   │   └── ui.js                   # UI 업데이트 로직
│   │   └── index.html                  # 메인 게임 페이지
│   ├── tests/                           # 테스트 파일
│   │   ├── unit/                       # 단위 테스트
│   │   │   ├── Player.test.js
│   │   │   ├── Game.test.js
│   │   │   └── Dice.test.js
│   │   └── integration/                # 통합 테스트
│   │       └── gameFlow.test.js
│   ├── package.json                     # 프로젝트 의존성 및 스크립트
│   ├── package-lock.json               # 의존성 잠금 파일
│   ├── .env                            # 환경 변수
│   ├── .gitignore                      # Git 무시 파일
│   ├── README.md                       # 프로젝트 설명서
│   └── server.js                       # 메인 서버 파일
```

## 🛠️ 기술 스택

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose) 또는 SQLite (Sequelize)
- **Real-time**: Socket.io (멀티플레이어 지원)
- **Validation**: Joi 또는 Yup
- **Testing**: Jest + Supertest

### Frontend
- **HTML5**: Canvas API 활용
- **CSS3**: Flexbox/Grid 레이아웃
- **JavaScript**: ES6+ 모듈 시스템
- **Real-time**: Socket.io 클라이언트

### Development Tools
- **Package Manager**: npm 또는 yarn
- **Linting**: ESLint + Prettier
- **Git Hooks**: Husky + lint-staged
- **Environment**: dotenv

## 📦 핵심 패키지 의존성

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "mongoose": "^7.5.0",
    "joi": "^17.9.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "compression": "^1.7.4"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.2",
    "supertest": "^6.3.3",
    "eslint": "^8.47.0",
    "prettier": "^3.0.2"
  }
}
```

## 🎯 구현 단계별 계획

### Phase 1: 기본 구조 (1-2주)
- [ ] 프로젝트 초기 설정
- [ ] 기본 Express 서버 구축
- [ ] Player, Game, Dice 모델 클래스 구현
- [ ] 기본 게임 로직 구현

### Phase 2: 게임 기능 (2-3주)
- [ ] 주사위 굴리기 및 점수 시스템
- [ ] 턴 기반 게임 진행
- [ ] 기본 아이템/스킬 시스템
- [ ] 라운드 관리

### Phase 3: 고급 기능 (2-3주)
- [ ] 특수 주사위 시스템
- [ ] 랜덤 이벤트 시스템
- [ ] 점수 시스템 변형
- [ ] 게임 설정 옵션

### Phase 4: 멀티플레이어 (2-3주)
- [ ] Socket.io 통합
- [ ] 실시간 게임 진행
- [ ] 플레이어 매칭 시스템
- [ ] 게임 방 관리

### Phase 5: UI/UX 및 최적화 (1-2주)
- [ ] 프론트엔드 UI 구현
- [ ] 애니메이션 및 효과
- [ ] 성능 최적화
- [ ] 테스트 및 버그 수정

## 🔧 개발 환경 설정

### 1. 프로젝트 초기화
```bash
cd game-1
npm init -y
npm install express socket.io mongoose joi cors helmet compression
npm install --save-dev nodemon jest supertest eslint prettier
```

### 2. 환경 변수 설정 (.env)
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/dice-battle
JWT_SECRET=your-secret-key
```

### 3. 기본 스크립트 (package.json)
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write src/"
  }
}
```

## 🎮 게임 로직 설계

### 핵심 클래스 구조

#### Player 클래스
```javascript
class Player {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.score = 0;
    this.roundScores = [];
    this.items = [];
    this.isActive = false;
  }
  
  rollDice() { /* 주사위 굴리기 */ }
  addScore(points) { /* 점수 추가 */ }
  useItem(itemId) { /* 아이템 사용 */ }
}
```

#### Game 클래스
```javascript
class Game {
  constructor(players, rounds = 5) {
    this.players = players;
    this.currentRound = 1;
    this.maxRounds = rounds;
    this.currentPlayerIndex = 0;
    this.gameState = 'waiting'; // waiting, playing, finished
  }
  
  startGame() { /* 게임 시작 */ }
  nextTurn() { /* 다음 턴 */ }
  endRound() { /* 라운드 종료 */ }
  calculateWinner() { /* 승자 계산 */ }
}
```

#### Dice 클래스
```javascript
class Dice {
  constructor(type = 'normal') {
    this.type = type; // normal, attack, defense, bonus
    this.sides = 6;
  }
  
  roll() { /* 주사위 굴리기 */ }
  getSpecialEffect() { /* 특수 효과 반환 */ }
}
```

## 🚀 실행 방법

### 개발 모드
```bash
npm run dev
```

### 프로덕션 모드
```bash
npm start
```

### 테스트 실행
```bash
npm test
```

## 📝 API 엔드포인트 설계

### 게임 관련
- `POST /api/game/create` - 새 게임 생성
- `GET /api/game/:id` - 게임 정보 조회
- `POST /api/game/:id/join` - 게임 참가
- `POST /api/game/:id/roll` - 주사위 굴리기
- `POST /api/game/:id/end-turn` - 턴 종료

### 플레이어 관련
- `GET /api/player/:id` - 플레이어 정보 조회
- `PUT /api/player/:id` - 플레이어 정보 수정
- `POST /api/player/:id/items` - 아이템 사용

## 🔒 보안 고려사항

- 입력 데이터 검증 (Joi/Yup)
- CORS 설정
- Helmet.js를 통한 보안 헤더
- Rate limiting
- 입력 sanitization

## 📊 성능 최적화

- 데이터베이스 인덱싱
- 캐싱 전략 (Redis 고려)
- 이미지/에셋 최적화
- 코드 분할 및 번들링

이 구조를 바탕으로 단계별로 구현하면 확장 가능하고 유지보수가 용이한 주사위 배틀 게임을 만들 수 있습니다.
