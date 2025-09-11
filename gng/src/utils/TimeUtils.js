/**
 * 시간 관련 유틸리티 함수들
 * 시간 포맷팅 및 계산을 담당합니다.
 */

/**
 * 시간을 MM:SS 형식으로 포맷
 * @param {number} seconds - 초 단위 시간
 * @returns {string} 포맷된 시간 문자열
 */
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

/**
 * 시간을 HH:MM:SS 형식으로 포맷
 * @param {number} seconds - 초 단위 시간
 * @returns {string} 포맷된 시간 문자열
 */
export function formatTimeLong(seconds) {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * 밀리초를 읽기 쉬운 형식으로 포맷
 * @param {number} milliseconds - 밀리초
 * @returns {string} 포맷된 시간 문자열
 */
export function formatDuration(milliseconds) {
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
 * @returns {number} 현재 타임스탬프
 */
export function getCurrentTimestamp() {
  return Date.now();
}

/**
 * 두 시간 사이의 차이 계산
 * @param {number} startTime - 시작 시간 (타임스탬프)
 * @param {number} endTime - 끝 시간 (타임스탬프)
 * @returns {number} 차이 (밀리초)
 */
export function getTimeDifference(startTime, endTime) {
  return endTime - startTime;
}

/**
 * 시간이 경과했는지 확인
 * @param {number} startTime - 시작 시간 (타임스탬프)
 * @param {number} duration - 경과 시간 (밀리초)
 * @returns {boolean} 시간이 경과했는지 여부
 */
export function hasTimeElapsed(startTime, duration) {
  return getCurrentTimestamp() - startTime >= duration;
}

/**
 * 타이머 클래스
 */
export class Timer {
  constructor(duration, callback = null) {
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
  start() {
    if (this.isRunning) return;

    this.startTime = getCurrentTimestamp();
    this.isRunning = true;
    this.isPaused = false;
    this.pausedTime = 0;
  }

  /**
   * 타이머 일시정지
   */
  pause() {
    if (!this.isRunning || this.isPaused) return;

    this.pausedTime = getCurrentTimestamp();
    this.isPaused = true;
  }

  /**
   * 타이머 재개
   */
  resume() {
    if (!this.isRunning || !this.isPaused) return;

    this.startTime += getCurrentTimestamp() - this.pausedTime;
    this.isPaused = false;
  }

  /**
   * 타이머 정지
   */
  stop() {
    this.isRunning = false;
    this.isPaused = false;
    this.startTime = null;
    this.pausedTime = 0;
  }

  /**
   * 남은 시간 계산
   * @returns {number} 남은 시간 (밀리초)
   */
  getRemainingTime() {
    if (!this.isRunning) return this.duration;

    const elapsed = this.isPaused
      ? this.pausedTime - this.startTime
      : getCurrentTimestamp() - this.startTime;

    return Math.max(0, this.duration - elapsed);
  }

  /**
   * 경과 시간 계산
   * @returns {number} 경과 시간 (밀리초)
   */
  getElapsedTime() {
    if (!this.isRunning) return 0;

    return this.isPaused
      ? this.pausedTime - this.startTime
      : getCurrentTimestamp() - this.startTime;
  }

  /**
   * 타이머가 완료되었는지 확인
   * @returns {boolean} 완료 여부
   */
  isComplete() {
    return this.getRemainingTime() <= 0;
  }

  /**
   * 타이머 업데이트 (콜백 호출)
   */
  update() {
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
 * @param {Function} func - 실행할 함수
 * @param {number} wait - 대기 시간 (밀리초)
 * @returns {Function} 디바운스된 함수
 */
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

/**
 * 스로틀 함수 (호출 빈도 제한)
 * @param {Function} func - 실행할 함수
 * @param {number} limit - 제한 시간 (밀리초)
 * @returns {Function} 스로틀된 함수
 */
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

/**
 * 애니메이션 프레임 기반 스로틀
 * @param {Function} func - 실행할 함수
 * @returns {Function} 프레임 스로틀된 함수
 */
export function throttleFrame(func) {
  let rafId = null;
  return function executedFunction(...args) {
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
 * @param {Function} func - 실행할 함수
 * @param {number} delay - 지연 시간 (밀리초)
 * @returns {number} 타이머 ID
 */
export function delay(func, delay) {
  return setTimeout(func, delay);
}

/**
 * 간격 실행 함수
 * @param {Function} func - 실행할 함수
 * @param {number} interval - 간격 (밀리초)
 * @returns {number} 타이머 ID
 */
export function interval(func, interval) {
  return setInterval(func, interval);
}

/**
 * 다음 프레임에서 실행
 * @param {Function} func - 실행할 함수
 * @returns {number} 애니메이션 프레임 ID
 */
export function nextFrame(func) {
  return requestAnimationFrame(func);
}

/**
 * 시간 기반 보간 함수
 * @param {number} start - 시작값
 * @param {number} end - 끝값
 * @param {number} currentTime - 현재 시간
 * @param {number} duration - 총 시간
 * @param {Function} easing - 이징 함수 (선택사항)
 * @returns {number} 보간된 값
 */
export function timeBasedLerp(
  start,
  end,
  currentTime,
  duration,
  easing = null
) {
  const progress = Math.min(currentTime / duration, 1);
  const easedProgress = easing ? easing(progress) : progress;
  return start + (end - start) * easedProgress;
}

/**
 * 이징 함수들
 */
export const EasingFunctions = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => --t * t * t + 1,
  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};
