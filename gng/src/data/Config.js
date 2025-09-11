/**
 * 게임 전역 설정 상수
 * 모든 게임 모드에서 공통으로 사용되는 설정값들을 관리합니다.
 */

// 기본 게임 설정
export const GAME_CONFIG = {
  BASE_POINTS: 3,
  MAX_PICK: 5,
  TIME_LIMIT: 60,
  THRESHOLD_BASE: 36,
};

// 로그라이크 게임 설정
export const ROGUELIKE_CONFIG = {
  VIEW_WIDTH: 40,
  VIEW_HEIGHT: 24,
  FOV_RADIUS: 4,
  MAX_LEVEL: 5,
  START_HP: 24,
  HUNGER_MAX: 100,
  HUNGER_WARN: 40,
  TILE_SIZE: 200,
  // 화면에 보이는 타일 수 (카메라용)
  SCREEN_WIDTH: 20,
  SCREEN_HEIGHT: 15,
};

// UI 설정
export const UI_CONFIG = {
  COLORS: {
    PRIMARY: "#38bdf8",
    SECONDARY: "#0f1020",
    TEXT: "#e5e7eb",
    BACKGROUND: "#0b0d10",
    PANEL: "#12161b",
    BORDER: "#1f2937",
    DANGER: "#f87171",
    SUCCESS: "#34d399",
    WARNING: "#fbbf24",
  },
  FONTS: {
    DEFAULT: "Arial",
    SIZES: {
      SMALL: "10px",
      MEDIUM: "12px",
      LARGE: "14px",
      XLARGE: "16px",
      TITLE: "24px",
    },
  },
  SPACING: {
    SMALL: 8,
    MEDIUM: 16,
    LARGE: 24,
    XLARGE: 32,
  },
};

// 게임 모드 타입
export const GAME_MODES = {
  ROGUELIKE: "roguelike",
  COOKING: "cooking",
  POPUP: "popup",
};

// 아이템 타입 상수
export const ITEM_TYPES = {
  POTION: "potion",
  WEAPON: "weapon",
  ARMOR: "armor",
  FOOD: "food",
  TRAP: "trap",
  STAIRS: "stairs",
};

// 맵 타일 타입
export const TILE_TYPES = {
  WALL: 1,
  FLOOR: 0,
  STAIRS: 2,
};

// 플레이어 상태
export const PLAYER_STATES = {
  IDLE: "idle",
  MOVING: "moving",
  ATTACKING: "attacking",
  DEAD: "dead",
};

// 게임 이벤트 타입
export const GAME_EVENTS = {
  PLAYER_MOVE: "playerMove",
  PLAYER_ATTACK: "playerAttack",
  PLAYER_LEVEL_UP: "playerLevelUp",
  ENEMY_DEFEATED: "enemyDefeated",
  ITEM_PICKED_UP: "itemPickedUp",
  GAME_OVER: "gameOver",
  LEVEL_COMPLETE: "levelComplete",
  COOKING_START: "cookingStart",
  COOKING_END: "cookingEnd",
  INVENTORY_TOGGLE: "inventoryToggle",
  MESSAGE_ADDED: "messageAdded",
};

// 게임 상태 타입
export const GAME_STATES = {
  MENU: "menu",
  PLAYING: "playing",
  PAUSED: "paused",
  GAME_OVER: "gameOver",
  VICTORY: "victory",
};

// 방향 상수
export const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
  UP_LEFT: { x: -1, y: -1 },
  UP_RIGHT: { x: 1, y: -1 },
  DOWN_LEFT: { x: -1, y: 1 },
  DOWN_RIGHT: { x: 1, y: 1 },
};

// AI 타입
export const AI_TYPES = {
  PASSIVE: "passive",
  AGGRESSIVE: "aggressive",
  BOSS: "boss",
  GUARD: "guard",
  PATROL: "patrol",
};
