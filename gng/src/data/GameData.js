/**
 * 게임 데이터 통합 모듈
 * 모든 게임 데이터를 중앙에서 관리하고 재export합니다.
 *
 * 이 파일은 하위 호환성을 위해 유지되며,
 * 새로운 코드에서는 개별 모듈을 직접 import하는 것을 권장합니다.
 */

// 설정 및 상수
export {
  GAME_CONFIG,
  ROGUELIKE_CONFIG,
  UI_CONFIG,
  GAME_MODES,
  ITEM_TYPES,
  TILE_TYPES,
  PLAYER_STATES,
  GAME_EVENTS,
} from "./Config.js";

// 요리 게임 데이터
export {
  INGREDIENTS,
  PALATES,
  SYNERGY,
  COOKING_CONFIG,
  DIFFICULTY_LEVELS,
  RECIPES,
  findRecipe,
  isCompleteRecipe,
} from "./CookingData.js";

// 로그라이크 게임 데이터
export {
  WEAPONS,
  ARMORS,
  ENEMY_TYPES,
  ITEM_DEFINITIONS,
  TRAP_TYPES,
  ITEM_SPAWN_RULES,
  ENEMY_SPAWN_RULES,
  LEVEL_UP_REWARDS,
  BALANCE_CONFIG,
} from "./RoguelikeData.js";
