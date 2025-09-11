/**
 * 배열 관련 유틸리티 함수들
 * 배열 조작 및 검색을 담당합니다.
 */

/**
 * 조합 생성 함수 (수학적 유틸리티)
 * @param {Array} arr - 원본 배열
 * @param {number} k - 선택할 개수
 * @returns {Array} 조합 배열
 */
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

/**
 * 순열 생성 함수 (수학적 유틸리티)
 * @param {Array} arr - 원본 배열
 * @param {number} k - 선택할 개수
 * @returns {Array} 순열 배열
 */
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

/**
 * 배열 셔플 함수 (Fisher-Yates 알고리즘)
 * @param {Array} array - 원본 배열
 * @returns {Array} 셔플된 배열
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 배열에서 랜덤 요소 선택
 * @param {Array} array - 원본 배열
 * @returns {*} 랜덤 요소
 */
export function getRandomElement(array) {
  if (array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 배열에서 여러 랜덤 요소 선택 (중복 없음)
 * @param {Array} array - 원본 배열
 * @param {number} count - 선택할 개수
 * @returns {Array} 랜덤 요소 배열
 */
export function getRandomElements(array, count) {
  if (count >= array.length) return shuffleArray(array);
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, count);
}

/**
 * 배열을 청크로 나누기
 * @param {Array} array - 원본 배열
 * @param {number} size - 청크 크기
 * @returns {Array} 청크 배열
 */
export function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * 배열에서 중복 제거
 * @param {Array} array - 원본 배열
 * @param {Function} keyFn - 키 함수 (선택사항)
 * @returns {Array} 중복이 제거된 배열
 */
export function removeDuplicates(array, keyFn = null) {
  if (!keyFn) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * 배열을 그룹으로 분류
 * @param {Array} array - 원본 배열
 * @param {Function} keyFn - 그룹 키 함수
 * @returns {Object} 그룹화된 객체
 */
export function groupBy(array, keyFn) {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
}

/**
 * 배열 정렬 (원본 배열 변경하지 않음)
 * @param {Array} array - 원본 배열
 * @param {Function} compareFn - 비교 함수
 * @returns {Array} 정렬된 새 배열
 */
export function sortArray(array, compareFn = null) {
  return [...array].sort(compareFn);
}

/**
 * 배열에서 최대값 찾기
 * @param {Array} array - 원본 배열
 * @param {Function} keyFn - 키 함수 (선택사항)
 * @returns {*} 최대값
 */
export function findMax(array, keyFn = null) {
  if (array.length === 0) return null;
  
  if (!keyFn) {
    return Math.max(...array);
  }
  
  return array.reduce((max, item) => {
    const key = keyFn(item);
    const maxKey = keyFn(max);
    return key > maxKey ? item : max;
  });
}

/**
 * 배열에서 최소값 찾기
 * @param {Array} array - 원본 배열
 * @param {Function} keyFn - 키 함수 (선택사항)
 * @returns {*} 최소값
 */
export function findMin(array, keyFn = null) {
  if (array.length === 0) return null;
  
  if (!keyFn) {
    return Math.min(...array);
  }
  
  return array.reduce((min, item) => {
    const key = keyFn(item);
    const minKey = keyFn(min);
    return key < minKey ? item : min;
  });
}

/**
 * 배열의 평균값 계산
 * @param {Array} array - 원본 배열
 * @param {Function} keyFn - 키 함수 (선택사항)
 * @returns {number} 평균값
 */
export function calculateAverage(array, keyFn = null) {
  if (array.length === 0) return 0;
  
  const values = keyFn ? array.map(keyFn) : array;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * 배열의 합계 계산
 * @param {Array} array - 원본 배열
 * @param {Function} keyFn - 키 함수 (선택사항)
 * @returns {number} 합계
 */
export function calculateSum(array, keyFn = null) {
  const values = keyFn ? array.map(keyFn) : array;
  return values.reduce((acc, val) => acc + val, 0);
}

/**
 * 배열에서 조건에 맞는 첫 번째 요소 찾기
 * @param {Array} array - 원본 배열
 * @param {Function} predicate - 조건 함수
 * @returns {*} 조건에 맞는 요소 또는 undefined
 */
export function findFirst(array, predicate) {
  return array.find(predicate);
}

/**
 * 배열에서 조건에 맞는 모든 요소 찾기
 * @param {Array} array - 원본 배열
 * @param {Function} predicate - 조건 함수
 * @returns {Array} 조건에 맞는 요소 배열
 */
export function findAll(array, predicate) {
  return array.filter(predicate);
}

/**
 * 배열에서 조건에 맞는 요소의 개수 세기
 * @param {Array} array - 원본 배열
 * @param {Function} predicate - 조건 함수
 * @returns {number} 조건에 맞는 요소의 개수
 */
export function countBy(array, predicate) {
  return array.filter(predicate).length;
}

/**
 * 배열을 평면화 (flatten)
 * @param {Array} array - 원본 배열
 * @param {number} depth - 평면화 깊이 (기본값: 1)
 * @returns {Array} 평면화된 배열
 */
export function flattenArray(array, depth = 1) {
  return array.flat(depth);
}

/**
 * 배열에서 랜덤하게 섞은 새 배열 반환
 * @param {Array} array - 원본 배열
 * @returns {Array} 섞인 새 배열
 */
export function randomizeArray(array) {
  return shuffleArray(array);
}

/**
 * 두 배열의 교집합 구하기
 * @param {Array} arr1 - 첫 번째 배열
 * @param {Array} arr2 - 두 번째 배열
 * @returns {Array} 교집합 배열
 */
export function intersection(arr1, arr2) {
  return arr1.filter(item => arr2.includes(item));
}

/**
 * 두 배열의 합집합 구하기
 * @param {Array} arr1 - 첫 번째 배열
 * @param {Array} arr2 - 두 번째 배열
 * @returns {Array} 합집합 배열
 */
export function union(arr1, arr2) {
  return removeDuplicates([...arr1, ...arr2]);
}

/**
 * 두 배열의 차집합 구하기
 * @param {Array} arr1 - 첫 번째 배열
 * @param {Array} arr2 - 두 번째 배열
 * @returns {Array} 차집합 배열
 */
export function difference(arr1, arr2) {
  return arr1.filter(item => !arr2.includes(item));
}
