/**
 * 이벤트 관리자 클래스
 * 게임 내 이벤트 시스템을 관리합니다.
 */

import { GAME_EVENTS, type GameEvent } from "../data/Config.js";

// 이벤트 리스너 타입 정의
interface EventListener {
  callback: (data?: any) => void;
  context: any;
}

export class EventManager {
  private listeners: Map<GameEvent, EventListener[]>;

  constructor() {
    this.listeners = new Map();
  }

  /**
   * 이벤트 리스너 등록
   */
  public on(eventType: GameEvent, callback: (data?: any) => void, context: any = null): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    this.listeners.get(eventType)!.push({
      callback,
      context,
    });
  }

  /**
   * 이벤트 리스너 제거
   */
  public off(eventType: GameEvent, callback: (data?: any) => void, context: any = null): void {
    if (!this.listeners.has(eventType)) return;

    const eventListeners = this.listeners.get(eventType)!;
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
   */
  public emit(eventType: GameEvent, data: any = null): void {
    if (!this.listeners.has(eventType)) return;

    const eventListeners = this.listeners.get(eventType)!;
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
  public clear(): void {
    this.listeners.clear();
  }

  /**
   * 특정 이벤트 타입의 리스너 수 반환
   */
  public getListenerCount(eventType: GameEvent): number {
    return this.listeners.has(eventType)
      ? this.listeners.get(eventType)!.length
      : 0;
  }

  /**
   * 등록된 모든 이벤트 타입 반환
   */
  public getEventTypes(): GameEvent[] {
    return Array.from(this.listeners.keys());
  }
}
