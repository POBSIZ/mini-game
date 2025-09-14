/**
 * 데이터 검증 유틸리티
 * 게임 데이터의 유효성을 검증하는 함수들을 제공합니다.
 */

import { ITEM_TYPES, TILE_TYPES, PLAYER_STATES, GAME_MODES, type ItemType, type TileType, type PlayerState, type GameMode } from "./Config.js";

// 아이템 타입 정의
export interface Item {
  id?: string;
  name: string;
  type: ItemType;
  x?: number;
  y?: number;
  [key: string]: any; // 추가 속성들을 위한 인덱스 시그니처
}

// 적 타입 정의
export interface Enemy {
  id?: string;
  type: string;
  x: number;
  y: number;
  hp: number;
  maxHp?: number;
  atk?: [number, number];
  exp?: number;
  facing?: string;
  [key: string]: any; // 추가 속성들을 위한 인덱스 시그니처
}

// 플레이어 타입 정의
export interface Player {
  x: number;
  y: number;
  hp: number;
  max: number;
  exp: number;
  level: number;
  hunger: number;
  atk?: [number, number];
  nextExp?: number;
  facing?: string;
  [key: string]: any; // 추가 속성들을 위한 인덱스 시그니처
}

// 게임 상태 타입 정의
export interface GameState {
  level: number;
  map: any[];
  enemies: Enemy[];
  items: Item[];
  inventory: Item[];
  messages: any[];
  player: Player;
  gameOver?: boolean;
  inventoryOpen?: boolean;
  equip?: any;
  seen?: any[];
  visible?: any[];
  brightness?: any[];
  traps?: any[];
  [key: string]: any; // 추가 속성들을 위한 인덱스 시그니처
}

// 요리 게임 상태 타입 정의
export interface CookingGameState {
  currentPlate: any[];
  score: number;
  timeLeft: number;
  gameStarted: boolean;
  gameEnded: boolean;
  messages: any[];
  [key: string]: any; // 추가 속성들을 위한 인덱스 시그니처
}

// 재료 타입 정의
export interface Ingredient {
  id: string;
  name: string;
  icon: string;
  stock: number;
  tags: string[];
}

// 미식가 취향 타입 정의
export interface Palate {
  id: string;
  name: string;
  likes: string[];
  hates: string[];
}

// 레시피 타입 정의
export interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
  score: number;
}

/**
 * 아이템 타입이 유효한지 검증
 */
export function isValidItemType(itemType: string): itemType is ItemType {
  return Object.values(ITEM_TYPES).includes(itemType as ItemType);
}

/**
 * 타일 타입이 유효한지 검증
 */
export function isValidTileType(tileType: number): tileType is TileType {
  return Object.values(TILE_TYPES).includes(tileType as TileType);
}

/**
 * 플레이어 상태가 유효한지 검증
 */
export function isValidPlayerState(playerState: string): playerState is PlayerState {
  return Object.values(PLAYER_STATES).includes(playerState as PlayerState);
}

/**
 * 게임 모드가 유효한지 검증
 */
export function isValidGameMode(gameMode: string): gameMode is GameMode {
  return Object.values(GAME_MODES).includes(gameMode as GameMode);
}

/**
 * 좌표가 유효한 범위 내에 있는지 검증
 */
export function isValidCoordinate(x: number, y: number, maxX: number, maxY: number): boolean {
  return x >= 0 && x < maxX && y >= 0 && y < maxY;
}

/**
 * HP 값이 유효한지 검증
 */
export function isValidHP(hp: number, maxHp: number): boolean {
  return typeof hp === "number" && hp >= 0 && hp <= maxHp;
}

/**
 * 경험치 값이 유효한지 검증
 */
export function isValidExp(exp: number): boolean {
  return typeof exp === "number" && exp >= 0;
}

/**
 * 아이템 객체가 유효한지 검증
 */
export function isValidItem(item: any): item is Item {
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
 */
export function isValidEnemy(enemy: any): enemy is Enemy {
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
 */
export function isValidPlayer(player: any): player is Player {
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
 */
export function isValidGameState(gameState: any): gameState is GameState {
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
 */
export function isValidIngredient(ingredient: any): ingredient is Ingredient {
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
 */
export function isValidPalate(palate: any): palate is Palate {
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
 */
export function isValidRecipe(recipe: any): recipe is Recipe {
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
 */
export function validateArray<T>(array: any, validator: (item: any) => item is T): array is T[] {
  if (!Array.isArray(array)) return false;
  return array.every(validator);
}

/**
 * 요리 게임 상태 객체가 유효한지 검증
 */
export function isValidCookingGameState(gameState: any): gameState is CookingGameState {
  if (!gameState || typeof gameState !== "object") return false;

  return (
    Array.isArray(gameState.currentPlate) &&
    typeof gameState.score === "number" &&
    typeof gameState.timeLeft === "number" &&
    typeof gameState.gameStarted === "boolean" &&
    typeof gameState.gameEnded === "boolean" &&
    Array.isArray(gameState.messages)
  );
}

/**
 * 객체의 필수 속성이 모두 존재하는지 검증
 */
export function hasRequiredKeys(obj: any, requiredKeys: string[]): boolean {
  if (!obj || typeof obj !== "object") return false;
  return requiredKeys.every((key) => key in obj);
}
