# 프로젝트 아키텍처

GNG 프로젝트의 구조와 설계 원칙을 설명합니다.

## 📋 목차

- [전체 구조](#전체-구조)
- [폴더 구조](#폴더-구조)
- [모듈 설계](#모듈-설계)
- [의존성 관리](#의존성-관리)
- [데이터 플로우](#데이터-플로우)
- [확장성 고려사항](#확장성-고려사항)

## 전체 구조

```
gng/
├── docs/                    # 프로젝트 문서
├── public/                  # 정적 에셋
│   └── assets/             # 게임 에셋 (이미지, 사운드)
├── src/                    # 소스 코드
│   ├── main.js             # 애플리케이션 진입점
│   ├── scenes/             # Phaser 씬들
│   ├── data/               # 게임 데이터
│   ├── utils/              # 유틸리티 함수들
│   └── style/              # 스타일시트
├── index.html              # HTML 진입점
├── package.json            # 프로젝트 설정
└── README.md               # 프로젝트 개요
```

## 폴더 구조

### `/src` - 소스 코드

```
src/
├── main.js                 # 애플리케이션 진입점 및 Phaser 설정
├── scenes/                 # 게임 씬들 (UI 및 렌더링 담당)
│   ├── RoguelikeScene.js   # 메인 로그라이크 게임 씬 (UI만)
│   └── CookingScene.js    # 팝업 요리 게임 씬
├── logic/                  # 게임 로직 클래스들
│   ├── RoguelikeGameLogic.js # 로그라이크 게임 핵심 로직
│   └── CookingGameLogic.js   # 요리 게임 핵심 로직
├── data/                   # 게임 데이터 및 설정
│   ├── Config.js           # 게임 전역 설정 및 상수
│   ├── CookingData.js      # 요리 게임 데이터
│   ├── RoguelikeData.js    # 로그라이크 게임 데이터
│   └── GameData.js         # 통합 데이터 모듈 (하위 호환성)
├── utils/                  # 유틸리티 함수들
│   └── Utils.js            # 공통 유틸리티 함수들
└── style/                  # 스타일시트
    └── style.css           # 전역 스타일
```

### `/public` - 정적 에셋

```
public/
└── assets/                 # 게임 에셋
    ├── ground.png          # 지면 텍스처
    ├── rabbit.png          # 토끼 캐릭터
    ├── wall-front.png      # 벽 전면 텍스처
    └── wall-top.png        # 벽 상단 텍스처
```

## 모듈 설계

### 1. 진입점 (`main.js`)

```javascript
// 역할: Phaser 게임 설정 및 초기화
const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  // ... 기타 설정
  scene: [RoguelikeScene, CookingScene],
};

const game = new Phaser.Game(config);
```

**책임:**

- Phaser 게임 인스턴스 생성
- 전역 설정 관리
- 씬 등록 및 초기화

### 2. 씬 모듈 (`scenes/`)

#### RoguelikeScene.js

```javascript
export default class RoguelikeScene extends Phaser.Scene {
  constructor() {
    super({ key: "RoguelikeScene" });
  }

  preload() {
    // 리소스 로딩
  }

  create() {
    // 씬 초기화
  }

  update() {
    // 게임 루프
  }
}
```

**책임:**

- UI 생성 및 렌더링
- 입력 처리
- 게임 로직과의 인터페이스
- Phaser 씬 관리

#### CookingScene.js

```javascript
export default class CookingScene extends Phaser.Scene {
  constructor() {
    super({ key: "CookingScene" });
  }
}
```

**책임:**

- 팝업 미니게임 (요리 게임) 로직
- 팝업 UI 관리
- 게임 상태 전환

### 3. 게임 로직 모듈 (`logic/`)

#### 3.1 RoguelikeGameLogic.js

```javascript
export class RoguelikeGameLogic {
  constructor() {
    this.gameState = this.initializeGameState();
  }

  // 게임 상태 관리
  initializeGameState() {
    /* ... */
  }
  resetGame() {
    /* ... */
  }
  getGameState() {
    /* ... */
  }

  // 맵 생성 및 관리
  generateLevel() {
    /* ... */
  }
  createRooms() {
    /* ... */
  }
  connectRooms(rooms) {
    /* ... */
  }
  computeFOV() {
    /* ... */
  }

  // 게임플레이 로직
  tryMove(dx, dy) {
    /* ... */
  }
  attackEnemy(enemy) {
    /* ... */
  }
  pickupItem(item) {
    /* ... */
  }
  endTurn() {
    /* ... */
  }
  enemiesAct() {
    /* ... */
  }

  // 아이템 및 인벤토리
  useInventoryItem(index) {
    /* ... */
  }
  equipWeapon(weapon, index) {
    /* ... */
  }
  equipArmor(armor, index) {
    /* ... */
  }

  // 게임 진행
  gainExp(exp) {
    /* ... */
  }
  levelUp() {
    /* ... */
  }
  descend() {
    /* ... */
  }
  checkGameOver() {
    /* ... */
  }
}
```

**책임:**

- 로그라이크 게임 핵심 로직
- 게임 상태 관리
- 맵 생성 및 관리
- 전투 시스템
- 아이템 및 인벤토리 관리
- AI 및 게임 진행 로직

**특징:**

- Phaser와 독립적으로 동작
- 순수 JavaScript 클래스
- 테스트 가능한 구조
- 재사용 가능한 설계

#### 3.2 CookingGameLogic.js

```javascript
export class CookingGameLogic {
  constructor() {
    this.gameState = this.initializeGameState();
  }

  // 게임 상태 관리
  initializeGameState() {
    /* ... */
  }
  resetGame() {
    /* ... */
  }
  getGameState() {
    /* ... */
  }

  // 게임 진행
  startGame() {
    /* ... */
  }
  endGame() {
    /* ... */
  }
  updateTime(deltaTime) {
    /* ... */
  }

  // 재료 관리
  addIngredient(ingredient) {
    /* ... */
  }
  removeIngredient(index) {
    /* ... */
  }
  clearPlate() {
    /* ... */
  }
  getCurrentPlate() {
    /* ... */
  }

  // 점수 및 결과
  calculateScore(palate) {
    /* ... */
  }
  generateDishName(palate) {
    /* ... */
  }
  submitPlate(palate) {
    /* ... */
  }

  // 유틸리티
  combosOf(arr, k) {
    /* ... */
  }
  addMessage(text) {
    /* ... */
  }
}
```

**책임:**

- 요리 게임 핵심 로직
- 재료 관리 및 조합
- 점수 계산 및 시너지 처리
- 음식 이름 생성
- 게임 진행 관리

**특징:**

- Phaser와 독립적으로 동작
- 순수 JavaScript 클래스
- 테스트 가능한 구조
- 재사용 가능한 설계

### 4. 데이터 모듈 (`data/`)

#### 3.1 설정 모듈 (`Config.js`)

```javascript
// 게임 전역 설정
export const GAME_CONFIG = {
  BASE_POINTS: 3,
  MAX_PICK: 5,
  TIME_LIMIT: 60,
};

// UI 설정
export const UI_CONFIG = {
  COLORS: {
    PRIMARY: "#38bdf8",
    SECONDARY: "#0f1020",
    // ...
  },
  FONTS: {
    DEFAULT: "Arial",
    SIZES: {
      /* ... */
    },
  },
};

// 게임 모드 타입
export const GAME_MODES = {
  ROGUELIKE: "roguelike",
  COOKING: "cooking",
  POPUP: "popup",
};
```

**책임:**

- 게임 전역 설정 상수
- UI 관련 설정값
- 게임 모드 및 상태 상수
- 이벤트 타입 정의

#### 3.2 요리 게임 데이터 (`CookingData.js`)

```javascript
// 재료 데이터
export const INGREDIENTS = [
  {
    id: "beef",
    name: "소고기",
    icon: "🥩",
    tags: ["단백질", "우마미"],
  },
  // ...
];

// 미식가 취향
export const PALATES = [
  {
    id: "spicy",
    name: "매운맛",
    likes: ["매운", "향"],
    hates: ["부드러움"],
  },
  // ...
];

// 시너지 시스템
export const SYNERGY = {
  pairs: {
    /* 페어 시너지 */
  },
  trios: {
    /* 트리오 시너지 */
  },
};
```

**책임:**

- 요리 게임 관련 데이터
- 재료 및 태그 시스템
- 미식가 취향 데이터
- 시너지 계산 규칙

#### 3.3 로그라이크 게임 데이터 (`RoguelikeData.js`)

```javascript
// 무기 데이터
export const WEAPONS = [
  { name: "녹슨 단검", dmg: [0, 1], tier: 1, weight: 2 },
  // ...
];

// 적 데이터
export const ENEMY_TYPES = {
  goblin: {
    name: "도적 고블린",
    symbol: "g",
    hp: [5, 7],
    atk: [1, 4],
    exp: 9,
  },
  // ...
};

// 아이템 정의
export const ITEM_DEFINITIONS = {
  potion: { symbol: "!", name: "체력 물약", color: 0x34d399 },
  // ...
};
```

**책임:**

- 로그라이크 게임 관련 데이터
- 무기, 방어구, 아이템 정의
- 적 타입 및 AI 설정
- 게임 밸런스 설정

#### 3.4 통합 데이터 모듈 (`GameData.js`)

```javascript
// 모든 데이터를 중앙에서 재export
export {
  GAME_CONFIG,
  ROGUELIKE_CONFIG,
  UI_CONFIG,
  // ...
} from "./Config.js";

export {
  INGREDIENTS,
  PALATES,
  SYNERGY,
  // ...
} from "./CookingData.js";

export {
  WEAPONS,
  ARMORS,
  ENEMY_TYPES,
  // ...
} from "./RoguelikeData.js";
```

**책임:**

- 하위 호환성 유지
- 모든 데이터 모듈 통합
- 기존 코드와의 호환성 보장

### 5. 유틸리티 모듈 (`utils/Utils.js`)

```javascript
// 수학적 유틸리티
export function combosOf(arr, k) {
  /* ... */
}
export function permutationsOf(arr, k) {
  /* ... */
}
export function shuffleArray(array) {
  /* ... */
}

// 랜덤 함수들
export function getRandomElement(array) {
  /* ... */
}
export function getRandomElements(array, count) {
  /* ... */
}
export function randomInt(min, max) {
  /* ... */
}
export function randomFloat(min, max) {
  /* ... */
}
export function randomChoice(choices, weights) {
  /* ... */
}

// 거리 계산
export function calculateDistance(x1, y1, x2, y2) {
  /* ... */
}
export function calculateManhattanDistance(x1, y1, x2, y2) {
  /* ... */
}

// 수학 함수들
export function clamp(value, min, max) {
  /* ... */
}
export function lerp(start, end, factor) {
  /* ... */
}
export function degreesToRadians(degrees) {
  /* ... */
}
export function radiansToDegrees(radians) {
  /* ... */
}

// 포맷팅 함수들
export function formatTime(seconds) {
  /* ... */
}
export function formatScore(score) {
  /* ... */
}

// 배열 처리
export function chunkArray(array, size) {
  /* ... */
}
export function deepClone(obj) {
  /* ... */
}

// 성능 최적화
export function debounce(func, wait) {
  /* ... */
}
export function throttle(func, limit) {
  /* ... */
}
```

**책임:**

- 순수 함수들 (side effect 없음)
- 공통 게임 유틸리티
- 수학적 계산 함수들
- 데이터 변환 및 처리
- 성능 최적화 함수들
- 재사용 가능한 유틸리티

## 의존성 관리

### 1. 의존성 그래프

```
main.js
├── RoguelikeScene.js
│   ├── Config.js
│   ├── RoguelikeData.js
│   └── RoguelikeGameLogic.js
│       ├── Config.js
│       └── RoguelikeData.js
├── CookingScene.js
│   ├── Config.js
│   ├── CookingData.js
│   └── CookingGameLogic.js
│       └── CookingData.js
├── Utils.js (utils)
│   └── (독립적 유틸리티)
└── style.css
```

### 2. 모듈 의존성 원칙

- **단방향 의존성**: 상위 모듈이 하위 모듈을 import
- **순환 의존성 금지**: A → B → A 형태 방지
- **명시적 의존성**: 모든 의존성을 import 문으로 명시

### 3. 패키지 의존성

```json
{
  "dependencies": {
    "phaser": "^3.90.0" // 게임 프레임워크
  },
  "devDependencies": {
    "vite": "^7.1.2" // 빌드 도구
  }
}
```

## 데이터 플로우

### 1. 게임 상태 관리

```javascript
// RoguelikeScene에서의 상태 관리
this.gameState = {
  level: 1,
  player: {
    /* 플레이어 상태 */
  },
  enemies: [],
  items: [],
  // ...
};
```

### 2. 씬 간 데이터 전달

```javascript
// 씬 전환 시 데이터 전달
this.scene.start("CookingScene", {
  playerData: this.gameState.player,
  level: this.gameState.level,
});
```

### 3. 이벤트 시스템

```javascript
// 커스텀 이벤트 발생
this.events.emit("playerLevelUp", { level: newLevel });

// 이벤트 리스너 등록
this.events.on("playerLevelUp", (data) => {
  // 레벨업 처리
});
```

## 모듈화의 장점

### 1. 관심사 분리 (Separation of Concerns)

- **설정 관리**: `Config.js`에서 모든 게임 설정을 중앙 관리
- **게임별 데이터**: 각 게임 모드별로 데이터를 분리하여 관리
- **게임 로직 분리**: UI와 게임 로직을 완전히 분리
- **유지보수성**: 특정 게임 모드의 데이터만 수정하면 됨

### 2. 코드 재사용성

```javascript
// 요리 게임에서만 필요한 데이터
import { INGREDIENTS, PALATES, SYNERGY } from "../data/CookingData.js";

// 로그라이크 게임에서만 필요한 데이터
import { WEAPONS, ARMORS, ENEMY_TYPES } from "../data/RoguelikeData.js";

// 공통 설정
import { UI_CONFIG, GAME_MODES } from "../data/Config.js";
```

### 3. 번들 크기 최적화

- 필요한 데이터만 import하여 번들 크기 감소
- Tree-shaking으로 사용하지 않는 코드 제거
- 게임 모드별로 독립적인 번들 생성 가능

### 4. 타입 안정성

```javascript
// 각 모듈에서 명확한 타입 정의
export const ITEM_DEFINITIONS = {
  potion: {
    symbol: "!",
    name: "체력 물약",
    color: 0x34d399,
    description: "HP를 6-10 회복합니다.",
    value: 1,
  },
  // ...
};
```

### 5. 테스트 용이성

- 각 모듈을 독립적으로 테스트 가능
- Mock 데이터를 쉽게 교체 가능
- 단위 테스트 작성이 간편
- 게임 로직을 UI 없이 테스트 가능

### 6. 게임 로직과 UI 분리의 장점

```javascript
// 게임 로직은 Phaser와 독립적으로 테스트 가능
const gameLogic = new RoguelikeGameLogic();
gameLogic.tryMove(1, 0);
expect(gameLogic.getGameState().player.x).toBe(1);

// UI는 게임 로직의 결과만 렌더링
const gameState = this.gameLogic.getGameState();
this.render(gameState);
```

**장점:**

- **테스트 용이성**: 게임 로직을 독립적으로 테스트
- **재사용성**: 다른 UI 프레임워크에서도 로직 재사용
- **디버깅**: 로직과 UI 문제를 분리하여 디버깅
- **성능**: UI와 로직을 독립적으로 최적화

## 확장성 고려사항

### 1. 새로운 씬 추가

```javascript
// 1. 새 씬 파일 생성
// src/scenes/MenuScene.js
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }
}

// 2. main.js에 씬 등록
const config = {
  // ...
  scene: [MenuScene, RoguelikeScene, CookingScene],
};
```

### 2. 새로운 게임 모드 추가

```javascript
// 1. 데이터 확장
// GameData.js
export const GAME_MODES = {
  CLASSIC: "classic",
  SURVIVAL: "survival",
  PUZZLE: "puzzle",
};

// 2. 설정 기반 씬 초기화
const gameMode = localStorage.getItem("gameMode") || "classic";
```

### 3. 플러그인 시스템

```javascript
// 플러그인 인터페이스
class GamePlugin {
  constructor(scene) {
    this.scene = scene;
  }

  init() {
    // 플러그인 초기화
  }

  update() {
    // 플러그인 업데이트
  }
}

// 씬에서 플러그인 사용
class RoguelikeScene extends Phaser.Scene {
  create() {
    this.plugins = {
      inventory: new InventoryPlugin(this),
      combat: new CombatPlugin(this),
    };
  }
}
```

## 성능 고려사항

### 1. 메모리 관리

```javascript
// 객체 풀링 패턴
class ObjectPool {
  constructor(createFn, resetFn, initialSize = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.pool = [];

    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  get() {
    return this.pool.pop() || this.createFn();
  }

  release(obj) {
    this.resetFn(obj);
    this.pool.push(obj);
  }
}
```

### 2. 리소스 최적화

```javascript
// 텍스처 아틀라스 사용
this.load.atlas("gameAssets", "assets/sprites.png", "assets/sprites.json");

// 애니메이션 프레임 최적화
this.anims.create({
  key: "playerWalk",
  frames: this.anims.generateFrameNumbers("player", { start: 0, end: 3 }),
  frameRate: 10,
  repeat: -1,
});
```

### 3. 렌더링 최적화

```javascript
// 컨테이너 사용으로 드로우 콜 감소
this.enemyContainer = this.add.container(0, 0);
this.enemyContainer.add(enemySprite);

// 불필요한 업데이트 방지
if (this.gameState.player.moved) {
  this.updatePlayerPosition();
  this.gameState.player.moved = false;
}
```

## 아키텍처 패턴

### 1. MVC 패턴 적용

- **Model**: `GameData.js` (데이터)
- **View**: Phaser 씬들 (표시)
- **Controller**: 씬의 메서드들 (로직)

### 2. 컴포넌트 패턴

```javascript
// 컴포넌트 기반 엔티티
class Entity {
  constructor() {
    this.components = new Map();
  }

  addComponent(name, component) {
    this.components.set(name, component);
    return this;
  }

  getComponent(name) {
    return this.components.get(name);
  }
}
```

### 3. 이벤트 기반 아키텍처

```javascript
// 이벤트 버스
class EventBus {
  constructor() {
    this.events = new Map();
  }

  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
  }

  emit(event, data) {
    if (this.events.has(event)) {
      this.events.get(event).forEach((callback) => callback(data));
    }
  }
}
```

이 아키텍처는 유지보수성, 확장성, 성능을 모두 고려한 설계로, 프로젝트가 성장하면서도 안정적으로 관리할 수 있도록 구성되었습니다.
