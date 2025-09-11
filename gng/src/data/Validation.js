/**
 * 데이터 검증 유틸리티
 * 게임 데이터의 유효성을 검증하는 함수들을 제공합니다.
 */

import { ITEM_TYPES, TILE_TYPES, PLAYER_STATES, GAME_MODES } from "./Config.js";

/**
 * 아이템 타입이 유효한지 검증
 * @param {string} itemType - 검증할 아이템 타입
 * @returns {boolean} 유효성 여부
 */
export function isValidItemType(itemType) {
  return Object.values(ITEM_TYPES).includes(itemType);
}

/**
 * 타일 타입이 유효한지 검증
 * @param {number} tileType - 검증할 타일 타입
 * @returns {boolean} 유효성 여부
 */
export function isValidTileType(tileType) {
  return Object.values(TILE_TYPES).includes(tileType);
}

/**
 * 플레이어 상태가 유효한지 검증
 * @param {string} playerState - 검증할 플레이어 상태
 * @returns {boolean} 유효성 여부
 */
export function isValidPlayerState(playerState) {
  return Object.values(PLAYER_STATES).includes(playerState);
}

/**
 * 게임 모드가 유효한지 검증
 * @param {string} gameMode - 검증할 게임 모드
 * @returns {boolean} 유효성 여부
 */
export function isValidGameMode(gameMode) {
  return Object.values(GAME_MODES).includes(gameMode);
}

/**
 * 좌표가 유효한 범위 내에 있는지 검증
 * @param {number} x - X 좌표
 * @param {number} y - Y 좌표
 * @param {number} maxX - 최대 X 좌표
 * @param {number} maxY - 최대 Y 좌표
 * @returns {boolean} 유효성 여부
 */
export function isValidCoordinate(x, y, maxX, maxY) {
  return x >= 0 && x < maxX && y >= 0 && y < maxY;
}

/**
 * HP 값이 유효한지 검증
 * @param {number} hp - HP 값
 * @param {number} maxHp - 최대 HP
 * @returns {boolean} 유효성 여부
 */
export function isValidHP(hp, maxHp) {
  return typeof hp === "number" && hp >= 0 && hp <= maxHp;
}

/**
 * 경험치 값이 유효한지 검증
 * @param {number} exp - 경험치 값
 * @returns {boolean} 유효성 여부
 */
export function isValidExp(exp) {
  return typeof exp === "number" && exp >= 0;
}

/**
 * 아이템 객체가 유효한지 검증
 * @param {Object} item - 검증할 아이템 객체
 * @returns {boolean} 유효성 여부
 */
export function isValidItem(item) {
  if (!item || typeof item !== "object") return false;
  
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    isValidItemType(item.type) &&
    typeof item.x === "number" &&
    typeof item.y === "number"
  );
}

/**
 * 적 객체가 유효한지 검증
 * @param {Object} enemy - 검증할 적 객체
 * @returns {boolean} 유효성 여부
 */
export function isValidEnemy(enemy) {
  if (!enemy || typeof enemy !== "object") return false;
  
  return (
    typeof enemy.id === "string" &&
    typeof enemy.type === "string" &&
    typeof enemy.x === "number" &&
    typeof enemy.y === "number" &&
    isValidHP(enemy.hp, enemy.maxHp || enemy.hp)
  );
}

/**
 * 플레이어 객체가 유효한지 검증
 * @param {Object} player - 검증할 플레이어 객체
 * @returns {boolean} 유효성 여부
 */
export function isValidPlayer(player) {
  if (!player || typeof player !== "object") return false;
  
  return (
    typeof player.x === "number" &&
    typeof player.y === "number" &&
    isValidHP(player.hp, player.max) &&
    isValidExp(player.exp) &&
    typeof player.level === "number" &&
    player.level > 0 &&
    typeof player.hunger === "number" &&
    player.hunger >= 0 &&
    player.hunger <= 100
  );
}

/**
 * 게임 상태 객체가 유효한지 검증
 * @param {Object} gameState - 검증할 게임 상태 객체
 * @returns {boolean} 유효성 여부
 */
export function isValidGameState(gameState) {
  if (!gameState || typeof gameState !== "object") return false;
  
  return (
    typeof gameState.level === "number" &&
    gameState.level > 0 &&
    Array.isArray(gameState.map) &&
    Array.isArray(gameState.enemies) &&
    Array.isArray(gameState.items) &&
    Array.isArray(gameState.inventory) &&
    Array.isArray(gameState.messages) &&
    isValidPlayer(gameState.player)
  );
}

/**
 * 요리 재료가 유효한지 검증
 * @param {Object} ingredient - 검증할 재료 객체
 * @returns {boolean} 유효성 여부
 */
export function isValidIngredient(ingredient) {
  if (!ingredient || typeof ingredient !== "object") return false;
  
  return (
    typeof ingredient.id === "string" &&
    typeof ingredient.name === "string" &&
    typeof ingredient.icon === "string" &&
    typeof ingredient.stock === "number" &&
    ingredient.stock >= 0 &&
    Array.isArray(ingredient.tags)
  );
}

/**
 * 미식가 취향이 유효한지 검증
 * @param {Object} palate - 검증할 미식가 취향 객체
 * @returns {boolean} 유효성 여부
 */
export function isValidPalate(palate) {
  if (!palate || typeof palate !== "object") return false;
  
  return (
    typeof palate.id === "string" &&
    typeof palate.name === "string" &&
    Array.isArray(palate.likes) &&
    Array.isArray(palate.hates)
  );
}

/**
 * 레시피가 유효한지 검증
 * @param {Object} recipe - 검증할 레시피 객체
 * @returns {boolean} 유효성 여부
 */
export function isValidRecipe(recipe) {
  if (!recipe || typeof recipe !== "object") return false;
  
  return (
    typeof recipe.id === "string" &&
    typeof recipe.name === "string" &&
    Array.isArray(recipe.ingredients) &&
    recipe.ingredients.length > 0 &&
    typeof recipe.score === "number" &&
    recipe.score > 0
  );
}

/**
 * 배열의 모든 요소가 유효한지 검증
 * @param {Array} array - 검증할 배열
 * @param {Function} validator - 각 요소를 검증할 함수
 * @returns {boolean} 유효성 여부
 */
export function validateArray(array, validator) {
  if (!Array.isArray(array)) return false;
  return array.every(validator);
}

/**
 * 객체의 필수 속성이 모두 존재하는지 검증
 * @param {Object} obj - 검증할 객체
 * @param {Array} requiredKeys - 필수 키 배열
 * @returns {boolean} 유효성 여부
 */
export function hasRequiredKeys(obj, requiredKeys) {
  if (!obj || typeof obj !== "object") return false;
  return requiredKeys.every(key => key in obj);
}
