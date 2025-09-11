/**
 * 공통 게임 유틸리티 함수들
 * 여러 게임에서 공통으로 사용되는 순수 함수들
 */

// 조합 생성 함수 (수학적 유틸리티)
export function combosOf(arr, k) {
  const res = [];
  (function dfs(start, path) {
    if (path.length === k) {
      res.push([...path]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      path.push(arr[i]);
      dfs(i + 1, path);
      path.pop();
    }
  })(0, []);
  return res;
}

// 순열 생성 함수 (수학적 유틸리티)
export function permutationsOf(arr, k) {
  const res = [];
  (function dfs(path, used) {
    if (path.length === k) {
      res.push([...path]);
      return;
    }
    for (let i = 0; i < arr.length; i++) {
      if (!used[i]) {
        used[i] = true;
        path.push(arr[i]);
        dfs(path, used);
        path.pop();
        used[i] = false;
      }
    }
  })([], new Array(arr.length).fill(false));
  return res;
}

// 배열 셔플 함수 (Fisher-Yates 알고리즘)
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 배열에서 랜덤 요소 선택
export function getRandomElement(array) {
  if (array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

// 배열에서 여러 랜덤 요소 선택 (중복 없음)
export function getRandomElements(array, count) {
  if (count >= array.length) return shuffleArray(array);
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, count);
}

// 숫자 범위 내에서 랜덤 정수 생성
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 숫자 범위 내에서 랜덤 실수 생성
export function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

// 확률 기반 랜덤 선택
export function randomChoice(choices, weights) {
  if (!weights) {
    return getRandomElement(choices);
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

// 두 점 사이의 거리 계산 (유클리드 거리)
export function calculateDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// 맨하탄 거리 계산
export function calculateManhattanDistance(x1, y1, x2, y2) {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

// 값이 범위 내에 있는지 확인
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// 선형 보간 (lerp)
export function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

// 각도를 라디안으로 변환
export function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// 라디안을 각도로 변환
export function radiansToDegrees(radians) {
  return radians * (180 / Math.PI);
}

// 시간을 MM:SS 형식으로 포맷
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

// 점수에 콤마 추가
export function formatScore(score) {
  return score.toLocaleString();
}

// 배열을 청크로 나누기
export function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// 객체의 깊은 복사
export function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map((item) => deepClone(item));
  if (typeof obj === "object") {
    const cloned = {};
    Object.keys(obj).forEach((key) => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }
}

// 디바운스 함수 (연속 호출 방지)
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 스로틀 함수 (호출 빈도 제한)
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
