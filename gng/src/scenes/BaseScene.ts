/**
 * 기본 씬 클래스
 * 모든 게임 씬의 공통 기능을 제공합니다.
 */

import { GameState } from "@/data/GameData.js";
import { UI_CONFIG, type GameEvent } from "../data/Config.js";
import { BaseGameLogic } from "../logic/BaseGameLogic.js";

// UI 요소 타입 정의
interface UIElement {
  element?: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text;
  overlay?: Phaser.GameObjects.Rectangle;
  victoryText?: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text;
  instructionText?: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text;
  gameOverText?: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text;
  destroy?: () => void;
}

// 버튼 스타일 타입 정의
interface ButtonStyle {
  width?: number;
  height?: number;
  backgroundColor?: number;
  borderColor?: number;
  borderWidth?: number;
  textColor?: string;
  fontSize?: string;
}

// 패널 스타일 타입 정의
interface PanelStyle {
  color?: number;
  borderColor?: number;
  borderWidth?: number;
  alpha?: number;
}

// 텍스트 스타일 타입 정의
interface TextStyle {
  fontFamily?: string;
  fontSize?: string;
  color?: string;
  resolution?: number;
  [key: string]: any;
}

// 버튼 객체 타입 정의
interface ButtonObject {
  background: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  destroy: () => void;
}

// 게임 크기 타입 정의
interface GameSize {
  width: number;
  height: number;
}

export class BaseScene<
  S extends GameState,
  T extends BaseGameLogic<S>
> extends Phaser.Scene {
  protected gameLogic: T | null;
  protected uiElements: Map<string, UIElement>;
  protected eventListeners: Map<GameEvent, Array<(data?: any) => void>>;

  constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
    super(config);
    this.gameLogic = null;
    this.uiElements = new Map();
    this.eventListeners = new Map();
  }

  /**
   * 씬 초기화
   */
  public init(): void {
    this.setupEventListeners();
  }

  /**
   * 이벤트 리스너 설정 (하위 클래스에서 구현)
   */
  protected setupEventListeners(): void {
    // 하위 클래스에서 구현
  }

  /**
   * UI 요소 등록
   */
  protected registerUIElement(key: string, element: UIElement): void {
    this.uiElements.set(key, element);
  }

  /**
   * UI 요소 가져오기
   */
  protected getUIElement(key: string): UIElement | undefined {
    return this.uiElements.get(key);
  }

  /**
   * UI 요소 제거
   */
  protected removeUIElement(key: string): void {
    const element = this.uiElements.get(key);
    if (element && element.destroy) {
      element.destroy();
    }
    this.uiElements.delete(key);
  }

  /**
   * 모든 UI 요소 제거
   */
  protected clearUIElements(): void {
    this.uiElements.forEach((element) => {
      if (element && element.destroy) {
        element.destroy();
      }
    });
    this.uiElements.clear();
  }

  /**
   * 텍스트 생성 헬퍼
   */
  protected createText(
    x: number,
    y: number,
    text: string,
    style: TextStyle = {}
  ): Phaser.GameObjects.Text {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const defaultStyle: TextStyle = {
      fontFamily: UI_CONFIG.FONTS.DEFAULT,
      fontSize: UI_CONFIG.FONTS.SIZES.MEDIUM,
      color: UI_CONFIG.COLORS.TEXT,
      resolution: devicePixelRatio,
      ...style,
    };

    return this.add.text(x, y, text, defaultStyle);
  }

  /**
   * 버튼 생성 헬퍼
   */
  protected createButton(
    x: number,
    y: number,
    text: string,
    callback: () => void,
    style: ButtonStyle = {}
  ): ButtonObject {
    const defaultStyle: ButtonStyle = {
      width: 120,
      height: 40,
      backgroundColor: parseInt(UI_CONFIG.COLORS.PRIMARY.replace("#", ""), 16),
      borderColor: parseInt(UI_CONFIG.COLORS.BORDER.replace("#", ""), 16),
      borderWidth: 2,
      textColor: UI_CONFIG.COLORS.TEXT,
      fontSize: UI_CONFIG.FONTS.SIZES.MEDIUM,
      ...style,
    };

    const button = this.add.rectangle(
      x,
      y,
      defaultStyle.width!,
      defaultStyle.height!,
      defaultStyle.backgroundColor!
    );
    const buttonText = this.createText(x, y, text, {
      fontSize: defaultStyle.fontSize!,
      color: defaultStyle.textColor!,
    }).setOrigin(0.5);

    button.setInteractive();
    button.on("pointerdown", callback);

    // 호버 효과
    button.on("pointerover", () => {
      button.setFillStyle(0x666666);
    });
    button.on("pointerout", () => {
      button.setFillStyle(defaultStyle.backgroundColor!);
    });

    return {
      background: button,
      text: buttonText,
      destroy: () => {
        button.destroy();
        buttonText.destroy();
      },
    };
  }

  /**
   * 패널 생성 헬퍼
   */
  protected createPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    style: PanelStyle = {}
  ): Phaser.GameObjects.Rectangle {
    const defaultStyle: PanelStyle = {
      color: parseInt(UI_CONFIG.COLORS.PANEL.replace("#", ""), 16),
      borderColor: parseInt(UI_CONFIG.COLORS.BORDER.replace("#", ""), 16),
      borderWidth: 2,
      alpha: 0.9,
      ...style,
    };

    const panel = this.add.rectangle(x, y, width, height, defaultStyle.color!);
    panel.setAlpha(defaultStyle.alpha!);

    if (defaultStyle.borderWidth! > 0) {
      const border = this.add.rectangle(
        x,
        y,
        width,
        height,
        defaultStyle.borderColor!
      );
      border.setStrokeStyle(
        defaultStyle.borderWidth!,
        defaultStyle.borderColor!
      );
      border.setAlpha(defaultStyle.alpha!);
    }

    return panel;
  }

  /**
   * 게임 로직 이벤트 리스너 등록
   */
  protected onGameEvent(
    eventType: GameEvent,
    callback: (data?: any) => void
  ): void {
    if (!this.gameLogic) return;

    this.gameLogic.on(eventType, callback, this);

    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  /**
   * 게임 로직 이벤트 리스너 제거
   */
  protected offGameEvent(
    eventType: GameEvent,
    callback: (data?: any) => void
  ): void {
    if (!this.gameLogic) return;

    this.gameLogic.off(eventType, callback, this);

    if (this.eventListeners.has(eventType)) {
      const listeners = this.eventListeners.get(eventType)!;
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 모든 게임 이벤트 리스너 제거
   */
  protected clearGameEventListeners(): void {
    if (!this.gameLogic) return;

    this.eventListeners.forEach((callbacks, eventType) => {
      callbacks.forEach((callback) => {
        this.gameLogic!.off(eventType, callback, this);
      });
    });
    this.eventListeners.clear();
  }

  /**
   * 화면 크기 변경 처리 (하위 클래스에서 오버라이드)
   */
  protected handleResize(gameSize: GameSize): void {
    // 하위 클래스에서 구현
  }

  /**
   * 씬 정리
   */
  public destroy(): void {
    this.clearUIElements();
    this.clearGameEventListeners();
    // Scene cleanup handled by Phaser automatically
  }

  /**
   * 에러 처리
   */
  protected handleError(error: Error, context: string = "Unknown"): void {
    console.error(`[${this.scene.key}] ${context}:`, error);

    // 에러 메시지 표시
    const errorText = this.createText(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      `오류가 발생했습니다: ${error.message}`,
      {
        fontSize: UI_CONFIG.FONTS.SIZES.LARGE,
        color: UI_CONFIG.COLORS.DANGER,
      }
    ).setOrigin(0.5);

    // 3초 후 에러 메시지 제거
    this.time.delayedCall(3000, () => {
      if (errorText && errorText.destroy) {
        errorText.destroy();
      }
    });
  }

  /**
   * 로딩 인디케이터 표시
   */
  protected showLoading(
    message: string = "로딩 중..."
  ): Phaser.GameObjects.Text {
    const loadingText = this.createText(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      message,
      {
        fontSize: UI_CONFIG.FONTS.SIZES.LARGE,
        color: UI_CONFIG.COLORS.TEXT,
      }
    ).setOrigin(0.5);

    this.registerUIElement("loading", { element: loadingText });
    return loadingText;
  }

  /**
   * 로딩 인디케이터 숨기기
   */
  protected hideLoading(): void {
    this.removeUIElement("loading");
  }
}
