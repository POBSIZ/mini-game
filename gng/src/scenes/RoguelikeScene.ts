import { BaseScene } from "./BaseScene.js";
import {
  ROGUELIKE_CONFIG,
  UI_CONFIG,
  TILE_TYPES,
  GAME_EVENTS,
  type ItemType,
} from "../data/Config.js";
import {
  ENEMY_TYPES,
  ITEM_DEFINITIONS,
  type ItemDefinition,
} from "../data/RoguelikeData.js";
import { RoguelikeGameLogic } from "../logic/RoguelikeGameLogic.js";

// UI 상수 정의
const UI_CONSTANTS = {
  TITLE_FONT_SIZE: UI_CONFIG.FONTS.SIZES.TITLE,
  HUD_FONT_SIZE: UI_CONFIG.FONTS.SIZES.LARGE,
  MESSAGE_FONT_SIZE: UI_CONFIG.FONTS.SIZES.MEDIUM,
  INVENTORY_FONT_SIZE: UI_CONFIG.FONTS.SIZES.LARGE,
  TILE_FONT_SIZE: "48px",
  MINIMAP_FONT_SIZE: UI_CONFIG.FONTS.SIZES.LARGE,
  COOKING_BUTTON_WIDTH: 200,
  COOKING_BUTTON_HEIGHT: 60,
  MINIMAP_WIDTH: 400,
  MINIMAP_HEIGHT: 300,
  MINIMAP_TILE_WIDTH: 360,
  MINIMAP_TILE_HEIGHT: 260,
  COOKING_DESC_FONT_SIZE: UI_CONFIG.FONTS.SIZES.SMALL,
  IMAGE_SCALE_FACTOR: 3000, // 3000x3000 이미지 크기 기준
  HIGH_DPI_SCALE: Math.max(1, window.devicePixelRatio || 1), // 고해상도 디스플레이 대응
  MINIMAP_SCALE_FACTORS: {
    STAIRS: 0.6,
    ITEM: 0.4,
    PLAYER: 0.6,
  },
  CHARACTER_SCALE_FACTOR: 1.0, // 캐릭터 크기 조정 (1타일과 동일)
  MONSTER_SCALE_FACTOR: 1.0, // 몬스터 크기 조정 (1타일과 동일)
  ITEM_SCALE_FACTOR: 0.8, // 아이템 크기 조정 (약간 작게)
  TILE_SCALE_FACTOR: 1.0, // 타일 크기 조정 (기준 크기)
  Z_INDEX: {
    UI: 1000,
    HUD: 1001,
    INVENTORY: 2000,
    INVENTORY_TEXT: 2001,
    GAME_OVER: 5000,
    GAME_OVER_TEXT: 5001,
  },
};

// 색상 상수 정의 (UI_CONFIG와 통합)
const COLORS = {
  BACKGROUND: UI_CONFIG.COLORS.BACKGROUND,
  UI_PANEL: 0x12161b,
  UI_BORDER: 0x1f2937,
  TEXT_PRIMARY: UI_CONFIG.COLORS.TEXT,
  TEXT_SECONDARY: "#9ca3af",
  TEXT_ACCENT: UI_CONFIG.COLORS.PRIMARY,
  VOID: 0x06080b,
  WALL: 0x1f2937,
  FLOOR_VISIBLE: 0x0f172a,
  FLOOR_SEEN: 0x0b1220,
  STAIRS: UI_CONFIG.COLORS.WARNING,
  ENEMY: UI_CONFIG.COLORS.DANGER,
  COOKING_BUTTON: 0xff6b35, // 밝은 주황색 (더 눈에 띄게)
  COOKING_BUTTON_HOVER: 0xff8c42, // 호버 시 더 밝은 주황색
  COOKING_BUTTON_TEXT: "#ffffff", // 흰색 텍스트로 가독성 향상
};

export default class RoguelikeScene extends BaseScene {
  // Map and camera properties
  private mapContainer: Phaser.GameObjects.Container | null;
  private cameraOffsetX: number;
  private cameraOffsetY: number;

  // UI elements
  private hudPanel: Phaser.GameObjects.Rectangle | null;
  private hudText: Phaser.GameObjects.Text | null;
  private messageLog: Phaser.GameObjects.Text | null;
  private inventoryPanel: Phaser.GameObjects.Rectangle | null;
  private inventoryText: Phaser.GameObjects.Text | null;
  private minimapPanel: Phaser.GameObjects.Rectangle | null;
  private minimapContainer: Phaser.GameObjects.Container | null;
  private cookingButton: Phaser.GameObjects.Rectangle | null;
  private cookingButtonText: Phaser.GameObjects.Text | null;

  // Input handling
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null;
  private wasd: any;
  private spaceKey: Phaser.Input.Keyboard.Key | null;
  private iKey: Phaser.Input.Keyboard.Key | null;
  private qKey: Phaser.Input.Keyboard.Key | null;
  private fKey: Phaser.Input.Keyboard.Key | null;
  private rKey: Phaser.Input.Keyboard.Key | null;
  private escKey: Phaser.Input.Keyboard.Key | null;
  private descendKey: Phaser.Input.Keyboard.Key | null;
  private numberKeys: { [key: string]: Phaser.Input.Keyboard.Key };

  // Movement timing
  private lastMoveTime: number;
  private moveDelay: number;

  constructor() {
    super({ key: "RoguelikeScene" });

    // 초기화
    this.mapContainer = null;
    this.cameraOffsetX = 0;
    this.cameraOffsetY = 0;

    // UI 요소들
    this.hudPanel = null;
    this.hudText = null;
    this.messageLog = null;
    this.inventoryPanel = null;
    this.inventoryText = null;
    this.minimapPanel = null;
    this.minimapContainer = null;
    this.cookingButton = null;
    this.cookingButtonText = null;

    // 입력 처리
    this.cursors = null;
    this.wasd = null;
    this.spaceKey = null;
    this.iKey = null;
    this.qKey = null;
    this.fKey = null;
    this.rKey = null;
    this.escKey = null;
    this.descendKey = null;
    this.numberKeys = {};

    // 이동 입력 지연 처리
    this.lastMoveTime = 0;
    this.moveDelay = 150; // 150ms 지연
  }

  preload() {
    this.initializeGameLogic();
    this.loadAssets();
  }

  /**
   * 게임 로직 인스턴스를 초기화합니다.
   * @private
   */
  initializeGameLogic() {
    this.gameLogic = new RoguelikeGameLogic();
    this.setupGameEventListeners();
  }

  /**
   * 게임 이벤트 리스너 설정
   * @private
   */
  setupGameEventListeners() {
    this.onGameEvent(GAME_EVENTS.MESSAGE_ADDED, (message) => {
      this.updateMessageLog();
    });

    this.onGameEvent(GAME_EVENTS.GAME_OVER, (data) => {
      this.handleGameOver(data);
    });

    this.onGameEvent(GAME_EVENTS.PLAYER_LEVEL_UP, (data) => {
      this.updateHUD();
    });
  }

  /**
   * 게임 오버 처리
   * @param {Object} data - 게임 오버 데이터
   * @private
   */
  handleGameOver(data: any) {
    if (data && data.reason === "victory") {
      this.showVictoryScreen();
    } else {
      this.showGameOverScreen();
    }
  }

  /**
   * 승리 화면 표시
   * @private
   */
  showVictoryScreen() {
    // 기존 게임오버 UI 정리
    this.clearGameOverUI();

    // 배경 오버레이 생성
    const overlay = this.add
      .rectangle(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        this.scale.width,
        this.scale.height,
        0x000000,
        0.8
      )
      .setDepth(UI_CONSTANTS.Z_INDEX.GAME_OVER);

    // 승리 텍스트 생성
    const victoryText = this.createText(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      "승리! 🏆",
      {
        fontSize: UI_CONFIG.FONTS.SIZES.TITLE,
        color: UI_CONFIG.COLORS.SUCCESS,
      }
    )
      .setOrigin(0.5)
      .setDepth(UI_CONSTANTS.Z_INDEX.GAME_OVER_TEXT);

    // 안내 텍스트 생성
    const instructionText = this.createText(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 50,
      "R 키를 눌러 다시 시작하세요",
      {
        fontSize: UI_CONFIG.FONTS.SIZES.LARGE,
        color: UI_CONFIG.COLORS.TEXT,
      }
    )
      .setOrigin(0.5)
      .setDepth(UI_CONSTANTS.Z_INDEX.GAME_OVER_TEXT);

    this.registerUIElement("victory", {
      overlay,
      victoryText,
      instructionText,
      destroy: () => {
        overlay.destroy();
        victoryText.destroy();
        instructionText.destroy();
      },
    });
  }

  /**
   * 게임 오버 화면 표시
   * @private
   */
  showGameOverScreen() {
    // 기존 게임오버 UI 정리
    this.clearGameOverUI();

    // 배경 오버레이 생성
    const overlay = this.add
      .rectangle(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        this.scale.width,
        this.scale.height,
        0x000000,
        0.8
      )
      .setDepth(UI_CONSTANTS.Z_INDEX.GAME_OVER);

    // 게임오버 텍스트 생성
    const gameOverText = this.createText(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      "게임 오버 💀",
      {
        fontSize: UI_CONFIG.FONTS.SIZES.TITLE,
        color: UI_CONFIG.COLORS.DANGER,
      }
    )
      .setOrigin(0.5)
      .setDepth(UI_CONSTANTS.Z_INDEX.GAME_OVER_TEXT);

    // 안내 텍스트 생성
    const instructionText = this.createText(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 50,
      "R 키를 눌러 다시 시작하세요",
      {
        fontSize: UI_CONFIG.FONTS.SIZES.LARGE,
        color: UI_CONFIG.COLORS.TEXT,
      }
    )
      .setOrigin(0.5)
      .setDepth(UI_CONSTANTS.Z_INDEX.GAME_OVER_TEXT);

    this.registerUIElement("gameOver", {
      overlay,
      gameOverText,
      instructionText,
      destroy: () => {
        overlay.destroy();
        gameOverText.destroy();
        instructionText.destroy();
      },
    });
  }

  /**
   * 화면 크기 변경 처리
   * @param {Object} gameSize - 새로운 게임 크기
   * @private
   */
  handleResize(gameSize: any) {
    console.log("화면 크기 변경 감지:", gameSize);
    const { width, height } = gameSize;

    // UI 요소들 위치 재조정
    this.updateUIPositions(width, height);

    // 맵 위치 재조정
    this.updateMapPosition();

    // 미니맵 위치 재조정
    this.updateMinimapPosition(width, height);

    // 버튼 상호작용 영역 재설정
    this.refreshButtonInteractions();
  }

  /**
   * UI 요소들 위치 업데이트
   * @param {number} width - 화면 너비
   * @param {number} height - 화면 높이
   * @private
   */
  updateUIPositions(width: number, height: number) {
    console.log(`UI 위치 업데이트: ${width}x${height}`);

    // HUD 패널 위치 업데이트
    if (this.hudPanel) {
      this.hudPanel.setPosition(width / 2, 60);
    }

    // 메시지 로그 위치 업데이트
    if (this.messageLog) {
      this.messageLog.setPosition(20, height - 20);
    }

    // 인벤토리 패널 위치 업데이트
    if (this.inventoryPanel) {
      this.inventoryPanel.setPosition(width - 200, height / 2);
    }

    // 요리 버튼 완전히 다시 생성
    if (this.cookingButton) {
      this.createCookingButtonUI(width, height);
    }
  }

  /**
   * 버튼 상호작용 영역을 재설정합니다.
   * @private
   */
  refreshButtonInteractions() {
    console.log("버튼 상호작용 영역 재설정");

    // 요리하기 버튼을 완전히 다시 생성
    const { width, height } = this.scale;
    this.createCookingButtonUI(width, height);
  }

  /**
   * 맵 위치 업데이트
   * @private
   */
  updateMapPosition() {
    if (!this.mapContainer || !this.gameLogic) {
      return;
    }

    const gameState = this.gameLogic.getGameState();
    const { TILE_SIZE } = ROGUELIKE_CONFIG;

    const offsetX = -gameState.player.x * TILE_SIZE;
    const offsetY = -gameState.player.y * TILE_SIZE;

    // 맵 컨테이너를 화면 중앙에 위치시키고 오프셋 적용
    this.mapContainer.setPosition(
      this.scale.width / 2 + offsetX,
      this.scale.height / 2 + offsetY
    );
  }

  /**
   * 미니맵 위치 업데이트
   * @param {number} width - 화면 너비
   * @param {number} height - 화면 높이
   * @private
   */
  updateMinimapPosition(width: number, height: number) {
    if (this.minimapPanel) {
      this.minimapPanel.setPosition(width - 220, 20);
    }
  }

  /**
   * 게임에 필요한 에셋들을 로드합니다.
   * @private
   */
  loadAssets() {
    // 히어로 이미지 로드
    this.load.image("hero-left", "assets/hero-left.png");
    this.load.image("hero-right", "assets/hero-right.png");

    // 토끼(슬라임) 이미지 로드
    this.load.image("rabbit-left", "assets/rabbit-left.png");
    this.load.image("rabbit-right", "assets/rabbit-right.png");

    // 형광 버섯(고블린) 이미지 로드
    this.load.image(
      "glow-mushroom-mob-left",
      "assets/glow-mushroom-mob-left.png"
    );
    this.load.image(
      "glow-mushroom-mob-right",
      "assets/glow-mushroom-mob-right.png"
    );

    // 바닥 타일 이미지 로드
    this.load.image("ground", "assets/ground.png");

    // 벽 타일 이미지 로드
    this.load.image("wall-top", "assets/wall-top.png");
  }

  create() {
    this.setupBackground();
    this.createUI();
    this.createCookingButton();
    this.setupInput();
    this.initializeGame();
    this.setupCookingGameListeners();

    // 입력 시스템 재설정 (지연)
    this.time.delayedCall(200, () => {
      this.resetInputSystem();
    });

    this.startGame();

    // 화면 크기 변경 이벤트 리스너
    this.scale.on("resize", this.handleResize, this);
  }

  // ===========================================
  // 배경 설정
  // ===========================================
  /**
   * 게임 배경을 설정합니다.
   * @private
   */
  setupBackground() {
    this.cameras.main.setBackgroundColor(COLORS.BACKGROUND);
  }

  /**
   * 게임 레벨을 생성하여 초기화합니다.
   * @private
   */
  initializeGame() {
    if (this.gameLogic && "generateLevel" in this.gameLogic) {
      (this.gameLogic as any).generateLevel();
    }
  }

  // ===========================================
  // UI 생성
  // ===========================================
  /**
   * 게임 UI 요소들을 생성합니다.
   * @private
   */
  createUI() {
    const { width, height } = this.scale;

    this.createTitle(width);
    this.createHUD(width);
    this.createMapContainer(width, height);
    this.createMessageLog(width, height);
    this.createInventoryPanel(width, height);
  }

  /**
   * 게임 타이틀을 생성합니다.
   * @param {number} width - 화면 너비
   * @private
   */
  createTitle(width: number) {
    const titleText = this.add
      .text(width / 2, 20, "기깔나는거", {
        fontSize: UI_CONSTANTS.TITLE_FONT_SIZE,
        color: COLORS.TEXT_ACCENT,
        fontFamily: "Arial",
      })
      .setOrigin(0.5)
      .setDepth(UI_CONSTANTS.Z_INDEX.UI);
    this.registerUIElement("title", titleText);
  }

  /**
   * HUD 패널 생성
   */
  createHUD(width: number) {
    this.hudPanel = this.add.rectangle(
      width / 2,
      60,
      width - 20,
      40,
      COLORS.UI_PANEL
    );
    this.hudPanel.setStrokeStyle(1, COLORS.UI_BORDER);
    this.hudPanel.setDepth(UI_CONSTANTS.Z_INDEX.UI);

    this.hudText = this.add
      .text(width / 2, 60, "", {
        fontSize: UI_CONSTANTS.HUD_FONT_SIZE,
        color: COLORS.TEXT_PRIMARY,
        fontFamily: "Arial",
      })
      .setOrigin(0.5)
      .setDepth(UI_CONSTANTS.Z_INDEX.HUD);
  }

  /**
   * 맵 컨테이너 생성
   */
  createMapContainer(width: number, height: number) {
    this.mapContainer = this.add.container(0, 0);
    this.mapContainer.setPosition(width / 2, height / 2 + 50);

    this.cameraOffsetX = 0;
    this.cameraOffsetY = 0;
  }

  /**
   * 메시지 로그 생성
   */
  createMessageLog(width: number, height: number) {
    this.messageLog = this.add
      .text(20, height - 120, "", {
        fontSize: UI_CONSTANTS.MESSAGE_FONT_SIZE,
        color: COLORS.TEXT_PRIMARY,
        fontFamily: "Arial",
        wordWrap: { width: width - 40 },
      })
      .setOrigin(0, 1)
      .setDepth(UI_CONSTANTS.Z_INDEX.UI);
  }

  /**
   * 인벤토리 패널 생성
   */
  createInventoryPanel(width: number, height: number) {
    this.inventoryPanel = this.add.rectangle(
      width / 2,
      height / 2,
      width - 40,
      height - 80,
      COLORS.BACKGROUND
    );
    this.inventoryPanel.setStrokeStyle(2, COLORS.UI_BORDER);
    this.inventoryPanel.setVisible(false);
    this.inventoryPanel.setDepth(UI_CONSTANTS.Z_INDEX.INVENTORY);
    // 인벤토리 패널은 상호작용하지 않음 (setInteractive 호출하지 않음)

    this.inventoryText = this.add
      .text(width / 2, height / 2, "", {
        fontSize: UI_CONSTANTS.INVENTORY_FONT_SIZE,
        color: COLORS.TEXT_PRIMARY,
        fontFamily: "Arial",
        wordWrap: { width: width - 80 },
      })
      .setOrigin(0.5)
      .setDepth(UI_CONSTANTS.Z_INDEX.INVENTORY_TEXT);
    this.inventoryText.setVisible(false);
  }

  createCookingButton() {
    const { width, height } = this.scale;

    this.createMinimap(width);
    this.createCookingButtonUI(width, height);
  }

  /**
   * 미니맵 생성
   */
  createMinimap(width: number) {
    this.minimapPanel = this.add.rectangle(
      width - 210,
      240,
      UI_CONSTANTS.MINIMAP_WIDTH,
      UI_CONSTANTS.MINIMAP_HEIGHT,
      COLORS.BACKGROUND
    );
    this.minimapPanel.setStrokeStyle(1, COLORS.UI_BORDER);
    this.minimapPanel.setDepth(UI_CONSTANTS.Z_INDEX.UI);
    // 미니맵 패널은 상호작용하지 않음 (setInteractive 호출하지 않음)

    const minimapTitle = this.add
      .text(width - 210, 110, "미니맵", {
        fontSize: UI_CONSTANTS.MINIMAP_FONT_SIZE,
        color: COLORS.TEXT_ACCENT,
        fontFamily: "Arial",
      })
      .setOrigin(0.5)
      .setDepth(UI_CONSTANTS.Z_INDEX.HUD);
    this.registerUIElement("minimapTitle", minimapTitle);

    this.minimapContainer = this.add.container(width - 386, 120);
    this.minimapContainer.setDepth(UI_CONSTANTS.Z_INDEX.HUD);
  }

  /**
   * 요리하기 버튼 UI 생성
   */
  createCookingButtonUI(width: number, height: number) {
    // 기존 버튼이 있다면 제거
    if (this.cookingButton) {
      // 상호작용 비활성화 후 제거
      this.cookingButton.disableInteractive();
      this.cookingButton.destroy();
      this.cookingButton = null;
    }
    if (this.cookingButtonText) {
      this.cookingButtonText.destroy();
      this.cookingButtonText = null;
    }

    // 미니맵 아래쪽에 배치 (미니맵과 겹치지 않게)
    const buttonX = width - 110;
    const buttonY = height - 350;

    console.log(
      `요리하기 버튼 생성: 위치(${buttonX}, ${buttonY}), 크기(${UI_CONSTANTS.COOKING_BUTTON_WIDTH}x${UI_CONSTANTS.COOKING_BUTTON_HEIGHT})`
    );

    // 직접 버튼 생성 (createButton 헬퍼 대신)
    this.cookingButton = this.add.rectangle(
      buttonX,
      buttonY,
      UI_CONSTANTS.COOKING_BUTTON_WIDTH,
      UI_CONSTANTS.COOKING_BUTTON_HEIGHT,
      COLORS.COOKING_BUTTON
    );

    // 테두리 추가
    this.cookingButton.setStrokeStyle(3, 0xffffff, 1.0);

    // 상호작용 설정 (안전한 방식)
    try {
      this.cookingButton.setInteractive();
      console.log("요리 버튼 setInteractive 성공");
    } catch (error) {
      console.error("요리 버튼 setInteractive 실패:", error);
    }

    // 클릭 이벤트
    this.cookingButton.on("pointerdown", () => {
      console.log("요리하기 버튼 클릭됨!");
      this.openCookingGame();
    });

    // 텍스트 생성 (상호작용 비활성화)
    this.cookingButtonText = this.add
      .text(buttonX, buttonY, "🍳 요리하기", {
        fontSize: UI_CONSTANTS.HUD_FONT_SIZE,
        color: COLORS.COOKING_BUTTON_TEXT,
        fontFamily: "Arial",
      })
      .setOrigin(0.5);

    // 텍스트는 상호작용하지 않도록 설정
    this.cookingButtonText.disableInteractive();

    // 버튼을 가장 위에 표시
    this.cookingButton.setDepth(50000);
    this.cookingButtonText.setDepth(50001);

    console.log("요리하기 버튼 생성 완료");
  }

  /**
   * 입력 시스템 재설정
   * @private
   */
  resetInputSystem() {
    try {
      console.log("입력 시스템 재설정 시작");

      // 모든 인터랙티브 객체 확인 및 재설정
      if (this.cookingButton && this.cookingButton.input) {
        console.log("요리 버튼 입력 시스템 확인");
        if (!this.cookingButton.input.hitAreaCallback) {
          console.warn("요리 버튼 hitAreaCallback 누락, 재설정...");
          this.cookingButton.setInteractive();
        }
      }

      console.log("입력 시스템 재설정 완료");
    } catch (error) {
      console.error("입력 시스템 재설정 중 오류:", error);
    }
  }

  // ===========================================
  // 요리 게임 연동
  // ===========================================
  /**
   * 요리 게임 이벤트 리스너를 설정합니다.
   * @private
   */
  setupCookingGameListeners() {
    // 씬 이벤트 리스너 설정
    this.events.on("wake", () => {
      console.log("RoguelikeScene이 깨어났습니다.");
    });
  }

  /**
   * CookingScene 이벤트 리스너를 설정합니다.
   * @private
   */
  setupCookingEventListeners() {
    try {
      const cookingScene = this.scene.get("CookingScene");
      if (cookingScene) {
        // 기존 이벤트 리스너 제거 (중복 방지)
        cookingScene.events.removeAllListeners("dishCreated");
        cookingScene.events.removeAllListeners("popupClosed");

        // 요리 완료 이벤트 리스너
        cookingScene.events.on("dishCreated", (dishItem: any) => {
          console.log("요리 완료:", dishItem);
          this.addDishToInventory(dishItem);
        });

        // 팝업 닫힘 이벤트 리스너
        cookingScene.events.on("popupClosed", () => {
          console.log("요리 게임이 닫혔습니다.");
        });
      }
    } catch (error) {
      console.error("CookingScene 이벤트 리스너 설정 중 오류:", error);
    }
  }

  /**
   * 요리 게임을 팝업으로 실행합니다.
   * @private
   */
  openCookingGame() {
    console.log("요리 게임 실행 시도");
    try {
      const cookingScene = this.scene.get("CookingScene");
      if (!cookingScene) {
        console.error("CookingScene을 찾을 수 없습니다.");
        this.addMessage("요리 게임을 찾을 수 없습니다.", true);
        return;
      }

      console.log("CookingScene 실행 중...");

      // CookingScene 이벤트 리스너 설정
      this.setupCookingEventListeners();

      // CookingScene을 팝업으로 실행
      this.scene.launch("CookingScene", { isPopup: true });

      console.log("CookingScene 실행 완료");
    } catch (error) {
      console.error("요리 게임 실행 중 오류:", error);
      this.addMessage("요리 게임을 실행할 수 없습니다.", true);
    }
  }

  /**
   * 게임 메시지를 추가합니다.
   * @param {string} text - 메시지 텍스트
   * @param {boolean} [isDanger=false] - 위험 메시지 여부
   * @private
   */
  addMessage(text: string, isDanger = false) {
    this.gameLogic.addMessage(text, isDanger);
    this.updateMessageLog();
  }

  /**
   * 메시지 로그를 업데이트합니다.
   * @private
   */
  updateMessageLog() {
    if (!this.messageLog) return;

    try {
      const gameState = this.gameLogic.getGameState();
      if (!gameState || !gameState.messages) {
        console.warn("게임 상태 또는 메시지 데이터가 없습니다.");
        return;
      }

      const messages = gameState.messages
        .map((msg, index) => {
          const prefix = msg.isDanger ? "⚠️ " : "• ";
          return prefix + msg.text;
        })
        .join("\n");

      this.messageLog.setText(messages);
    } catch (error) {
      console.error("메시지 로그 업데이트 중 오류:", error);
    }
  }

  // ===========================================
  // 입력 처리
  // ===========================================
  /**
   * 키보드 입력 처리를 설정합니다.
   * @private
   */
  setupInput() {
    this.initializeKeyboardKeys();
    this.setupNumberKeys();
    this.setupKeyboardEventListeners();
  }

  /**
   * 키보드 키 초기화
   */
  initializeKeyboardKeys() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,S,A,D");
    this.spaceKey = this.input.keyboard.addKey("SPACE");
    this.iKey = this.input.keyboard.addKey("I");
    this.qKey = this.input.keyboard.addKey("Q");
    this.fKey = this.input.keyboard.addKey("F");
    this.rKey = this.input.keyboard.addKey("R");
    this.escKey = this.input.keyboard.addKey("ESC");
    this.descendKey = this.input.keyboard.addKey("PERIOD"); // > 키
  }

  /**
   * 번호키 설정
   */
  setupNumberKeys() {
    this.numberKeys = {};
    for (let i = 1; i <= 9; i++) {
      this.numberKeys[i] = this.input.keyboard.addKey(i.toString());
    }
  }

  /**
   * 키보드 이벤트 리스너 설정
   */
  setupKeyboardEventListeners() {
    this.input.keyboard.on("keydown", (event) => {
      if (this.gameLogic.getGameState().inventoryOpen) {
        const key = event.key;
        if (key >= "1" && key <= "9") {
          const index = parseInt(key) - 1;
          this.useInventoryItem(index);
        }
      }
    });
  }

  startGame() {
    this.render();
    this.updateHUD();
  }

  /**
   * 카메라 업데이트 - 캐릭터를 화면 중앙에 유지
   */
  updateCamera() {
    this.updateMapPosition();
  }

  // ===========================================
  // 렌더링
  // ===========================================
  /**
   * 게임 화면을 렌더링합니다.
   * @private
   */
  render() {
    try {
      this.clearMapContainer();

      const gameState = this.gameLogic.getGameState();
      if (!gameState) {
        console.warn("게임 상태가 없습니다.");
        return;
      }

      const renderBounds = this.calculateRenderBounds(gameState);

      this.renderMapTiles(gameState, renderBounds);
      this.renderItems(gameState, renderBounds);
      this.renderTraps(gameState, renderBounds);
      this.renderEnemies(gameState, renderBounds);
      this.renderPlayer(gameState);
    } catch (error) {
      console.error("렌더링 중 오류:", error);
    }
  }

  /**
   * 맵 컨테이너 초기화
   */
  clearMapContainer() {
    // 컨테이너 내의 모든 객체를 안전하게 제거
    if (this.mapContainer && this.mapContainer.list) {
      const children = [...this.mapContainer.list]; // 복사본 생성
      children.forEach((child) => {
        if (child && typeof child.destroy === "function") {
          // 상호작용이 활성화된 객체만 비활성화
          if (child.input && typeof child.disableInteractive === "function") {
            child.disableInteractive();
          }
          child.destroy();
        }
      });
      this.mapContainer.removeAll(true);
    }
  }

  /**
   * 렌더링 범위 계산
   */
  calculateRenderBounds(gameState) {
    const { SCREEN_WIDTH, SCREEN_HEIGHT } = ROGUELIKE_CONFIG;

    return {
      startX: Math.max(0, gameState.player.x - Math.floor(SCREEN_WIDTH / 2)),
      endX: Math.min(
        ROGUELIKE_CONFIG.VIEW_WIDTH,
        gameState.player.x + Math.floor(SCREEN_WIDTH / 2) + 1
      ),
      startY: Math.max(0, gameState.player.y - Math.floor(SCREEN_HEIGHT / 2)),
      endY: Math.min(
        ROGUELIKE_CONFIG.VIEW_HEIGHT,
        gameState.player.y + Math.floor(SCREEN_HEIGHT / 2) + 1
      ),
    };
  }

  /**
   * 맵 타일 렌더링
   */
  renderMapTiles(gameState, bounds) {
    const { TILE_SIZE } = ROGUELIKE_CONFIG;

    for (let y = bounds.startY; y < bounds.endY; y++) {
      for (let x = bounds.startX; x < bounds.endX; x++) {
        this.renderSingleTile(gameState, x, y, TILE_SIZE);
      }
    }
  }

  /**
   * 단일 타일 렌더링
   */
  renderSingleTile(gameState, x, y, tileSize) {
    const seen = gameState.seen[y][x];
    const visible = gameState.visible[y][x];
    const mapValue = gameState.map[y][x];
    const brightness = gameState.brightness ? gameState.brightness[y][x] : 1.0;

    const screenX = x * tileSize;
    const screenY = y * tileSize;

    // 바닥 타일인 경우 이미지 사용
    if (mapValue === TILE_TYPES.FLOOR && (visible || seen)) {
      const groundSprite = this.add
        .image(screenX, screenY, "ground")
        .setOrigin(0.5)
        .setScale(
          (tileSize / UI_CONSTANTS.IMAGE_SCALE_FACTOR) *
            UI_CONSTANTS.TILE_SCALE_FACTOR
        )
        .setAlpha(brightness); // 명도에 따른 투명도 조절
      this.mapContainer.add(groundSprite);
    } else if (mapValue === TILE_TYPES.WALL && seen) {
      // 벽 타일인 경우 이미지 사용
      const wallSprite = this.add
        .image(screenX, screenY, "wall-top")
        .setOrigin(0.5)
        .setScale(
          (tileSize / UI_CONSTANTS.IMAGE_SCALE_FACTOR) *
            UI_CONSTANTS.TILE_SCALE_FACTOR
        )
        .setAlpha(brightness); // 명도에 따른 투명도 조절
      this.mapContainer.add(wallSprite);
    } else {
      // 다른 타일들은 기존 방식으로 렌더링
      const color = this.getTileColor(mapValue, seen, visible);
      const tile = this.add
        .rectangle(screenX, screenY, tileSize, tileSize, color)
        .setAlpha(brightness); // 명도에 따른 투명도 조절
      this.mapContainer.add(tile);
    }

    // 계단 표시
    if (mapValue === TILE_TYPES.STAIRS && (visible || seen)) {
      this.renderStairs(screenX, screenY, tileSize, brightness);
    }
  }

  /**
   * 타일 색상 결정
   */
  getTileColor(mapValue, seen, visible) {
    switch (mapValue) {
      case TILE_TYPES.WALL:
        return seen ? COLORS.WALL : COLORS.VOID;
      case TILE_TYPES.FLOOR:
        return visible
          ? COLORS.FLOOR_VISIBLE
          : seen
          ? COLORS.FLOOR_SEEN
          : COLORS.VOID;
      case TILE_TYPES.STAIRS:
        return visible ? COLORS.STAIRS : seen ? COLORS.STAIRS : COLORS.VOID;
      default:
        return COLORS.VOID;
    }
  }

  /**
   * 계단 렌더링
   */
  renderStairs(screenX, screenY, tileSize, brightness = 1.0) {
    const stairs = this.add
      .text(screenX, screenY, ">", {
        fontSize: UI_CONSTANTS.TILE_FONT_SIZE,
        color: COLORS.STAIRS,
        fontFamily: "Arial",
      })
      .setOrigin(0.5)
      .setAlpha(brightness); // 명도에 따른 투명도 조절
    this.mapContainer.add(stairs);
  }

  /**
   * 아이템 렌더링
   */
  renderItems(gameState, bounds) {
    const { TILE_SIZE } = ROGUELIKE_CONFIG;

    gameState.items.forEach((item) => {
      if (
        this.isItemInBounds(item, bounds) &&
        gameState.visible[item.y][item.x]
      ) {
        const brightness = gameState.brightness
          ? gameState.brightness[item.y][item.x]
          : 1.0;
        this.renderSingleItem(item, TILE_SIZE, brightness);
      }
    });
  }

  /**
   * 아이템이 렌더링 범위 내에 있는지 확인
   */
  isItemInBounds(item, bounds) {
    return (
      item.x >= bounds.startX &&
      item.x < bounds.endX &&
      item.y >= bounds.startY &&
      item.y < bounds.endY
    );
  }

  /**
   * 단일 아이템 렌더링
   */
  renderSingleItem(item, tileSize, brightness = 1.0) {
    const itemType = ITEM_DEFINITIONS[item.type];
    const screenX = item.x * tileSize;
    const screenY = item.y * tileSize;

    const itemSprite = this.add
      .text(screenX, screenY, itemType.symbol, {
        fontSize: UI_CONSTANTS.TILE_FONT_SIZE,
        color: `#${itemType.color.toString(16)}`,
        fontFamily: "Arial",
      })
      .setOrigin(0.5)
      .setAlpha(brightness); // 명도에 따른 투명도 조절
    this.mapContainer.add(itemSprite);
  }

  /**
   * 함정 렌더링
   */
  renderTraps(gameState, bounds) {
    const { TILE_SIZE } = ROGUELIKE_CONFIG;

    gameState.traps.forEach((trap) => {
      if (
        trap.seen &&
        this.isItemInBounds(trap, bounds) &&
        gameState.visible[trap.y][trap.x]
      ) {
        const brightness = gameState.brightness
          ? gameState.brightness[trap.y][trap.x]
          : 1.0;
        this.renderSingleTrap(trap, TILE_SIZE, brightness);
      }
    });
  }

  /**
   * 단일 함정 렌더링
   */
  renderSingleTrap(trap, tileSize, brightness = 1.0) {
    const screenX = trap.x * tileSize;
    const screenY = trap.y * tileSize;

    const trapSprite = this.add
      .text(screenX, screenY, "^", {
        fontSize: UI_CONSTANTS.TILE_FONT_SIZE,
        color: COLORS.ENEMY,
        fontFamily: "Arial",
      })
      .setOrigin(0.5)
      .setAlpha(brightness); // 명도에 따른 투명도 조절
    this.mapContainer.add(trapSprite);
  }

  /**
   * 적 렌더링
   */
  renderEnemies(gameState, bounds) {
    const { TILE_SIZE } = ROGUELIKE_CONFIG;

    gameState.enemies.forEach((enemy) => {
      if (
        this.isItemInBounds(enemy, bounds) &&
        gameState.visible[enemy.y][enemy.x]
      ) {
        const brightness = gameState.brightness
          ? gameState.brightness[enemy.y][enemy.x]
          : 1.0;
        this.renderSingleEnemy(enemy, TILE_SIZE, brightness);
      }
    });
  }

  /**
   * 단일 적 렌더링
   */
  renderSingleEnemy(enemy, tileSize, brightness = 1.0) {
    const screenX = enemy.x * tileSize;
    const screenY = enemy.y * tileSize;

    let enemySprite;

    if (enemy.type === "slime") {
      enemySprite = this.createSlimeSprite(enemy, screenX, screenY, tileSize);
    } else if (enemy.type === "goblin") {
      enemySprite = this.createGlowMushroomSprite(
        enemy,
        screenX,
        screenY,
        tileSize
      );
    } else {
      enemySprite = this.createEnemyTextSprite(enemy, screenX, screenY);
    }

    enemySprite.setAlpha(brightness); // 명도에 따른 투명도 조절
    this.mapContainer.add(enemySprite);
  }

  /**
   * 슬라임(토끼) 스프라이트 생성
   */
  createSlimeSprite(enemy, screenX, screenY, tileSize) {
    const rabbitImageKey =
      enemy.facing === "left" ? "rabbit-left" : "rabbit-right";
    return this.add
      .image(screenX, screenY, rabbitImageKey)
      .setOrigin(0.5)
      .setScale(
        (tileSize / UI_CONSTANTS.IMAGE_SCALE_FACTOR) *
          UI_CONSTANTS.MONSTER_SCALE_FACTOR
      );
  }

  /**
   * 형광 버섯(고블린) 스프라이트 생성
   */
  createGlowMushroomSprite(enemy, screenX, screenY, tileSize) {
    const glowMushroomImageKey =
      enemy.facing === "left"
        ? "glow-mushroom-mob-left"
        : "glow-mushroom-mob-right";
    return this.add
      .image(screenX, screenY, glowMushroomImageKey)
      .setOrigin(0.5)
      .setScale(
        (tileSize / UI_CONSTANTS.IMAGE_SCALE_FACTOR) *
          UI_CONSTANTS.MONSTER_SCALE_FACTOR
      );
  }

  /**
   * 적 텍스트 스프라이트 생성
   */
  createEnemyTextSprite(enemy, screenX, screenY) {
    const enemyType = ENEMY_TYPES[enemy.type];
    return this.add
      .text(screenX, screenY, enemyType.symbol, {
        fontSize: UI_CONSTANTS.TILE_FONT_SIZE,
        color: COLORS.ENEMY,
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
  }

  /**
   * 플레이어 렌더링
   */
  renderPlayer(gameState) {
    const { TILE_SIZE } = ROGUELIKE_CONFIG;
    const playerImageKey =
      gameState.player.facing === "left" ? "hero-left" : "hero-right";

    // 타일과 동일한 좌표 계산 방식 사용
    const screenX = gameState.player.x * TILE_SIZE;
    const screenY = gameState.player.y * TILE_SIZE;

    const playerSprite = this.add
      .image(screenX, screenY, playerImageKey)
      .setOrigin(0.5)
      .setScale(
        (TILE_SIZE / UI_CONSTANTS.IMAGE_SCALE_FACTOR) *
          UI_CONSTANTS.CHARACTER_SCALE_FACTOR
      );
    this.mapContainer.add(playerSprite);
  }

  updateHUD() {
    const gameState = this.gameLogic.getGameState();
    const p = gameState.player;
    const wName = gameState.equip.weapon ? gameState.equip.weapon.name : "-";
    const aName = gameState.equip.armor ? gameState.equip.armor.name : "-";
    const hungerState =
      p.hunger === 0
        ? "굶주림"
        : p.hunger <= ROGUELIKE_CONFIG.HUNGER_WARN
        ? "허기"
        : "양호";

    this.hudText.setText(
      `층수 ${gameState.level} · HP ${p.hp}/${p.max} · 포션 ${
        this.gameLogic && "countItems" in this.gameLogic
          ? (this.gameLogic as any).countItems("potion")
          : 0
      } · 음식 ${
        this.gameLogic && "countItems" in this.gameLogic
          ? (this.gameLogic as any).countItems("food")
          : 0
      } · 적 ${gameState.enemies.length} · Lv ${p.level} (EXP ${p.exp}/${
        p.nextExp
      }) · 배고픔 ${p.hunger}/${
        ROGUELIKE_CONFIG.HUNGER_MAX
      } (${hungerState}) · 무기 ${wName} · 방어구 ${aName}`
    );

    // 미니맵 업데이트
    this.updateMinimap();
  }

  updateMinimap() {
    if (!this.minimapContainer) return;

    this.clearMinimap();

    const gameState = this.gameLogic.getGameState();
    const minimapConfig = this.calculateMinimapConfig();

    this.renderMinimapTiles(gameState, minimapConfig);
    this.renderMinimapItems(gameState, minimapConfig);
    this.renderMinimapTraps(gameState, minimapConfig);
    this.renderMinimapEnemies(gameState, minimapConfig);
    this.renderMinimapPlayer(gameState, minimapConfig);
  }

  /**
   * 미니맵 초기화
   */
  clearMinimap() {
    // 컨테이너 내의 모든 객체를 안전하게 제거
    if (this.minimapContainer && this.minimapContainer.list) {
      const children = [...this.minimapContainer.list]; // 복사본 생성
      children.forEach((child) => {
        if (child && typeof child.destroy === "function") {
          // 상호작용이 활성화된 객체만 비활성화
          if (child.input && typeof child.disableInteractive === "function") {
            child.disableInteractive();
          }
          child.destroy();
        }
      });
      this.minimapContainer.removeAll(true);
    }
  }

  /**
   * 미니맵 설정 계산
   */
  calculateMinimapConfig() {
    const { VIEW_WIDTH, VIEW_HEIGHT } = ROGUELIKE_CONFIG;

    const tileSize = Math.min(
      UI_CONSTANTS.MINIMAP_TILE_WIDTH / VIEW_WIDTH,
      UI_CONSTANTS.MINIMAP_TILE_HEIGHT / VIEW_HEIGHT
    );

    return {
      tileSize,
      offsetX: (UI_CONSTANTS.MINIMAP_TILE_WIDTH - VIEW_WIDTH * tileSize) / 2,
      offsetY: (UI_CONSTANTS.MINIMAP_TILE_HEIGHT - VIEW_HEIGHT * tileSize) / 2,
    };
  }

  /**
   * 미니맵 타일 렌더링
   */
  renderMinimapTiles(gameState, config) {
    const { VIEW_WIDTH, VIEW_HEIGHT } = ROGUELIKE_CONFIG;

    for (let y = 0; y < VIEW_HEIGHT; y++) {
      for (let x = 0; x < VIEW_WIDTH; x++) {
        this.renderMinimapSingleTile(gameState, x, y, config);
      }
    }
  }

  /**
   * 미니맵 단일 타일 렌더링
   */
  renderMinimapSingleTile(gameState, x, y, config) {
    const seen = gameState.seen[y][x];
    const visible = gameState.visible[y][x];
    const mapValue = gameState.map[y][x];

    const minimapX = x * config.tileSize + config.offsetX;
    const minimapY = y * config.tileSize + config.offsetY;

    // 바닥 타일인 경우 이미지 사용
    if (mapValue === TILE_TYPES.FLOOR && (visible || seen)) {
      const groundSprite = this.add
        .image(0, 0, "ground")
        .setOrigin(0.5)
        .setScale(
          (config.tileSize / UI_CONSTANTS.IMAGE_SCALE_FACTOR) *
            UI_CONSTANTS.TILE_SCALE_FACTOR
        );
      groundSprite.setPosition(minimapX, minimapY);
      this.minimapContainer.add(groundSprite);
    } else if (mapValue === TILE_TYPES.WALL && seen) {
      // 벽 타일인 경우 이미지 사용
      const wallSprite = this.add
        .image(0, 0, "wall-top")
        .setOrigin(0.5)
        .setScale(
          (config.tileSize / UI_CONSTANTS.IMAGE_SCALE_FACTOR) *
            UI_CONSTANTS.TILE_SCALE_FACTOR
        );
      wallSprite.setPosition(minimapX, minimapY);
      this.minimapContainer.add(wallSprite);
    } else {
      // 다른 타일들은 기존 방식으로 렌더링
      const color = this.getTileColor(mapValue, seen, visible);
      const tile = this.add.rectangle(
        0,
        0,
        config.tileSize,
        config.tileSize,
        color
      );
      tile.setPosition(minimapX, minimapY);
      this.minimapContainer.add(tile);
    }

    // 계단 표시
    if (mapValue === TILE_TYPES.STAIRS && (visible || seen)) {
      this.renderMinimapStairs(minimapX, minimapY, config.tileSize);
    }
  }

  /**
   * 미니맵 계단 렌더링
   */
  renderMinimapStairs(minimapX, minimapY, tileSize) {
    const stairs = this.add
      .text(0, 0, ">", {
        fontSize: `${tileSize * UI_CONSTANTS.MINIMAP_SCALE_FACTORS.STAIRS}px`,
        color: COLORS.STAIRS,
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    stairs.setPosition(minimapX, minimapY);
    this.minimapContainer.add(stairs);
  }

  /**
   * 미니맵 아이템 렌더링
   */
  renderMinimapItems(gameState, config) {
    gameState.items.forEach((item) => {
      if (gameState.visible[item.y][item.x]) {
        this.renderMinimapSingleItem(item, config);
      }
    });
  }

  /**
   * 미니맵 단일 아이템 렌더링
   */
  renderMinimapSingleItem(item, config) {
    const itemType = ITEM_DEFINITIONS[item.type];
    const minimapX = item.x * config.tileSize + config.offsetX;
    const minimapY = item.y * config.tileSize + config.offsetY;

    const itemSprite = this.add
      .text(0, 0, itemType.symbol, {
        fontSize: `${
          config.tileSize * UI_CONSTANTS.MINIMAP_SCALE_FACTORS.ITEM
        }px`,
        color: `#${itemType.color.toString(16)}`,
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    itemSprite.setPosition(minimapX, minimapY);
    this.minimapContainer.add(itemSprite);
  }

  /**
   * 미니맵 함정 렌더링
   */
  renderMinimapTraps(gameState, config) {
    gameState.traps.forEach((trap) => {
      if (trap.seen && gameState.visible[trap.y][trap.x]) {
        this.renderMinimapSingleTrap(trap, config);
      }
    });
  }

  /**
   * 미니맵 단일 함정 렌더링
   */
  renderMinimapSingleTrap(trap, config) {
    const minimapX = trap.x * config.tileSize + config.offsetX;
    const minimapY = trap.y * config.tileSize + config.offsetY;

    const trapSprite = this.add
      .text(0, 0, "^", {
        fontSize: `${
          config.tileSize * UI_CONSTANTS.MINIMAP_SCALE_FACTORS.ITEM
        }px`,
        color: COLORS.ENEMY,
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    trapSprite.setPosition(minimapX, minimapY);
    this.minimapContainer.add(trapSprite);
  }

  /**
   * 미니맵 적 렌더링
   */
  renderMinimapEnemies(gameState, config) {
    gameState.enemies.forEach((enemy) => {
      if (gameState.visible[enemy.y][enemy.x]) {
        this.renderMinimapSingleEnemy(enemy, config);
      }
    });
  }

  /**
   * 미니맵 단일 적 렌더링
   */
  renderMinimapSingleEnemy(enemy, config) {
    const minimapX = enemy.x * config.tileSize + config.offsetX;
    const minimapY = enemy.y * config.tileSize + config.offsetY;

    const enemySprite = this.add
      .text(0, 0, "E", {
        fontSize: `${
          config.tileSize * UI_CONSTANTS.MINIMAP_SCALE_FACTORS.ITEM
        }px`,
        color: COLORS.ENEMY,
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    enemySprite.setPosition(minimapX, minimapY);
    this.minimapContainer.add(enemySprite);
  }

  /**
   * 미니맵 플레이어 렌더링
   */
  renderMinimapPlayer(gameState, config) {
    const playerX = gameState.player.x * config.tileSize + config.offsetX;
    const playerY = gameState.player.y * config.tileSize + config.offsetY;

    const playerSprite = this.add
      .text(0, 0, "@", {
        fontSize: `${
          config.tileSize * UI_CONSTANTS.MINIMAP_SCALE_FACTORS.PLAYER
        }px`,
        color: COLORS.TEXT_ACCENT,
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    playerSprite.setPosition(playerX, playerY);
    this.minimapContainer.add(playerSprite);
  }

  update() {
    const gameState = this.gameLogic.getGameState();

    if (this.handleGlobalKeys()) return;
    if (this.handleInventoryKeys(gameState)) return;
    if (gameState.gameOver) return;

    const moved = this.handleMovementInput();
    this.handleActionInput();

    if (moved) {
      if (this.gameLogic && "endTurn" in this.gameLogic) {
        (this.gameLogic as any).endTurn();
      }
    }

    this.updateGameDisplay();
  }

  /**
   * 전역 키 처리 (게임 상태와 관계없이 작동)
   */
  handleGlobalKeys() {
    if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
      console.log("R 키 눌림 - 게임 재시작");
      this.restartGame();
      return true;
    }
    return false;
  }

  /**
   * 인벤토리 관련 키 처리
   */
  handleInventoryKeys(gameState) {
    if (Phaser.Input.Keyboard.JustDown(this.iKey)) {
      this.toggleInventory();
      return true;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.escKey) &&
      gameState.inventoryOpen
    ) {
      this.toggleInventory();
      return true;
    }

    if (gameState.inventoryOpen) {
      return true; // 인벤토리가 열린 상태에서는 다른 입력 무시
    }

    return false;
  }

  /**
   * 이동 입력 처리
   */
  handleMovementInput() {
    const currentTime = this.time.now;

    // 이동 지연 시간 체크
    if (currentTime - this.lastMoveTime < this.moveDelay) {
      return false;
    }

    let moved = false;

    // 각 방향을 독립적으로 처리 (동시 입력 허용)
    if (this.isLeftKeyPressed()) {
      this.gameLogic.gameState.player.facing = "left";
      if (this.gameLogic && "tryMove" in this.gameLogic) {
        moved = (this.gameLogic as any).tryMove(-1, 0) || moved;
      }
    }

    if (this.isRightKeyPressed()) {
      this.gameLogic.gameState.player.facing = "right";
      if (this.gameLogic && "tryMove" in this.gameLogic) {
        moved = (this.gameLogic as any).tryMove(1, 0) || moved;
      }
    }

    if (this.isUpKeyPressed()) {
      if (this.gameLogic && "tryMove" in this.gameLogic) {
        moved = (this.gameLogic as any).tryMove(0, -1) || moved;
      }
    }

    if (this.isDownKeyPressed()) {
      if (this.gameLogic && "tryMove" in this.gameLogic) {
        moved = (this.gameLogic as any).tryMove(0, 1) || moved;
      }
    }

    // 이동이 성공했을 때만 시간 업데이트
    if (moved) {
      this.lastMoveTime = currentTime;
    }

    return moved;
  }

  /**
   * 액션 입력 처리
   */
  handleActionInput() {
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      if (this.gameLogic && "endTurn" in this.gameLogic) {
        (this.gameLogic as any).endTurn();
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
      if (
        this.gameLogic &&
        "usePotion" in this.gameLogic &&
        (this.gameLogic as any).usePotion()
      ) {
        if (this.gameLogic && "endTurn" in this.gameLogic) {
          (this.gameLogic as any).endTurn();
        }
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
      if (
        this.gameLogic &&
        "eatFood" in this.gameLogic &&
        (this.gameLogic as any).eatFood()
      ) {
        if (this.gameLogic && "endTurn" in this.gameLogic) {
          (this.gameLogic as any).endTurn();
        }
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.descendKey)) {
      if (this.gameLogic && "descend" in this.gameLogic) {
        (this.gameLogic as any).descend();
      }
    }
  }

  /**
   * 게임 화면 업데이트
   */
  updateGameDisplay() {
    this.updateCamera();
    this.render();
    this.updateHUD();
    this.updateMessageLog();
  }

  /**
   * 왼쪽 키 입력 확인 (키를 누르고 있는 동안도 감지)
   */
  isLeftKeyPressed() {
    return this.cursors.left.isDown || this.wasd.A.isDown;
  }

  /**
   * 오른쪽 키 입력 확인 (키를 누르고 있는 동안도 감지)
   */
  isRightKeyPressed() {
    return this.cursors.right.isDown || this.wasd.D.isDown;
  }

  /**
   * 위쪽 키 입력 확인 (키를 누르고 있는 동안도 감지)
   */
  isUpKeyPressed() {
    return this.cursors.up.isDown || this.wasd.W.isDown;
  }

  /**
   * 아래쪽 키 입력 확인 (키를 누르고 있는 동안도 감지)
   */
  isDownKeyPressed() {
    return this.cursors.down.isDown || this.wasd.S.isDown;
  }

  // ===========================================
  // 인벤토리 관리
  // ===========================================
  /**
   * 인벤토리 패널을 토글합니다.
   * @private
   */
  toggleInventory() {
    if (this.gameLogic && "toggleInventory" in this.gameLogic) {
      (this.gameLogic as any).toggleInventory();
    }
    const gameState = this.gameLogic.getGameState();
    this.inventoryPanel.setVisible(gameState.inventoryOpen);
    this.inventoryText.setVisible(gameState.inventoryOpen);

    if (gameState.inventoryOpen) {
      this.renderInventory();
    }
  }

  renderInventory() {
    const gameState = this.gameLogic.getGameState();
    const items = gameState.inventory
      .map((item, index) => this.formatInventoryItem(item, index))
      .join("\n");

    this.inventoryText.setText(items || "(비어 있음)");
  }

  /**
   * 인벤토리 아이템 포맷팅
   */
  formatInventoryItem(item, index) {
    const itemInfo = this.getItemInfo(item);
    return `${index + 1}. ${itemInfo.icon} ${itemInfo.name} (${itemInfo.meta})`;
  }

  /**
   * 아이템 정보 추출
   */
  getItemInfo(item) {
    switch (item.type) {
      case "potion":
        return {
          meta: "HP +6~10",
          icon: ITEM_DEFINITIONS[item.type].symbol,
          name: item.name || "체력 물약",
        };
      case "weapon":
        return {
          meta: `피해 +${item.dmg[0]}~+${item.dmg[1]}`,
          icon: ITEM_DEFINITIONS[item.type].symbol,
          name: item.name,
        };
      case "armor":
        return {
          meta: `방어 +${item.def}`,
          icon: ITEM_DEFINITIONS[item.type].symbol,
          name: item.name,
        };
      case "food":
        return {
          meta: `배고픔 +${item.hunger[0]}~+${item.hunger[1]}`,
          icon: ITEM_DEFINITIONS[item.type].symbol,
          name: item.name || "식량",
        };
      case "cooked_food":
        return {
          meta: `HP +${item.hp[0]}~+${item.hp[1]}, 배고픔 +${item.hunger[0]}~+${item.hunger[1]}`,
          icon: item.symbol || "🍽️",
          name: item.isSpecial ? `${item.name} ✨` : item.name,
        };
      default:
        return {
          meta: "",
          icon: "?",
          name: item.name || "알 수 없는 아이템",
        };
    }
  }

  useInventoryItem(index: any) {
    const result =
      this.gameLogic && "useInventoryItem" in this.gameLogic
        ? (this.gameLogic as any).useInventoryItem(index)
        : null;

    if (result) {
      this.renderInventory();
      this.updateHUD();
      this.updateMessageLog();
    }
  }

  restartGame() {
    console.log("게임 재시작 시작");

    // 게임오버 UI 정리
    this.clearGameOverUI();

    // 모든 게임오버 관련 UI 요소 강제 정리
    this.forceCleanupGameOverUI();

    // 게임 재시작
    if (this.gameLogic && "resetGame" in this.gameLogic) {
      (this.gameLogic as any).resetGame();
    }
    if (this.gameLogic && "generateLevel" in this.gameLogic) {
      (this.gameLogic as any).generateLevel();
    }

    // 화면 업데이트
    this.render();
    this.updateHUD();
    this.updateMessageLog();

    console.log("게임 재시작 완료");
  }

  /**
   * 게임오버 UI 강제 정리
   * @private
   */
  forceCleanupGameOverUI() {
    console.log("게임오버 UI 강제 정리 시작");

    // 모든 UI 요소를 확인하고 게임오버 관련 요소들 정리
    this.uiElements.forEach((element, key) => {
      if (key === "victory" || key === "gameOver") {
        console.log(`${key} UI 강제 정리 중...`);
        if (element.overlay && element.overlay.destroy) {
          element.overlay.destroy();
        }
        if (element.victoryText && element.victoryText.destroy) {
          element.victoryText.destroy();
        }
        if (element.gameOverText && element.gameOverText.destroy) {
          element.gameOverText.destroy();
        }
        if (element.instructionText && element.instructionText.destroy) {
          element.instructionText.destroy();
        }
        this.uiElements.delete(key);
      }
    });

    console.log("게임오버 UI 강제 정리 완료");
  }

  /**
   * 게임오버 UI 정리
   * @private
   */
  clearGameOverUI() {
    console.log("게임오버 UI 정리 시작");

    // 승리 화면 정리
    const victoryUI = this.getUIElement("victory");
    if (victoryUI) {
      console.log("승리 UI 정리 중...");
      if (victoryUI.overlay && victoryUI.overlay.destroy) {
        victoryUI.overlay.destroy();
      }
      if (victoryUI.victoryText && victoryUI.victoryText.destroy) {
        victoryUI.victoryText.destroy();
      }
      if (victoryUI.instructionText && victoryUI.instructionText.destroy) {
        victoryUI.instructionText.destroy();
      }
      this.uiElements.delete("victory");
    }

    // 게임오버 화면 정리
    const gameOverUI = this.getUIElement("gameOver");
    if (gameOverUI) {
      console.log("게임오버 UI 정리 중...");
      if (gameOverUI.overlay && gameOverUI.overlay.destroy) {
        gameOverUI.overlay.destroy();
      }
      if (gameOverUI.gameOverText && gameOverUI.gameOverText.destroy) {
        gameOverUI.gameOverText.destroy();
      }
      if (gameOverUI.instructionText && gameOverUI.instructionText.destroy) {
        gameOverUI.instructionText.destroy();
      }
      this.uiElements.delete("gameOver");
    }

    console.log("게임오버 UI 정리 완료");
  }

  /**
   * 요리 아이템을 인벤토리에 추가합니다.
   * @param {Object} dishItem - 요리 아이템 데이터
   * @param {string} dishItem.name - 아이템 이름
   * @param {string} dishItem.symbol - 아이템 심볼
   * @param {Array} dishItem.hp - HP 회복량 범위
   * @param {Array} dishItem.hunger - 배고픔 회복량 범위
   * @param {boolean} [dishItem.isSpecial=false] - 특별 아이템 여부
   * @private
   */
  addDishToInventory(dishItem) {
    // 게임 로직에 요리 아이템 추가
    const success = this.gameLogic.addItemToInventory(dishItem);

    if (success) {
      this.addMessage(
        `"${dishItem.name}"이(가) 인벤토리에 추가되었습니다!`,
        false
      );

      // 인벤토리가 열려있다면 업데이트
      if (this.gameLogic.getGameState().inventoryOpen) {
        this.renderInventory();
      }

      // HUD 업데이트
      this.updateHUD();
    } else {
      this.addMessage("인벤토리가 가득 찼습니다!", true);
    }
  }
}
