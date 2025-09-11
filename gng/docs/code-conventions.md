# 코드 컨벤션

GNG 프로젝트의 일관된 코드 품질과 가독성을 위한 코딩 스타일 가이드입니다.

## 📋 목차

- [JavaScript 컨벤션](#javascript-컨벤션)
- [CSS 컨벤션](#css-컨벤션)
- [HTML 컨벤션](#html-컨벤션)
- [파일 명명 규칙](#파일-명명-규칙)
- [주석 작성 규칙](#주석-작성-규칙)
- [에러 처리](#에러-처리)

## JavaScript 컨벤션

### 1. 기본 스타일

```javascript
// ✅ 좋은 예
const playerHealth = 100;
const isGameActive = true;

// ❌ 나쁜 예
const playerhealth = 100;
const isgameactive = true;
```

### 2. 변수 및 함수 명명

```javascript
// ✅ camelCase 사용
const gameState = {};
const playerPosition = { x: 0, y: 0 };

// 함수명은 동사로 시작
function createPlayer() {}
function updateGameState() {}
function calculateScore() {}

// 상수는 UPPER_SNAKE_CASE
const GAME_CONFIG = {
  MAX_LEVEL: 10,
  TILE_SIZE: 32,
};

// 클래스는 PascalCase
class RoguelikeScene extends Phaser.Scene {}
class PlayerController {}
```

### 3. ES6+ 문법 사용

```javascript
// ✅ 화살표 함수 사용
const processItems = (items) => {
  return items.filter((item) => item.isActive);
};

// ✅ 구조 분해 할당
const { width, height } = this.scale;
const { x, y } = playerPosition;

// ✅ 템플릿 리터럴
const message = `플레이어 레벨: ${level}`;

// ✅ 스프레드 연산자
const newInventory = [...inventory, newItem];
```

### 4. 모듈 시스템

```javascript
// ✅ 명시적 import/export
import Phaser from "phaser";
import { GAME_CONFIG, UI_CONFIG } from "../data/Config.js";
import { INGREDIENTS, PALATES } from "../data/CookingData.js";
import { WEAPONS, ENEMY_TYPES } from "../data/RoguelikeData.js";

// ✅ 네임스페이스 import
import * as Utils from "../utils/Utils.js";

// ✅ 기본 export
export default class RoguelikeScene extends Phaser.Scene {}

// ✅ 명명된 export
export const calculateScore = (plate, palate) => {};
export const generateDishName = (plate, palate) => {};

// ✅ 하위 호환성을 위한 통합 import (권장하지 않음)
import { GAME_CONFIG, INGREDIENTS, WEAPONS } from "../data/GameData.js";
```

#### 4.1 모듈 import 우선순위

```javascript
// 1순위: 개별 모듈에서 직접 import (권장)
import { GAME_CONFIG } from "../data/Config.js";
import { INGREDIENTS } from "../data/CookingData.js";

// 2순위: 통합 모듈에서 import (하위 호환성)
import { GAME_CONFIG, INGREDIENTS } from "../data/GameData.js";

// ❌ 피해야 할 패턴: 모든 데이터를 한 번에 import
import * as GameData from "../data/GameData.js";
```

### 5. 객체 및 배열

```javascript
// ✅ 객체 리터럴
const player = {
  name: "Player",
  health: 100,
  position: { x: 0, y: 0 },
};

// ✅ 배열 메서드 체이닝
const activeItems = items
  .filter((item) => item.isActive)
  .map((item) => item.name)
  .sort();
```

## CSS 컨벤션

### 1. 클래스 명명 (BEM 방법론)

```css
/* ✅ BEM 방식 */
.game-container {
}
.game-container__header {
}
.game-container__content {
}
.game-container__content--active {
}

/* ❌ 나쁜 예 */
.gameContainer {
}
.game_container {
}
.gameContainerContent {
}
```

### 2. 속성 순서

```css
/* ✅ 논리적 순서 */
.element {
  /* 위치 */
  position: relative;
  top: 0;
  left: 0;

  /* 크기 */
  width: 100px;
  height: 100px;

  /* 박스 모델 */
  margin: 10px;
  padding: 5px;
  border: 1px solid #000;

  /* 시각적 */
  background: #fff;
  color: #000;
  font-size: 14px;

  /* 기타 */
  cursor: pointer;
  user-select: none;
}
```

### 3. CSS 변수 사용

```css
/* ✅ CSS 변수 정의 */
:root {
  --primary-color: #38bdf8;
  --secondary-color: #0f1020;
  --text-color: #e5e7eb;
  --border-radius: 8px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
}

/* ✅ CSS 변수 사용 */
.button {
  background: var(--primary-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-sm) var(--spacing-md);
}
```

## HTML 컨벤션

### 1. 기본 구조

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GNG</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

### 2. 속성 순서

```html
<!-- ✅ 논리적 순서 -->
<img
  src="/assets/player.png"
  alt="플레이어 캐릭터"
  class="player-sprite"
  id="player"
  width="32"
  height="32"
/>
```

## 파일 명명 규칙

### 1. 파일명 규칙

```
✅ 좋은 예
- RoguelikeScene.js
- CookingScene.js
- GameData.js
- Utils.js
- style.css

❌ 나쁜 예
- gameScene.js
- popup-game-scene.js
- game_data.js
- gameLogic.js
```

### 2. 폴더 구조

```
src/
├── main.js              # 진입점
├── scenes/              # 씬 파일들
│   ├── RoguelikeScene.js
│   └── CookingScene.js
├── data/                # 데이터 파일들
│   └── GameData.js
├── utils/               # 유틸리티 함수들
│   └── Utils.js
└── style/               # 스타일 파일들
    └── style.css
```

## 주석 작성 규칙

### 1. JSDoc 스타일

```javascript
/**
 * 플레이어 점수를 계산합니다.
 * @param {Array} plate - 접시에 담긴 재료 배열
 * @param {Object} palate - 플레이어 취향 객체
 * @returns {Object} 점수와 노트를 포함한 객체
 */
export function calculateScore(plate, palate) {
  // 구현...
}
```

### 2. 인라인 주석

```javascript
// 게임 상태 초기화
this.gameState = {
  level: 1,
  map: [],
  // ... 기타 속성들
};

// HUD 패널 생성
this.hudPanel = this.add.rectangle(width / 2, 60, width - 20, 40, 0x12161b);
```

### 3. 섹션 주석

```javascript
// ===========================================
// UI 생성
// ===========================================
createUI() {
  // UI 생성 로직
}

// ===========================================
// 입력 처리
// ===========================================
setupInput() {
  // 입력 처리 로직
}
```

## 데이터 조직화 패턴

### 1. 모듈별 데이터 분리

```javascript
// ✅ 게임 모드별로 데이터 분리
// Config.js - 공통 설정
export const GAME_CONFIG = {
  /* ... */
};
export const UI_CONFIG = {
  /* ... */
};

// CookingData.js - 요리 게임 데이터
export const INGREDIENTS = [
  /* ... */
];
export const PALATES = [
  /* ... */
];

// RoguelikeData.js - 로그라이크 게임 데이터
export const WEAPONS = [
  /* ... */
];
export const ENEMY_TYPES = {
  /* ... */
};
```

### 2. 상수 명명 규칙

```javascript
// ✅ 설정 상수는 UPPER_SNAKE_CASE
export const GAME_CONFIG = {
  MAX_LEVEL: 10,
  TILE_SIZE: 32,
};

// ✅ 데이터 배열은 복수형으로 명명
export const INGREDIENTS = [
  /* ... */
];
export const WEAPONS = [
  /* ... */
];

// ✅ 객체 타입은 단수형 + _TYPES
export const ENEMY_TYPES = {
  /* ... */
};
export const ITEM_DEFINITIONS = {
  /* ... */
};
```

### 3. 데이터 구조 일관성

```javascript
// ✅ 모든 아이템은 동일한 구조
export const ITEM_DEFINITIONS = {
  potion: {
    symbol: "!",
    name: "체력 물약",
    color: 0x34d399,
    description: "HP를 6-10 회복합니다.",
    value: 1,
  },
  weapon: {
    symbol: ")",
    name: "무기",
    color: 0xfbbf24,
    description: "공격력을 증가시킵니다.",
    value: 2,
  },
};

// ✅ 모든 적은 동일한 구조
export const ENEMY_TYPES = {
  goblin: {
    name: "도적 고블린",
    symbol: "g",
    hp: [5, 7],
    atk: [1, 4],
    exp: 9,
    color: "#f87171",
    speed: 1,
    ai: "aggressive",
  },
};
```

### 4. 설정값 그룹화

```javascript
// ✅ 관련 설정값들을 객체로 그룹화
export const UI_CONFIG = {
  COLORS: {
    PRIMARY: "#38bdf8",
    SECONDARY: "#0f1020",
    TEXT: "#e5e7eb",
  },
  FONTS: {
    DEFAULT: "Arial",
    SIZES: {
      SMALL: "10px",
      MEDIUM: "12px",
      LARGE: "14px",
    },
  },
  SPACING: {
    SMALL: 8,
    MEDIUM: 16,
    LARGE: 24,
  },
};
```

## 에러 처리

### 1. 기본 에러 처리

```javascript
// ✅ try-catch 사용
try {
  const result = calculateScore(plate, palate);
  return result;
} catch (error) {
  console.error("점수 계산 중 오류 발생:", error);
  return { score: 0, notes: ["계산 오류"] };
}

// ✅ 조건부 체크
if (!plate || !Array.isArray(plate)) {
  throw new Error("plate는 배열이어야 합니다.");
}
```

### 2. Phaser 에러 처리

```javascript
// ✅ 리소스 로딩 에러 처리
this.load.on("loaderror", (file) => {
  console.error(`리소스 로딩 실패: ${file.key}`);
  // 기본값 또는 대체 리소스 사용
});
```

## 코드 리뷰 체크리스트

- [ ] 변수명이 명확하고 의미가 있는가?
- [ ] 함수가 단일 책임을 가지는가?
- [ ] ES6+ 문법을 적절히 사용했는가?
- [ ] 주석이 필요한 부분에 적절히 작성되었는가?
- [ ] 에러 처리가 적절히 구현되었는가?
- [ ] 코드가 재사용 가능한가?
- [ ] 성능에 영향을 주는 부분이 있는가?

## 도구 설정

### ESLint 설정 (권장)

```json
{
  "extends": ["eslint:recommended"],
  "env": {
    "browser": true,
    "es2021": true
  },
  "rules": {
    "camelcase": "error",
    "no-unused-vars": "warn",
    "prefer-const": "error"
  }
}
```

### Prettier 설정 (권장)

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 80,
  "tabWidth": 2
}
```
