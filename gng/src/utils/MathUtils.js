/**
 * 수학 관련 유틸리티 함수들
 * 게임에서 사용되는 수학 계산을 담당합니다.
 */

/**
 * 두 점 사이의 거리 계산 (유클리드 거리)
 * @param {number} x1 - 첫 번째 점의 X 좌표
 * @param {number} y1 - 첫 번째 점의 Y 좌표
 * @param {number} x2 - 두 번째 점의 X 좌표
 * @param {number} y2 - 두 번째 점의 Y 좌표
 * @returns {number} 거리
 */
export function calculateDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 맨하탄 거리 계산
 * @param {number} x1 - 첫 번째 점의 X 좌표
 * @param {number} y1 - 첫 번째 점의 Y 좌표
 * @param {number} x2 - 두 번째 점의 X 좌표
 * @param {number} y2 - 두 번째 점의 Y 좌표
 * @returns {number} 맨하탄 거리
 */
export function calculateManhattanDistance(x1, y1, x2, y2) {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

/**
 * 값이 범위 내에 있는지 확인
 * @param {number} value - 확인할 값
 * @param {number} min - 최소값
 * @param {number} max - 최대값
 * @returns {number} 범위 내로 제한된 값
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * 선형 보간 (lerp)
 * @param {number} start - 시작값
 * @param {number} end - 끝값
 * @param {number} factor - 보간 계수 (0-1)
 * @returns {number} 보간된 값
 */
export function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

/**
 * 각도를 라디안으로 변환
 * @param {number} degrees - 각도
 * @returns {number} 라디안
 */
export function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * 라디안을 각도로 변환
 * @param {number} radians - 라디안
 * @returns {number} 각도
 */
export function radiansToDegrees(radians) {
  return radians * (180 / Math.PI);
}

/**
 * 두 벡터의 내적 계산
 * @param {Object} a - 첫 번째 벡터 {x, y}
 * @param {Object} b - 두 번째 벡터 {x, y}
 * @returns {number} 내적
 */
export function dotProduct(a, b) {
  return a.x * b.x + a.y * b.y;
}

/**
 * 벡터의 크기 계산
 * @param {Object} vector - 벡터 {x, y}
 * @returns {number} 벡터의 크기
 */
export function vectorMagnitude(vector) {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
}

/**
 * 벡터 정규화
 * @param {Object} vector - 벡터 {x, y}
 * @returns {Object} 정규화된 벡터 {x, y}
 */
export function normalizeVector(vector) {
  const magnitude = vectorMagnitude(vector);
  if (magnitude === 0) return { x: 0, y: 0 };
  return {
    x: vector.x / magnitude,
    y: vector.y / magnitude,
  };
}

/**
 * 두 벡터 사이의 각도 계산
 * @param {Object} a - 첫 번째 벡터 {x, y}
 * @param {Object} b - 두 번째 벡터 {x, y}
 * @returns {number} 각도 (라디안)
 */
export function angleBetweenVectors(a, b) {
  const dot = dotProduct(a, b);
  const magA = vectorMagnitude(a);
  const magB = vectorMagnitude(b);

  if (magA === 0 || magB === 0) return 0;

  const cosAngle = dot / (magA * magB);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle)));
}

/**
 * 원형 영역 내에 점이 있는지 확인
 * @param {number} pointX - 점의 X 좌표
 * @param {number} pointY - 점의 Y 좌표
 * @param {number} centerX - 원의 중심 X 좌표
 * @param {number} centerY - 원의 중심 Y 좌표
 * @param {number} radius - 원의 반지름
 * @returns {boolean} 원 내부에 있는지 여부
 */
export function isPointInCircle(pointX, pointY, centerX, centerY, radius) {
  const distance = calculateDistance(pointX, pointY, centerX, centerY);
  return distance <= radius;
}

/**
 * 사각형 영역 내에 점이 있는지 확인
 * @param {number} pointX - 점의 X 좌표
 * @param {number} pointY - 점의 Y 좌표
 * @param {number} rectX - 사각형의 X 좌표
 * @param {number} rectY - 사각형의 Y 좌표
 * @param {number} rectWidth - 사각형의 너비
 * @param {number} rectHeight - 사각형의 높이
 * @returns {boolean} 사각형 내부에 있는지 여부
 */
export function isPointInRectangle(
  pointX,
  pointY,
  rectX,
  rectY,
  rectWidth,
  rectHeight
) {
  return (
    pointX >= rectX &&
    pointX <= rectX + rectWidth &&
    pointY >= rectY &&
    pointY <= rectY + rectHeight
  );
}

/**
 * 두 사각형이 겹치는지 확인
 * @param {Object} rect1 - 첫 번째 사각형 {x, y, width, height}
 * @param {Object} rect2 - 두 번째 사각형 {x, y, width, height}
 * @returns {boolean} 겹치는지 여부
 */
export function rectanglesOverlap(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

/**
 * 베지어 곡선의 점 계산
 * @param {Object} p0 - 시작점 {x, y}
 * @param {Object} p1 - 제어점 {x, y}
 * @param {Object} p2 - 끝점 {x, y}
 * @param {number} t - 곡선의 위치 (0-1)
 * @returns {Object} 곡선 위의 점 {x, y}
 */
export function bezierCurve(p0, p1, p2, t) {
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
 * @param {Array} values - 값 배열
 * @param {Array} weights - 가중치 배열
 * @returns {number} 가중 평균
 */
export function weightedAverage(values, weights) {
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
 * @param {number} value - 초기값
 * @param {number} decayRate - 감소율 (0-1)
 * @param {number} time - 시간
 * @returns {number} 감소된 값
 */
export function exponentialDecay(value, decayRate, time) {
  return value * Math.pow(decayRate, time);
}

/**
 * 시그모이드 함수
 * @param {number} x - 입력값
 * @param {number} steepness - 가파름 정도 (기본값: 1)
 * @returns {number} 시그모이드 값 (0-1)
 */
export function sigmoid(x, steepness = 1) {
  return 1 / (1 + Math.exp(-steepness * x));
}
