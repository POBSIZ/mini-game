/**
 * 기본 게임 로직 클래스
 * 모든 게임 로직의 공통 기능을 제공합니다.
 */

import { EventManager } from "./EventManager.js";
import { GAME_EVENTS, GAME_STATES } from "../data/Config.js";
import { isValidGameState } from "../data/Validation.js";

export class BaseGameLogic {
  constructor() {
    this.eventManager = new EventManager();
    this.gameState = null;
    this.isInitialized = false;
  }

  /**
   * 게임 상태 초기화 (하위 클래스에서 구현)
   * @returns {Object} 초기 게임 상태
   */
  initializeGameState() {
    throw new Error("initializeGameState must be implemented by subclass");
  }

  /**
   * 게임 초기화
   */
  init() {
    if (this.isInitialized) {
      console.warn("게임이 이미 초기화되었습니다.");
      return;
    }

    this.gameState = this.initializeGameState();

    if (!isValidGameState(this.gameState)) {
      throw new Error("유효하지 않은 게임 상태입니다.");
    }

    this.isInitialized = true;
    this.emit(GAME_EVENTS.GAME_OVER, { reason: "init" });
  }

  /**
   * 게임 재시작
   */
  reset() {
    this.gameState = this.initializeGameState();
    this.isInitialized = true;
    this.emit(GAME_EVENTS.GAME_OVER, { reason: "reset" });
  }

  /**
   * 게임 상태 반환
   * @returns {Object} 게임 상태
   */
  getGameState() {
    if (!this.isInitialized) {
      throw new Error("게임이 초기화되지 않았습니다.");
    }
    return { ...this.gameState };
  }

  /**
   * 게임 상태 설정
   * @param {Object} newState - 새로운 게임 상태
   */
  setGameState(newState) {
    if (!isValidGameState(newState)) {
      throw new Error("유효하지 않은 게임 상태입니다.");
    }
    this.gameState = { ...newState };
  }

  /**
   * 게임 상태 업데이트
   * @param {Object} updates - 업데이트할 속성들
   */
  updateGameState(updates) {
    if (!this.isInitialized) {
      throw new Error("게임이 초기화되지 않았습니다.");
    }

    const newState = { ...this.gameState, ...updates };

    if (!isValidGameState(newState)) {
      throw new Error("유효하지 않은 게임 상태 업데이트입니다.");
    }

    this.gameState = newState;
  }

  /**
   * 이벤트 리스너 등록
   * @param {string} eventType - 이벤트 타입
   * @param {Function} callback - 콜백 함수
   * @param {Object} context - 콜백 실행 컨텍스트
   */
  on(eventType, callback, context = null) {
    this.eventManager.on(eventType, callback, context);
  }

  /**
   * 이벤트 리스너 제거
   * @param {string} eventType - 이벤트 타입
   * @param {Function} callback - 제거할 콜백 함수
   * @param {Object} context - 콜백 실행 컨텍스트
   */
  off(eventType, callback, context = null) {
    this.eventManager.off(eventType, callback, context);
  }

  /**
   * 이벤트 발생
   * @param {string} eventType - 이벤트 타입
   * @param {*} data - 이벤트 데이터
   */
  emit(eventType, data = null) {
    this.eventManager.emit(eventType, data);
  }

  /**
   * 메시지 추가
   * @param {string} text - 메시지 텍스트
   * @param {boolean} isDanger - 위험 메시지 여부
   */
  addMessage(text, isDanger = false) {
    if (!this.isInitialized) {
      throw new Error("게임이 초기화되지 않았습니다.");
    }

    if (!this.gameState.messages) {
      this.gameState.messages = [];
    }

    const message = {
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
   * @returns {boolean} 초기화 여부
   */
  isGameInitialized() {
    return this.isInitialized;
  }

  /**
   * 게임이 종료되었는지 확인
   * @returns {boolean} 게임 종료 여부
   */
  isGameOver() {
    if (!this.isInitialized) return false;
    return this.gameState.gameOver || false;
  }

  /**
   * 게임 종료 설정
   * @param {boolean} gameOver - 게임 종료 여부
   * @param {string} reason - 종료 사유
   */
  setGameOver(gameOver, reason = null) {
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
  destroy() {
    this.eventManager.clear();
    this.gameState = null;
    this.isInitialized = false;
  }
}
