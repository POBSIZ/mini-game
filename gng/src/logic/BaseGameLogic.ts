/**
 * 기본 게임 로직 클래스
 * 모든 게임 로직의 공통 기능을 제공합니다.
 */

import { EventManager } from "./EventManager.js";
import { GAME_EVENTS, type GameEvent } from "../data/Config.js";
import { isValidGameState, type GameState } from "../data/Validation.js";

// 메시지 타입 정의
export interface Message {
  text: string;
  isDanger: boolean;
  timestamp: number;
}

// 게임 오버 이벤트 데이터 타입
export interface GameOverData {
  reason?: string;
  score?: number;
}

export class BaseGameLogic {
  protected eventManager: EventManager;
  protected gameState: any;
  protected isInitialized: boolean;

  constructor() {
    this.eventManager = new EventManager();
    this.gameState = null;
    this.isInitialized = false;
  }

  /**
   * 게임 상태 초기화 (하위 클래스에서 구현)
   */
  protected initializeGameState(): any {
    throw new Error("initializeGameState must be implemented by subclass");
  }

  /**
   * 게임 상태 검증 (하위 클래스에서 오버라이드 가능)
   */
  protected validateGameState(gameState: any): boolean {
    return isValidGameState(gameState);
  }

  /**
   * 게임 초기화
   */
  public init(): void {
    if (this.isInitialized) {
      console.warn("게임이 이미 초기화되었습니다.");
      return;
    }

    this.gameState = this.initializeGameState();

    if (!this.validateGameState(this.gameState)) {
      throw new Error("유효하지 않은 게임 상태입니다.");
    }

    this.isInitialized = true;
    // 초기화 시에는 이벤트를 발생시키지 않음 (하위 클래스에서 필요시 처리)
  }

  /**
   * 게임 재시작
   */
  public reset(): void {
    this.gameState = this.initializeGameState();
    this.isInitialized = true;
    // 게임 재시작 시에는 GAME_OVER 이벤트를 발생시키지 않음
  }

  /**
   * 게임 상태 반환
   */
  public getGameState(): any {
    if (!this.isInitialized) {
      throw new Error("게임이 초기화되지 않았습니다.");
    }
    return { ...this.gameState };
  }

  /**
   * 게임 상태 설정
   */
  public setGameState(newState: any): void {
    if (!this.validateGameState(newState)) {
      throw new Error("유효하지 않은 게임 상태입니다.");
    }
    this.gameState = { ...newState };
  }

  /**
   * 게임 상태 업데이트
   */
  public updateGameState(updates: any): void {
    if (!this.isInitialized) {
      throw new Error("게임이 초기화되지 않았습니다.");
    }

    const newState = { ...this.gameState, ...updates };

    if (!this.validateGameState(newState)) {
      throw new Error("유효하지 않은 게임 상태 업데이트입니다.");
    }

    this.gameState = newState;
  }

  /**
   * 이벤트 리스너 등록
   */
  public on(eventType: GameEvent, callback: (data?: any) => void, context: any = null): void {
    this.eventManager.on(eventType, callback, context);
  }

  /**
   * 이벤트 리스너 제거
   */
  public off(eventType: GameEvent, callback: (data?: any) => void, context: any = null): void {
    this.eventManager.off(eventType, callback, context);
  }

  /**
   * 이벤트 발생
   */
  public emit(eventType: GameEvent, data: any = null): void {
    this.eventManager.emit(eventType, data);
  }

  /**
   * 메시지 추가
   */
  public addMessage(text: string, isDanger: boolean = false): void {
    if (!this.isInitialized) {
      throw new Error("게임이 초기화되지 않았습니다.");
    }

    if (!this.gameState.messages) {
      this.gameState.messages = [];
    }

    const message: Message = {
      text,
      isDanger,
      timestamp: Date.now(),
    };

    this.gameState.messages.push(message);

    // 메시지 개수 제한 (최근 50개만 유지)
    if (this.gameState.messages.length > 50) {
      this.gameState.messages = this.gameState.messages.slice(-50);
    }

    this.emit(GAME_EVENTS.MESSAGE_ADDED, message);
  }

  /**
   * 게임이 초기화되었는지 확인
   */
  public isGameInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * 게임이 종료되었는지 확인
   */
  public isGameOver(): boolean {
    if (!this.isInitialized) return false;
    return this.gameState?.gameOver || false;
  }

  /**
   * 게임 종료 설정
   */
  public setGameOver(gameOver: boolean, reason: string | null = null): void {
    if (!this.isInitialized) {
      throw new Error("게임이 초기화되지 않았습니다.");
    }

    this.gameState.gameOver = gameOver;

    if (gameOver) {
      this.emit(GAME_EVENTS.GAME_OVER, { reason });
    }
  }

  /**
   * 게임 로직 정리
   */
  public destroy(): void {
    this.eventManager.clear();
    this.gameState = null;
    this.isInitialized = false;
  }
}
