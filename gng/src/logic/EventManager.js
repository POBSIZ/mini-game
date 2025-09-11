/**
 * 이벤트 관리자 클래스
 * 게임 내 이벤트 시스템을 관리합니다.
 */

import { GAME_EVENTS } from "../data/Config.js";

export class EventManager {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * 이벤트 리스너 등록
   * @param {string} eventType - 이벤트 타입
   * @param {Function} callback - 콜백 함수
   * @param {Object} context - 콜백 실행 컨텍스트
   */
  on(eventType, callback, context = null) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    this.listeners.get(eventType).push({
      callback,
      context,
    });
  }

  /**
   * 이벤트 리스너 제거
   * @param {string} eventType - 이벤트 타입
   * @param {Function} callback - 제거할 콜백 함수
   * @param {Object} context - 콜백 실행 컨텍스트
   */
  off(eventType, callback, context = null) {
    if (!this.listeners.has(eventType)) return;

    const eventListeners = this.listeners.get(eventType);
    const index = eventListeners.findIndex(
      (listener) =>
        listener.callback === callback && listener.context === context
    );

    if (index !== -1) {
      eventListeners.splice(index, 1);
    }
  }

  /**
   * 이벤트 발생
   * @param {string} eventType - 이벤트 타입
   * @param {*} data - 이벤트 데이터
   */
  emit(eventType, data = null) {
    if (!this.listeners.has(eventType)) return;

    const eventListeners = this.listeners.get(eventType);
    eventListeners.forEach(({ callback, context }) => {
      try {
        if (context) {
          callback.call(context, data);
        } else {
          callback(data);
        }
      } catch (error) {
        console.error(`이벤트 처리 중 오류 발생 (${eventType}):`, error);
      }
    });
  }

  /**
   * 모든 이벤트 리스너 제거
   */
  clear() {
    this.listeners.clear();
  }

  /**
   * 특정 이벤트 타입의 리스너 수 반환
   * @param {string} eventType - 이벤트 타입
   * @returns {number} 리스너 수
   */
  getListenerCount(eventType) {
    return this.listeners.has(eventType)
      ? this.listeners.get(eventType).length
      : 0;
  }

  /**
   * 등록된 모든 이벤트 타입 반환
   * @returns {Array} 이벤트 타입 배열
   */
  getEventTypes() {
    return Array.from(this.listeners.keys());
  }
}
