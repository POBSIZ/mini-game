# 리팩토링 가이드

GNG 프로젝트의 GameData.js 리팩토링에 대한 상세 가이드입니다.

## 📋 목차

- [리팩토링 배경](#리팩토링-배경)
- [변경 사항](#변경-사항)
- [마이그레이션 가이드](#마이그레이션-가이드)
- [새로운 모듈 구조](#새로운-모듈-구조)
- [성능 개선](#성능-개선)
- [호환성](#호환성)

## 리팩토링 배경

### 기존 문제점

1. **단일 파일의 과도한 책임**: GameData.js가 모든 게임 데이터를 담당
2. **관심사 혼재**: 요리 게임과 로그라이크 게임 데이터가 섞여 있음
3. **확장성 부족**: 새로운 게임 모드 추가 시 파일이 계속 커짐
4. **번들 크기**: 사용하지 않는 데이터도 함께 로드됨
5. **유지보수성**: 특정 게임 모드 데이터 수정 시 전체 파일을 확인해야 함
6. **게임 로직과 UI 혼재**: RoguelikeScene.js에 게임 로직과 UI 렌더링이 섞여 있음
7. **테스트 어려움**: 게임 로직이 Phaser 씬에 강하게 결합되어 있음

### 리팩토링 목표

- 관심사 분리 (Separation of Concerns)
- 모듈화를 통한 재사용성 향상
- 번들 크기 최적화
- 코드 가독성 및 유지보수성 개선
- 하위 호환성 유지
- 게임 로직과 UI 분리
- 테스트 가능한 구조 구축

## 변경 사항

### 1. 파일 구조 변경

**이전:**

```
src/data/
└── GameData.js (298줄, 모든 데이터 포함)
src/scenes/
└── RoguelikeScene.js (1225줄, 게임 로직 + UI 혼재)
```

**이후:**

```
src/data/
├── Config.js           # 게임 전역 설정
├── CookingData.js      # 요리 게임 데이터
├── RoguelikeData.js    # 로그라이크 게임 데이터
└── GameData.js         # 통합 모듈 (하위 호환성)
src/logic/
└── RoguelikeGameLogic.js # 로그라이크 게임 로직
src/scenes/
└── RoguelikeScene.js (460줄, UI 및 렌더링만)
```

### 2. 모듈 분류

| 모듈                    | 포함 데이터/기능                                                                                                                                    | 책임                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `Config.js`             | `GAME_CONFIG`, `ROGUELIKE_CONFIG`, `UI_CONFIG`, `GAME_MODES`, `ITEM_TYPES`, `TILE_TYPES`, `PLAYER_STATES`, `GAME_EVENTS`                            | 게임 전역 설정 및 상수      |
| `CookingData.js`        | `INGREDIENTS`, `PALATES`, `SYNERGY`, `COOKING_CONFIG`, `DIFFICULTY_LEVELS`                                                                          | 요리 게임 관련 데이터       |
| `RoguelikeData.js`      | `WEAPONS`, `ARMORS`, `ENEMY_TYPES`, `ITEM_DEFINITIONS`, `TRAP_TYPES`, `ITEM_SPAWN_RULES`, `ENEMY_SPAWN_RULES`, `LEVEL_UP_REWARDS`, `BALANCE_CONFIG` | 로그라이크 게임 관련 데이터 |
| `RoguelikeGameLogic.js` | 게임 상태 관리, 맵 생성, 전투, 아이템 처리, AI                                                                                                      | 로그라이크 게임 핵심 로직   |
| `RoguelikeScene.js`     | UI 생성, 렌더링, 입력 처리, 씬 관리                                                                                                                 | Phaser 씬 및 UI 담당        |
| `GameData.js`           | 모든 데이터 재export                                                                                                                                | 하위 호환성 유지            |

### 3. 게임 로직 분리

#### RoguelikeGameLogic.js

```javascript
/**
 * 로그라이크 게임 로직 클래스
 * 게임 상태 관리, 맵 생성, 전투, 아이템 처리 등의 핵심 로직을 담당
 */
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
  hasLineOfSight(x0, y0, x1, y1) {
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
  usePotion() {
    /* ... */
  }
  eatFood() {
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

  // 유틸리티
  addMessage(text, isDanger) {
    /* ... */
  }
  countItems(type) {
    /* ... */
  }
  toggleInventory() {
    /* ... */
  }
}
```

#### RoguelikeScene.js (리팩토링 후)

```javascript
/**
 * 로그라이크 게임 씬
 * UI 생성, 렌더링, 입력 처리만 담당
 */
export default class RoguelikeScene extends Phaser.Scene {
  constructor() {
    super({ key: "RoguelikeScene" });
  }

  preload() {
    // 게임 로직 인스턴스 생성
    this.gameLogic = new RoguelikeGameLogic();
  }

  create() {
    // UI 생성
    this.createUI();
    this.createCookingButton();
    this.setupInput();

    // 게임 로직 위임
    this.gameLogic.generateLevel();
    this.startGame();
  }

  // UI 및 렌더링 메서드들
  createUI() {
    /* ... */
  }
  render() {
    /* ... */
  }
  updateHUD() {
    /* ... */
  }
  updateMessageLog() {
    /* ... */
  }
  renderInventory() {
    /* ... */
  }

  // 입력 처리 (게임 로직 위임)
  update() {
    // 입력 처리 후 게임 로직에 위임
    if (moved) {
      this.gameLogic.tryMove(dx, dy);
      this.gameLogic.endTurn();
    }

    // 렌더링 및 UI 업데이트
    this.render();
    this.updateHUD();
    this.updateMessageLog();
  }
}
```

### 4. 새로운 데이터 구조

#### Config.js

```javascript
// 게임 전역 설정
export const GAME_CONFIG = {
  BASE_POINTS: 3,
  MAX_PICK: 5,
  TIME_LIMIT: 60,
  THRESHOLD_BASE: 36,
};

// UI 설정
export const UI_CONFIG = {
  COLORS: {
    PRIMARY: "#38bdf8",
    SECONDARY: "#0f1020",
    TEXT: "#e5e7eb",
    // ...
  },
  FONTS: {
    DEFAULT: "Arial",
    SIZES: {
      SMALL: "10px",
      MEDIUM: "12px",
      LARGE: "14px",
    },
  },
  // ...
};

// 게임 모드 타입
export const GAME_MODES = {
  ROGUELIKE: "roguelike",
  COOKING: "cooking",
  POPUP: "popup",
};
```

#### CookingData.js

```javascript
// 재료 데이터 (기존과 동일)
export const INGREDIENTS = [
  /* ... */
];

// 미식가 취향 (기존과 동일)
export const PALATES = [
  /* ... */
];

// 시너지 규칙 (기존과 동일)
export const SYNERGY = {
  /* ... */
};

// 새로운 요리 게임 설정
export const COOKING_CONFIG = {
  MAX_INGREDIENTS: 5,
  TIME_LIMIT: 60,
  BASE_SCORE: 3,
  SYNERGY_MULTIPLIER: 1.5,
  DIVERSITY_BONUS: 2,
  PENALTY_THRESHOLD: 4,
};

// 난이도 설정
export const DIFFICULTY_LEVELS = {
  EASY: { name: "쉬움", timeLimit: 90, maxIngredients: 3, requiredScore: 20 },
  NORMAL: { name: "보통", timeLimit: 60, maxIngredients: 4, requiredScore: 30 },
  HARD: { name: "어려움", timeLimit: 45, maxIngredients: 5, requiredScore: 40 },
};
```

#### RoguelikeData.js

```javascript
// 무기 데이터 (기존과 동일)
export const WEAPONS = [
  /* ... */
];

// 방어구 데이터 (기존과 동일)
export const ARMORS = [
  /* ... */
];

// 적 데이터 (확장됨)
export const ENEMY_TYPES = {
  goblin: {
    name: "도적 고블린",
    symbol: "g",
    hp: [5, 7],
    atk: [1, 4],
    exp: 9,
    color: "#f87171", // 새로 추가
    speed: 1, // 새로 추가
    ai: "aggressive", // 새로 추가
  },
  // ...
};

// 아이템 정의 (확장됨)
export const ITEM_DEFINITIONS = {
  potion: {
    symbol: "!",
    name: "체력 물약",
    color: 0x34d399,
    description: "HP를 6-10 회복합니다.", // 새로 추가
    value: 1, // 새로 추가
  },
  // ...
};

// 새로운 게임 밸런스 설정
export const BALANCE_CONFIG = {
  HUNGER_DECAY_RATE: 1,
  HUNGER_DAMAGE_THRESHOLD: 0,
  HUNGER_WARNING_THRESHOLD: 40,
  EXP_CURVE: 15,
  LEVEL_SCALING: 0.3,
  DAMAGE_VARIANCE: 0.2,
};
```

## 마이그레이션 가이드

### 1. 기존 코드 업데이트

#### 데이터 Import 변경

**이전 코드:**

```javascript
import {
  ROGUELIKE_CONFIG,
  WEAPONS,
  ARMORS,
  ENEMY_TYPES,
  ITEM_TYPES,
} from "../data/GameData.js";
```

**권장 코드 (새로운 방식):**

```javascript
import { ROGUELIKE_CONFIG, UI_CONFIG } from "../data/Config.js";
import {
  WEAPONS,
  ARMORS,
  ENEMY_TYPES,
  ITEM_DEFINITIONS,
} from "../data/RoguelikeData.js";
import { RoguelikeGameLogic } from "../logic/RoguelikeGameLogic.js";
```

**호환 코드 (기존 방식 유지):**

```javascript
import {
  ROGUELIKE_CONFIG,
  WEAPONS,
  ARMORS,
  ENEMY_TYPES,
  ITEM_DEFINITIONS,
} from "../data/GameData.js";
```

#### 게임 로직 분리

**이전 코드 (RoguelikeScene.js):**

```javascript
export default class GameScene extends Phaser.Scene {
  preload() {
    // 게임 상태 직접 관리
    this.gameState = {
      level: 1,
      map: [],
      player: {
        /* ... */
      },
      // ... 기타 상태들
    };
  }

  // 게임 로직과 UI가 혼재
  tryMove(dx, dy) {
    // 이동 로직
    // 충돌 체크
    // 아이템 픽업
    // 함정 체크
    // 렌더링
  }
}
```

**리팩토링 후:**

```javascript
export default class GameScene extends Phaser.Scene {
  preload() {
    // 게임 로직 인스턴스 생성
    this.gameLogic = new RoguelikeGameLogic();
  }

  // UI와 렌더링만 담당
  update() {
    // 입력 처리
    if (moved) {
      this.gameLogic.tryMove(dx, dy);
      this.gameLogic.endTurn();
    }

    // 렌더링 및 UI 업데이트
    this.render();
    this.updateHUD();
  }
}
```

### 2. API 변경사항

#### ITEM_TYPES → ITEM_DEFINITIONS

```javascript
// 이전
const itemType = ITEM_TYPES[item.type];

// 이후
const itemType = ITEM_DEFINITIONS[item.type];
```

#### 새로운 설정 접근

```javascript
// UI 색상 사용
const primaryColor = UI_CONFIG.COLORS.PRIMARY;

// 게임 모드 확인
if (currentMode === GAME_MODES.ROGUELIKE) {
  // 로그라이크 게임 로직
}
```

### 3. 점진적 마이그레이션

1. **1단계**: 기존 import 유지하면서 새 모듈 추가
2. **2단계**: 새로운 코드에서는 개별 모듈 사용
3. **3단계**: 기존 코드를 점진적으로 개별 모듈로 변경
4. **4단계**: GameData.js를 통합 모듈로만 사용

## 새로운 모듈 구조

### 1. 모듈 의존성

```
Config.js (독립)
├── CookingData.js (Config.js 의존)
├── RoguelikeData.js (Config.js 의존)
├── RoguelikeGameLogic.js (Config.js, RoguelikeData.js 의존)
├── RoguelikeScene.js (Config.js, RoguelikeData.js, RoguelikeGameLogic.js 의존)
└── GameData.js (모든 모듈 의존)
```

### 2. Import 패턴

#### 최적화된 Import

```javascript
// 필요한 것만 import
import { GAME_CONFIG, ROGUELIKE_CONFIG } from "../data/Config.js";
import { WEAPONS, ENEMY_TYPES } from "../data/RoguelikeData.js";
import { RoguelikeGameLogic } from "../logic/RoguelikeGameLogic.js";
```

#### 게임 로직 사용

```javascript
// 게임 로직 인스턴스 생성
this.gameLogic = new RoguelikeGameLogic();

// 게임 상태 접근
const gameState = this.gameLogic.getGameState();

// 게임 로직 실행
this.gameLogic.tryMove(dx, dy);
this.gameLogic.endTurn();
```

#### 네임스페이스 Import

```javascript
// 관련 데이터를 그룹으로 import
import * as Config from "../data/Config.js";
import * as Roguelike from "../data/RoguelikeData.js";
import * as Logic from "../logic/RoguelikeGameLogic.js";
```

#### 통합 Import (하위 호환성)

```javascript
// 기존 코드와 호환
import { GAME_CONFIG, INGREDIENTS, WEAPONS } from "../data/GameData.js";
```

## 성능 개선

### 1. 번들 크기 최적화

- **Tree-shaking**: 사용하지 않는 코드 자동 제거
- **모듈별 로딩**: 필요한 데이터만 로드
- **코드 분할**: 게임 모드별로 독립적인 번들 생성 가능
- **게임 로직 분리**: UI와 로직 분리로 더 세밀한 코드 분할 가능

### 2. 메모리 사용량 감소

- **지연 로딩**: 필요할 때만 데이터 로드
- **캐싱**: 자주 사용되는 데이터 캐시
- **가비지 컬렉션**: 사용하지 않는 데이터 자동 해제
- **상태 관리 최적화**: 게임 로직과 UI 상태 분리로 메모리 효율성 향상

### 3. 로딩 시간 단축

- **병렬 로딩**: 모듈을 병렬로 로드
- **압축**: 모듈별 압축으로 전송 크기 감소
- **캐싱**: 브라우저 캐시 활용
- **독립적 로딩**: 게임 로직과 UI를 독립적으로 로드 가능

### 4. 개발 및 테스트 개선

- **단위 테스트**: 게임 로직을 독립적으로 테스트 가능
- **모킹**: UI 없이 게임 로직만 테스트 가능
- **디버깅**: 로직과 UI 문제를 분리하여 디버깅 용이
- **재사용성**: 다른 UI 프레임워크에서도 게임 로직 재사용 가능

## 호환성

### 1. 하위 호환성

- 기존 `GameData.js` import는 계속 작동
- 기존 API는 모두 유지
- 점진적 마이그레이션 가능

### 2. 브라우저 호환성

- ES6 모듈 지원 브라우저 필요
- Vite 빌드 도구 사용으로 호환성 보장

### 3. 개발 도구 호환성

- ESLint, Prettier 등 개발 도구와 호환
- IDE 자동완성 지원
- TypeScript 지원 준비

## 마이그레이션 체크리스트

### 개발자용 체크리스트

- [ ] 새로운 모듈 구조 이해
- [ ] 기존 코드에서 새로운 import 패턴 적용
- [ ] ITEM_TYPES → ITEM_DEFINITIONS 변경
- [ ] 새로운 설정값 활용 (UI_CONFIG 등)
- [ ] 불필요한 import 제거
- [ ] 게임 로직과 UI 분리 적용
- [ ] RoguelikeGameLogic 클래스 사용법 숙지
- [ ] 게임 상태 접근 방식 변경 (this.gameState → this.gameLogic.getGameState())

### 코드 리뷰 체크리스트

- [ ] 올바른 모듈에서 데이터 import
- [ ] 사용하지 않는 import 제거
- [ ] 새로운 API 올바르게 사용
- [ ] 성능에 영향을 주는 패턴 사용하지 않음
- [ ] 하위 호환성 유지
- [ ] 게임 로직이 UI와 분리되어 있는지 확인
- [ ] RoguelikeGameLogic을 통한 게임 상태 접근 확인
- [ ] UI 렌더링과 게임 로직이 적절히 분리되었는지 확인

## 향후 계획

### 1. 단기 계획

- [x] GameData.js 모듈 분리 완료
- [x] RoguelikeScene.js 게임 로직 분리 완료
- [x] Utils.js 리팩토링 완료
- [x] CookingGameLogic 클래스 생성 완료
- [x] CookingScene.js 리팩토링 완료
- [ ] 모든 씬에서 새로운 import 패턴 적용
- [ ] 사용하지 않는 코드 제거
- [ ] 성능 측정 및 최적화
- [ ] 단위 테스트 작성

### 2. 중기 계획

- [ ] TypeScript 도입
- [ ] 더 세분화된 모듈 구조
- [ ] 동적 로딩 시스템
- [ ] 게임 로직 테스트 커버리지 확대
- [ ] 다른 게임 모드에도 로직 분리 적용

### 3. 장기 계획

- [ ] 마이크로프론트엔드 아키텍처
- [ ] 플러그인 시스템
- [ ] 모듈별 독립 배포
- [ ] 게임 로직 서버 사이드 실행 지원

## 리팩토링 결과 요약

### 코드 품질 개선

- **RoguelikeScene.js**: 1225줄 → 461줄 (62% 감소)
- **Utils.js**: 126줄 → 189줄 (공통 유틸리티로 확장)
- **관심사 분리**: 게임 로직과 UI 완전 분리
- **재사용성**: RoguelikeGameLogic, CookingGameLogic 클래스로 로직 재사용 가능
- **테스트 가능성**: 게임 로직을 독립적으로 테스트 가능
- **모듈화**: 각 게임 모드별로 독립적인 로직 클래스

### 성능 개선

- **번들 크기**: Tree-shaking으로 불필요한 코드 제거
- **메모리 효율성**: 상태 관리 최적화
- **로딩 시간**: 모듈별 독립 로딩 가능

### 개발 경험 개선

- **디버깅**: 로직과 UI 문제 분리하여 디버깅 용이
- **유지보수성**: 각 모듈의 책임이 명확해짐
- **확장성**: 새로운 게임 모드 추가 시 기존 구조 재사용 가능

이 리팩토링을 통해 GNG 프로젝트는 더욱 확장 가능하고 유지보수하기 쉬운 구조를 갖게 되었습니다.
