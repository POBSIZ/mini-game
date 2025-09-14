/**
 * 요리 게임 관련 데이터
 * 재료, 미식가 취향, 시너지 시스템 데이터를 관리합니다.
 */

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

// 시너지 타입 정의
export interface Synergy {
  pairs: Record<string, number>;
  trios: Record<string, number>;
}

// 레시피 타입 정의
export interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
  image: string;
  description: string;
  score: number;
}

// 난이도 레벨 타입 정의
export interface DifficultyLevel {
  name: string;
  timeLimit: number;
  maxIngredients: number;
  requiredScore: number;
}

// 재료 데이터 (3가지만 유지)
export const INGREDIENTS: Ingredient[] = [
  {
    id: "rabbit",
    name: "토끼고기",
    icon: "🐰",
    stock: 3,
    tags: ["단백질", "담백"],
  },
  {
    id: "mushroom",
    name: "형광버섯",
    icon: "🍄",
    stock: 3,
    tags: ["우마미", "숲향"],
  },
  {
    id: "pepper",
    name: "돌 후추",
    icon: "🪨",
    stock: 3,
    tags: ["매운", "향"],
  },
];

// 미식가 취향 (간소화)
export const PALATES: Palate[] = [
  {
    id: "simple",
    name: "심플",
    likes: ["담백"],
    hates: ["매운"],
  },
  {
    id: "spicy",
    name: "매운맛",
    likes: ["매운", "향"],
    hates: ["담백"],
  },
  {
    id: "umami",
    name: "우마미",
    likes: ["우마미", "숲향"],
    hates: ["매운"],
  },
];

// 시너지 규칙 (간소화)
export const SYNERGY: Synergy = {
  pairs: {
    "토끼고기+형광버섯": 8,
    "형광버섯+돌 후추": 6,
    "토끼고기+돌 후추": 7,
  },
  trios: {
    "토끼고기+형광버섯+돌 후추": 12,
  },
};

// 요리 게임 설정
export const COOKING_CONFIG = {
  MAX_INGREDIENTS: 5,
  TIME_LIMIT: 60,
  BASE_SCORE: 3,
  SYNERGY_MULTIPLIER: 1.5,
  DIVERSITY_BONUS: 2,
  PENALTY_THRESHOLD: 4,
} as const;

// 레시피 데이터
export const RECIPES: Recipe[] = [
  {
    id: "complete-dish",
    name: "형광 토끼고기 후추볶음",
    ingredients: ["rabbit", "mushroom", "pepper"],
    image: "rabbit-mushroom-rock-pepper-food.png",
    description: "3가지 재료가 완벽하게 조화를 이룬 특별한 요리",
    score: 15,
  },
  // 추후 다른 레시피들도 여기에 추가 가능
];

// 레시피 검색 함수
export function findRecipe(ingredientIds: string[]): Recipe | undefined {
  return RECIPES.find((recipe) => {
    if (recipe.ingredients.length !== ingredientIds.length) return false;
    return recipe.ingredients.every((id) => ingredientIds.includes(id));
  });
}

// 완성된 레시피인지 확인하는 함수
export function isCompleteRecipe(ingredientIds: string[]): boolean {
  return findRecipe(ingredientIds) !== undefined;
}

// 요리 난이도 설정
export const DIFFICULTY_LEVELS: Record<string, DifficultyLevel> = {
  EASY: {
    name: "쉬움",
    timeLimit: 90,
    maxIngredients: 3,
    requiredScore: 20,
  },
  NORMAL: {
    name: "보통",
    timeLimit: 60,
    maxIngredients: 4,
    requiredScore: 30,
  },
  HARD: {
    name: "어려움",
    timeLimit: 45,
    maxIngredients: 5,
    requiredScore: 40,
  },
};
