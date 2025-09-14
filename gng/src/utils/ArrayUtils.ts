/**
 * 배열 관련 유틸리티 함수들
 * 배열 조작 및 검색을 담당합니다.
 */

/**
 * 조합 생성 함수 (수학적 유틸리티)
 */
export function combosOf<T>(arr: T[], k: number): T[][] {
  const res: T[][] = [];
  (function dfs(start: number, path: T[]) {
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
 */
export function permutationsOf<T>(arr: T[], k: number): T[][] {
  const res: T[][] = [];
  (function dfs(path: T[], used: boolean[]) {
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
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 배열에서 랜덤 요소 선택
 */
export function getRandomElement<T>(array: T[]): T | null {
  if (array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 배열에서 여러 랜덤 요소 선택 (중복 없음)
 */
export function getRandomElements<T>(array: T[], count: number): T[] {
  if (count >= array.length) return shuffleArray(array);
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, count);
}

/**
 * 배열을 청크로 나누기
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * 배열에서 중복 제거
 */
export function removeDuplicates<T>(array: T[], keyFn?: (item: T) => any): T[] {
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
 */
export function groupBy<T, K extends string | number | symbol>(
  array: T[], 
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

/**
 * 배열 정렬 (원본 배열 변경하지 않음)
 */
export function sortArray<T>(array: T[], compareFn?: (a: T, b: T) => number): T[] {
  return [...array].sort(compareFn);
}

/**
 * 배열에서 최대값 찾기
 */
export function findMax<T>(array: T[], keyFn?: (item: T) => number): T | null {
  if (array.length === 0) return null;
  
  if (!keyFn) {
    return Math.max(...(array as unknown as number[])) as unknown as T;
  }
  
  return array.reduce((max, item) => {
    const key = keyFn(item);
    const maxKey = keyFn(max);
    return key > maxKey ? item : max;
  });
}

/**
 * 배열에서 최소값 찾기
 */
export function findMin<T>(array: T[], keyFn?: (item: T) => number): T | null {
  if (array.length === 0) return null;
  
  if (!keyFn) {
    return Math.min(...(array as unknown as number[])) as unknown as T;
  }
  
  return array.reduce((min, item) => {
    const key = keyFn(item);
    const minKey = keyFn(min);
    return key < minKey ? item : min;
  });
}

/**
 * 배열의 평균값 계산
 */
export function calculateAverage<T>(array: T[], keyFn?: (item: T) => number): number {
  if (array.length === 0) return 0;
  
  const values = keyFn ? array.map(keyFn) : (array as unknown as number[]);
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * 배열의 합계 계산
 */
export function calculateSum<T>(array: T[], keyFn?: (item: T) => number): number {
  const values = keyFn ? array.map(keyFn) : (array as unknown as number[]);
  return values.reduce((acc, val) => acc + val, 0);
}

/**
 * 배열에서 조건에 맞는 첫 번째 요소 찾기
 */
export function findFirst<T>(array: T[], predicate: (item: T) => boolean): T | undefined {
  return array.find(predicate);
}

/**
 * 배열에서 조건에 맞는 모든 요소 찾기
 */
export function findAll<T>(array: T[], predicate: (item: T) => boolean): T[] {
  return array.filter(predicate);
}

/**
 * 배열에서 조건에 맞는 요소의 개수 세기
 */
export function countBy<T>(array: T[], predicate: (item: T) => boolean): number {
  return array.filter(predicate).length;
}

/**
 * 배열을 평면화 (flatten)
 */
export function flattenArray<T>(array: T[], depth: number = 1): T[] {
  return array.flat(depth);
}

/**
 * 배열에서 랜덤하게 섞은 새 배열 반환
 */
export function randomizeArray<T>(array: T[]): T[] {
  return shuffleArray(array);
}

/**
 * 두 배열의 교집합 구하기
 */
export function intersection<T>(arr1: T[], arr2: T[]): T[] {
  return arr1.filter(item => arr2.includes(item));
}

/**
 * 두 배열의 합집합 구하기
 */
export function union<T>(arr1: T[], arr2: T[]): T[] {
  return removeDuplicates([...arr1, ...arr2]);
}

/**
 * 두 배열의 차집합 구하기
 */
export function difference<T>(arr1: T[], arr2: T[]): T[] {
  return arr1.filter(item => !arr2.includes(item));
}
