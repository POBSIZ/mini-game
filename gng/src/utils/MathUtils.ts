/**
 * 수학 관련 유틸리티 함수들
 * 게임에서 사용되는 수학 계산을 담당합니다.
 */

// 벡터 타입 정의
export interface Vector2D {
  x: number;
  y: number;
}

// 사각형 타입 정의
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 두 점 사이의 거리 계산 (유클리드 거리)
 */
export function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 맨하탄 거리 계산
 */
export function calculateManhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

/**
 * 값이 범위 내에 있는지 확인
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 선형 보간 (lerp)
 */
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

/**
 * 각도를 라디안으로 변환
 */
export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * 라디안을 각도로 변환
 */
export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * 두 벡터의 내적 계산
 */
export function dotProduct(a: Vector2D, b: Vector2D): number {
  return a.x * b.x + a.y * b.y;
}

/**
 * 벡터의 크기 계산
 */
export function vectorMagnitude(vector: Vector2D): number {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
}

/**
 * 벡터 정규화
 */
export function normalizeVector(vector: Vector2D): Vector2D {
  const magnitude = vectorMagnitude(vector);
  if (magnitude === 0) return { x: 0, y: 0 };
  return {
    x: vector.x / magnitude,
    y: vector.y / magnitude,
  };
}

/**
 * 두 벡터 사이의 각도 계산
 */
export function angleBetweenVectors(a: Vector2D, b: Vector2D): number {
  const dot = dotProduct(a, b);
  const magA = vectorMagnitude(a);
  const magB = vectorMagnitude(b);

  if (magA === 0 || magB === 0) return 0;

  const cosAngle = dot / (magA * magB);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle)));
}

/**
 * 원형 영역 내에 점이 있는지 확인
 */
export function isPointInCircle(pointX: number, pointY: number, centerX: number, centerY: number, radius: number): boolean {
  const distance = calculateDistance(pointX, pointY, centerX, centerY);
  return distance <= radius;
}

/**
 * 사각형 영역 내에 점이 있는지 확인
 */
export function isPointInRectangle(
  pointX: number,
  pointY: number,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number
): boolean {
  return (
    pointX >= rectX &&
    pointX <= rectX + rectWidth &&
    pointY >= rectY &&
    pointY <= rectY + rectHeight
  );
}

/**
 * 두 사각형이 겹치는지 확인
 */
export function rectanglesOverlap(rect1: Rectangle, rect2: Rectangle): boolean {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

/**
 * 베지어 곡선의 점 계산
 */
export function bezierCurve(p0: Vector2D, p1: Vector2D, p2: Vector2D, t: number): Vector2D {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;

  return {
    x: uu * p0.x + 2 * u * t * p1.x + tt * p2.x,
    y: uu * p0.y + 2 * u * t * p1.y + tt * p2.y,
  };
}

/**
 * 가중 평균 계산
 */
export function weightedAverage(values: number[], weights: number[]): number {
  if (values.length !== weights.length) {
    throw new Error("값과 가중치 배열의 길이가 같아야 합니다.");
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = values.reduce((sum, value, index) => {
    return sum + value * weights[index];
  }, 0);

  return weightedSum / totalWeight;
}

/**
 * 지수적 감소 함수
 */
export function exponentialDecay(value: number, decayRate: number, time: number): number {
  return value * Math.pow(decayRate, time);
}

/**
 * 시그모이드 함수
 */
export function sigmoid(x: number, steepness: number = 1): number {
  return 1 / (1 + Math.exp(-steepness * x));
}
