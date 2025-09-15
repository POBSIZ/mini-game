/**
 * 공통 게임 유틸리티 함수들
 * 여러 게임에서 공통으로 사용되는 순수 함수들
 *
 * 이 파일은 하위 호환성을 위해 유지되며,
 * 새로운 코드에서는 개별 모듈을 직접 import하는 것을 권장합니다.
 */

// 수학 관련 유틸리티
export {
  calculateDistance,
  calculateManhattanDistance,
  clamp,
  lerp,
  degreesToRadians,
  radiansToDegrees,
  dotProduct,
  vectorMagnitude,
  normalizeVector,
  angleBetweenVectors,
  isPointInCircle,
  isPointInRectangle,
  rectanglesOverlap,
  bezierCurve,
  weightedAverage,
  exponentialDecay,
  sigmoid,
  type Vector2D,
  type Rectangle,
} from "./MathUtils.js";

// 배열 관련 유틸리티
export {
  combosOf,
  permutationsOf,
  shuffleArray,
  getRandomElement,
  getRandomElements,
  chunkArray,
  removeDuplicates,
  groupBy,
  sortArray,
  findMax,
  findMin,
  calculateAverage,
  calculateSum,
  findFirst,
  findAll,
  countBy,
  flattenArray,
  randomizeArray,
  intersection,
  union,
  difference,
} from "./ArrayUtils.js";

// 시간 관련 유틸리티
export {
  formatTime,
  formatTimeLong,
  formatDuration,
  getCurrentTimestamp,
  getTimeDifference,
  hasTimeElapsed,
  Timer,
  debounce,
  throttle,
  throttleFrame,
  delay,
  interval,
  nextFrame,
  timeBasedLerp,
  EasingFunctions,
} from "./TimeUtils.js";

/**
 * 숫자 범위 내에서 랜덤 정수 생성
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 숫자 범위 내에서 랜덤 실수 생성
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * 확률 기반 랜덤 선택
 */
export function randomChoice<T>(choices: T[], weights?: number[]): T | null {
  if (!weights) {
    return choices[Math.floor(Math.random() * choices.length)];
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < choices.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return choices[i];
    }
  }

  return choices[choices.length - 1];
}

/**
 * 점수에 콤마 추가
 */
export function formatScore(score: number): string {
  return score.toLocaleString();
}

/**
 * 객체의 깊은 복사
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array)
    return obj.map((item) => deepClone(item)) as unknown as T;
  if (typeof obj === "object") {
    const cloned = {} as T;
    Object.keys(obj).forEach((key) => {
      (cloned as any)[key] = deepClone((obj as any)[key]);
    });
    return cloned;
  }
  return obj;
}

export function strHexToNumber(str: string | number): number {
  if (typeof str === "number") return str;
  return parseInt(str.replace("#", ""), 16);
}
