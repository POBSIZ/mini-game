/**
 * 게임 전역 설정 상수
 * 모든 게임 모드에서 공통으로 사용되는 설정값들을 관리합니다.
 */

// 기본 게임 설정
export const GAME_CONFIG = {
  BASE_POINTS: 3,
  MAX_PICK: 5,
  TIME_LIMIT: 60,
} as const;

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
  // 화면에 보이는 타일 수 (카메라용) - 더 넓은 시야를 위해 확장
  SCREEN_WIDTH: 50,
  SCREEN_HEIGHT: 30,
} as const;

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
      SMALL: "14px",
      MEDIUM: "16px",
      LARGE: "18px",
      XLARGE: "20px",
      TITLE: "28px",
    },
  },
  SPACING: {
    SMALL: 8,
    MEDIUM: 16,
    LARGE: 24,
    XLARGE: 32,
  },
} as const;

// 게임 모드 타입
export const GAME_MODES = {
  ROGUELIKE: "roguelike",
  COOKING: "cooking",
  POPUP: "popup",
} as const;

// 아이템 타입 상수
export const ITEM_TYPES = {
  POTION: "potion",
  WEAPON: "weapon",
  ARMOR: "armor",
  FOOD: "food",
  COOKED_FOOD: "cooked_food",
  TRAP: "trap",
  STAIRS: "stairs",
} as const;

// 맵 타일 타입
export const TILE_TYPES = {
  WALL: 1,
  FLOOR: 0,
  STAIRS: 2,
} as const;

// 플레이어 상태
export const PLAYER_STATES = {
  IDLE: "idle",
  MOVING: "moving",
  ATTACKING: "attacking",
  DEAD: "dead",
} as const;

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
} as const;

// 타입 정의
export type GameMode = typeof GAME_MODES[keyof typeof GAME_MODES];
export type ItemType = typeof ITEM_TYPES[keyof typeof ITEM_TYPES];
export type TileType = typeof TILE_TYPES[keyof typeof TILE_TYPES];
export type PlayerState = typeof PLAYER_STATES[keyof typeof PLAYER_STATES];
export type GameEvent = typeof GAME_EVENTS[keyof typeof GAME_EVENTS];

export interface Direction {
  x: number;
  y: number;
}
