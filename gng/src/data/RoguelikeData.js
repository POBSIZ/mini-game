/**
 * 로그라이크 게임 관련 데이터
 * 무기, 방어구, 적, 아이템 데이터를 관리합니다.
 */

import { ITEM_TYPES } from "./Config.js";

// 무기 데이터
export const WEAPONS = [
  { name: "녹슨 단검", dmg: [0, 1], tier: 1, weight: 2 },
  { name: "단검 +1", dmg: [1, 2], tier: 1, weight: 3 },
  { name: "장검 +2", dmg: [2, 3], tier: 2, weight: 3 },
  { name: "룬 블레이드 +3", dmg: [3, 4], tier: 3, weight: 1 },
];

// 방어구 데이터
export const ARMORS = [
  { name: "천옷", def: 1, tier: 1, weight: 3 },
  { name: "가죽 갑옷", def: 2, tier: 1, weight: 3 },
  { name: "사슬 갑옷", def: 3, tier: 2, weight: 2 },
  { name: "룬 갑옷", def: 4, tier: 3, weight: 1 },
];

// 적 데이터
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
  slime: {
    name: "토끼",
    symbol: "s",
    hp: [6, 9],
    atk: [1, 3],
    exp: 7,
    color: "#34d399",
    speed: 0.5,
    ai: "passive",
  },
  boss: {
    name: "지하의 군주",
    symbol: "B",
    hp: [60, 80],
    atk: [4, 8],
    exp: 50,
    color: "#dc2626",
    speed: 0.8,
    ai: "boss",
  },
};

// 아이템 타입 정의
export const ITEM_DEFINITIONS = {
  [ITEM_TYPES.POTION]: {
    symbol: "!",
    name: "체력 물약",
    color: 0x34d399,
    description: "HP를 6-10 회복합니다.",
    value: 1,
  },
  [ITEM_TYPES.WEAPON]: {
    symbol: ")",
    name: "무기",
    color: 0xfbbf24,
    description: "공격력을 증가시킵니다.",
    value: 2,
  },
  [ITEM_TYPES.ARMOR]: {
    symbol: "[",
    name: "방어구",
    color: 0xfbbf24,
    description: "방어력을 증가시킵니다.",
    value: 2,
  },
  [ITEM_TYPES.FOOD]: {
    symbol: "%",
    name: "음식",
    color: 0xf59e0b,
    description: "배고픔을 35-55 회복합니다.",
    value: 1,
  },
  [ITEM_TYPES.TRAP]: {
    symbol: "^",
    name: "함정",
    color: 0xf87171,
    description: "밟으면 피해를 입습니다.",
    value: 0,
  },
  [ITEM_TYPES.STAIRS]: {
    symbol: ">",
    name: "계단",
    color: 0xfbbf24,
    description: "다음 층으로 이동합니다.",
    value: 0,
  },
  cooked_food: {
    symbol: "🍽️",
    name: "요리",
    color: 0xf59e0b,
    description: "맛있는 요리! HP와 배고픔을 회복합니다.",
    value: 1,
  },
};

// 함정 타입
export const TRAP_TYPES = {
  SPIKE: {
    name: "가시 함정",
    symbol: "^",
    damage: [3, 8],
    color: "#f87171",
    description: "밟으면 가시에 찔려 피해를 입습니다.",
  },
  POISON: {
    name: "독 함정",
    symbol: "☠",
    damage: [2, 5],
    color: "#7c3aed",
    description: "독에 중독되어 지속 피해를 입습니다.",
  },
  FIRE: {
    name: "화염 함정",
    symbol: "🔥",
    damage: [4, 7],
    color: "#f97316",
    description: "화염에 데어 피해를 입습니다.",
  },
};

// 아이템 생성 규칙
export const ITEM_SPAWN_RULES = {
  [ITEM_TYPES.POTION]: {
    minCount: 2,
    maxCount: 4,
    spawnChance: 0.8,
    tierModifier: 0.1,
  },
  [ITEM_TYPES.FOOD]: {
    minCount: 2,
    maxCount: 4,
    spawnChance: 0.7,
    tierModifier: 0.05,
  },
  [ITEM_TYPES.WEAPON]: {
    minCount: 1,
    maxCount: 2,
    spawnChance: 0.6,
    tierModifier: 0.2,
  },
  [ITEM_TYPES.ARMOR]: {
    minCount: 1,
    maxCount: 2,
    spawnChance: 0.6,
    tierModifier: 0.2,
  },
};

// 적 스폰 규칙
export const ENEMY_SPAWN_RULES = {
  goblin: {
    baseChance: 0.6,
    levelModifier: 0.1,
    maxPerLevel: 8,
  },
  slime: {
    baseChance: 0.4,
    levelModifier: 0.05,
    maxPerLevel: 6,
  },
  boss: {
    baseChance: 0,
    levelModifier: 0,
    maxPerLevel: 1,
    spawnLevel: 5,
  },
};

// 레벨업 보상
export const LEVEL_UP_REWARDS = {
  HP_GAIN: [3, 5],
  ATK_GAIN: 1,
  EXP_MULTIPLIER: 1.5,
  SKILL_POINTS: 1,
};

// 게임 밸런스 설정
export const BALANCE_CONFIG = {
  HUNGER_DECAY_RATE: 1,
  HUNGER_DAMAGE_THRESHOLD: 0,
  HUNGER_WARNING_THRESHOLD: 40,
  EXP_CURVE: 15,
  LEVEL_SCALING: 0.3,
  DAMAGE_VARIANCE: 0.2,
};
