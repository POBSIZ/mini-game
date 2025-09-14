/**
 * 시간 관련 유틸리티 함수들
 * 시간 포맷팅 및 계산을 담당합니다.
 */

/**
 * 시간을 MM:SS 형식으로 포맷
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

/**
 * 시간을 HH:MM:SS 형식으로 포맷
 */
export function formatTimeLong(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * 밀리초를 읽기 쉬운 형식으로 포맷
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}일 ${hours % 24}시간`;
  } else if (hours > 0) {
    return `${hours}시간 ${minutes % 60}분`;
  } else if (minutes > 0) {
    return `${minutes}분 ${seconds % 60}초`;
  } else {
    return `${seconds}초`;
  }
}

/**
 * 현재 시간을 타임스탬프로 반환
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * 두 시간 사이의 차이 계산
 */
export function getTimeDifference(startTime: number, endTime: number): number {
  return endTime - startTime;
}

/**
 * 시간이 경과했는지 확인
 */
export function hasTimeElapsed(startTime: number, duration: number): boolean {
  return getCurrentTimestamp() - startTime >= duration;
}

/**
 * 타이머 클래스
 */
export class Timer {
  private duration: number;
  private callback: (() => void) | null;
  private startTime: number | null;
  private isRunning: boolean;
  private isPaused: boolean;
  private pausedTime: number;

  constructor(duration: number, callback: (() => void) | null = null) {
    this.duration = duration;
    this.callback = callback;
    this.startTime = null;
    this.isRunning = false;
    this.isPaused = false;
    this.pausedTime = 0;
  }

  /**
   * 타이머 시작
   */
  public start(): void {
    if (this.isRunning) return;

    this.startTime = getCurrentTimestamp();
    this.isRunning = true;
    this.isPaused = false;
    this.pausedTime = 0;
  }

  /**
   * 타이머 일시정지
   */
  public pause(): void {
    if (!this.isRunning || this.isPaused) return;

    this.pausedTime = getCurrentTimestamp();
    this.isPaused = true;
  }

  /**
   * 타이머 재개
   */
  public resume(): void {
    if (!this.isRunning || !this.isPaused) return;

    this.startTime! += getCurrentTimestamp() - this.pausedTime;
    this.isPaused = false;
  }

  /**
   * 타이머 정지
   */
  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.startTime = null;
    this.pausedTime = 0;
  }

  /**
   * 남은 시간 계산
   */
  public getRemainingTime(): number {
    if (!this.isRunning) return this.duration;

    const elapsed = this.isPaused
      ? this.pausedTime - this.startTime!
      : getCurrentTimestamp() - this.startTime!;

    return Math.max(0, this.duration - elapsed);
  }

  /**
   * 경과 시간 계산
   */
  public getElapsedTime(): number {
    if (!this.isRunning) return 0;

    return this.isPaused
      ? this.pausedTime - this.startTime!
      : getCurrentTimestamp() - this.startTime!;
  }

  /**
   * 타이머가 완료되었는지 확인
   */
  public isComplete(): boolean {
    return this.getRemainingTime() <= 0;
  }

  /**
   * 타이머 업데이트 (콜백 호출)
   */
  public update(): void {
    if (!this.isRunning || this.isPaused) return;

    if (this.isComplete()) {
      this.stop();
      if (this.callback) {
        this.callback();
      }
    }
  }
}

/**
 * 디바운스 함수 (연속 호출 방지)
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T, 
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      if (timeout) clearTimeout(timeout);
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 스로틀 함수 (호출 빈도 제한)
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T, 
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 애니메이션 프레임 기반 스로틀
 */
export function throttleFrame<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  return function executedFunction(...args: Parameters<T>) {
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        func.apply(this, args);
        rafId = null;
      });
    }
  };
}

/**
 * 지연 실행 함수
 */
export function delay(func: () => void, delay: number): NodeJS.Timeout {
  return setTimeout(func, delay);
}

/**
 * 간격 실행 함수
 */
export function interval(func: () => void, interval: number): NodeJS.Timeout {
  return setInterval(func, interval);
}

/**
 * 다음 프레임에서 실행
 */
export function nextFrame(func: () => void): number {
  return requestAnimationFrame(func);
}

/**
 * 시간 기반 보간 함수
 */
export function timeBasedLerp(
  start: number,
  end: number,
  currentTime: number,
  duration: number,
  easing?: (t: number) => number
): number {
  const progress = Math.min(currentTime / duration, 1);
  const easedProgress = easing ? easing(progress) : progress;
  return start + (end - start) * easedProgress;
}

/**
 * 이징 함수들
 */
export const EasingFunctions = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInSine: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t: number) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
};
