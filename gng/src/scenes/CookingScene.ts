import { BaseScene } from "./BaseScene.js";
import { Ingredient, INGREDIENTS, PALATES, RECIPES } from "../data/GameData.js";
import { UI_CONFIG, GAME_EVENTS, Direction } from "../data/Config.js";
import { CookingGameLogic } from "../logic/CookingGameLogic.js";
import { CookingGameState, Recipe } from "../data/Validation.js";

// UI 상수 정의
const COOKING_UI_CONSTANTS = {
  POPUP: {
    WIDTH: 800,
    HEIGHT: 600,
    BACKGROUND_COLOR: 0x0f1020,
    BORDER_COLOR: 0x8ef6ff,
    BORDER_ALPHA: 0.3,
    OVERLAY_COLOR: 0x000000,
    OVERLAY_ALPHA: 0.7,
  },
  BUTTONS: {
    CLOSE_SIZE: 30,
    COOK_WIDTH: 100,
    COOK_HEIGHT: 40,
    RETRY_WIDTH: 100,
    RETRY_HEIGHT: 30,
    CLOSE_WIDTH: 100,
    CLOSE_HEIGHT: 30,
  },
  INGREDIENT_GRID: {
    ITEM_WIDTH: 80,
    ITEM_HEIGHT: 80,
    SPACING: 20,
    START_X: -100,
    START_Y: -100,
  },
  PLATE: {
    WIDTH: 400,
    HEIGHT: 80,
    ITEM_SPACING: 50,
    ITEM_SIZE: 70,
  },
  ANIMATION: {
    COOKING_DELAY: 2000,
    FLAME_COUNT: 8,
    CONFETTI_COUNT: 15,
  },
  COLORS: {
    CARD_BACKGROUND: 0x202552,
    CARD_HOVER: 0x2a2f55,
    PLATE_BACKGROUND: 0x1b1f46,
    RESULT_BACKGROUND: 0x141632,
    COOK_BUTTON: 0x2f9dfd,
    COOK_HOVER: 0x1e90ff,
    CLOSE_BUTTON: 0xf87171,
    CLOSE_HOVER: 0xff5252,
    RETRY_BUTTON: 0x2a2f55,
    RETRY_HOVER: 0x3a3f65,
    FLAME: 0xff6b35,
    CONFETTI: 0xffd166,
  },
  FONTS: {
    TITLE: UI_CONFIG.FONTS.SIZES.TITLE,
    LARGE: UI_CONFIG.FONTS.SIZES.LARGE,
    MEDIUM: UI_CONFIG.FONTS.SIZES.MEDIUM,
    SMALL: UI_CONFIG.FONTS.SIZES.SMALL,
  },
};

export default class CookingScene extends BaseScene<
  CookingGameState,
  CookingGameLogic
> {
  // Game state properties
  private pantryState: Ingredient[] | null;
  private palate: any;

  // UI elements
  private overlay: Phaser.GameObjects.Rectangle | null;
  private popupContainer: Phaser.GameObjects.Container | null;
  private popupBg: Phaser.GameObjects.Rectangle | null;
  private closeButton: Phaser.GameObjects.Rectangle | null;
  private pickCountText: Phaser.GameObjects.Text | null;
  private ingredientButtons: any[];
  private plateArea: Phaser.GameObjects.Rectangle | null;
  private plateItems: any[];
  private cookButton: Phaser.GameObjects.Rectangle | null;

  constructor() {
    super({ key: "CookingScene" });

    // 초기화
    this.pantryState = null;
    this.palate = null;

    // UI 요소들
    this.overlay = null;
    this.popupContainer = null;
    this.popupBg = null;
    this.closeButton = null;
    this.pickCountText = null;
    this.ingredientButtons = [];
    this.plateArea = null;
    this.plateItems = [];
    this.cookButton = null;
  }

  preload() {
    this.loadIngredientImages();
    this.loadRecipeImages();
    this.initializeGameLogic();
    this.initializeGameState();
  }

  /**
   * 게임 로직 인스턴스를 초기화합니다.
   * @private
   */
  initializeGameLogic() {
    this.gameLogic = new CookingGameLogic();
    this.setupGameEventListeners();
  }

  /**
   * 게임 이벤트 리스너 설정
   * @private
   */
  setupGameEventListeners() {
    this.onGameEvent(GAME_EVENTS.MESSAGE_ADDED, (message) => {
      this.updateMessageDisplay();
    });

    this.onGameEvent(GAME_EVENTS.COOKING_END, (data) => {
      this.handleCookingEnd(data);
    });
  }

  /**
   * 재료 이미지들을 로드합니다.
   * @private
   */
  loadIngredientImages() {
    this.load.image("glow-mushroom", "assets/glow-mushroom.png");
    this.load.image("rock-pepper", "assets/rock-black-pepper.png");
    this.load.image("rabbit-meat", "assets/rabbit-meat.png");
  }

  /**
   * 레시피 이미지들을 로드합니다.
   * @private
   */
  loadRecipeImages() {
    RECIPES.forEach((recipe) => {
      this.load.image(recipe.id, `assets/${recipe.image}`);
    });
  }

  /**
   * 게임 상태를 초기화합니다.
   * @private
   */
  initializeGameState() {
    this.pantryState = JSON.parse(JSON.stringify(INGREDIENTS));
    this.palate = PALATES[Math.floor(Math.random() * PALATES.length)];
  }

  create() {
    console.log("CookingScene create() 시작");
    const { width, height } = this.scale;

    // UI 생성 복원
    this.createOverlay(width, height);
    this.createPopupContainer(width, height);
    this.createPopupBackground();
    this.createCloseButton();
    this.createPopupUI();

    // this.createTestButtons(); // 테스트 버튼 제거
    // this.setupGlobalInputListeners(); // 전역 입력 리스너 제거
    this.startGame();

    // 화면 크기 변경 이벤트 리스너 설정
    this.scale.on("resize", this.handleResize, this);

    console.log("CookingScene create() 완료");
  }

  /**
   * 화면 크기 변경 처리
   * @param {Object} gameSize - 새로운 게임 크기
   * @private
   */
  handleResize(gameSize: any) {
    console.log("CookingScene 화면 크기 변경:", gameSize);
    const { width, height } = this.scale;

    // 팝업 컨테이너 위치 재조정
    if (this.popupContainer) {
      this.popupContainer.setPosition(width / 2, height / 2);
    }

    // 오버레이 크기 재조정
    if (this.overlay) {
      this.overlay.setSize(width, height);
    }
  }

  /**
   * 팝업 오버레이를 생성합니다.
   * @param {number} width - 화면 너비
   * @param {number} height - 화면 높이
   * @private
   */
  createOverlay(width: number, height: number) {
    this.overlay = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      COOKING_UI_CONSTANTS.POPUP.OVERLAY_COLOR,
      COOKING_UI_CONSTANTS.POPUP.OVERLAY_ALPHA
    );
  }

  /**
   * 팝업 컨테이너를 생성합니다.
   * @param {number} width - 화면 너비
   * @param {number} height - 화면 높이
   * @private
   */
  createPopupContainer(width: number, height: number) {
    this.popupContainer = this.add.container(width / 2, height / 2);
    this.popupContainer.setDepth(999); // 높은 depth 설정
  }

  /**
   * 팝업 배경을 생성합니다.
   * @private
   */
  createPopupBackground() {
    this.popupBg = this.add.rectangle(
      0,
      0,
      COOKING_UI_CONSTANTS.POPUP.WIDTH,
      COOKING_UI_CONSTANTS.POPUP.HEIGHT,
      COOKING_UI_CONSTANTS.POPUP.BACKGROUND_COLOR
    );
    this.popupBg.setStrokeStyle(
      2,
      COOKING_UI_CONSTANTS.POPUP.BORDER_COLOR,
      COOKING_UI_CONSTANTS.POPUP.BORDER_ALPHA
    );
    this.popupContainer?.add(this.popupBg);
  }

  /**
   * 닫기 버튼을 생성합니다.
   * @private
   */
  createCloseButton() {
    console.log("닫기 버튼 생성 시작");
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // 화면 우상단에 닫기 버튼 배치
    this.closeButton = this.add.rectangle(
      centerX + 300,
      centerY - 200,
      COOKING_UI_CONSTANTS.BUTTONS.CLOSE_SIZE,
      COOKING_UI_CONSTANTS.BUTTONS.CLOSE_SIZE,
      COOKING_UI_CONSTANTS.COLORS.CLOSE_BUTTON
    );
    this.closeButton.setInteractive();
    this.closeButton.setDepth(10000); // 매우 높은 depth 설정
    // 클릭 영역을 더 크게 설정
    this.closeButton.setSize(
      COOKING_UI_CONSTANTS.BUTTONS.CLOSE_SIZE + 40,
      COOKING_UI_CONSTANTS.BUTTONS.CLOSE_SIZE + 40
    );
    this.closeButton.on("pointerdown", () => {
      console.log("닫기 버튼 클릭됨!");
      this.closePopup();
    });
    this.closeButton.on("pointerover", () => {
      console.log("닫기 버튼에 마우스 호버됨");
      this.closeButton?.setFillStyle(COOKING_UI_CONSTANTS.COLORS.CLOSE_HOVER);
    });
    this.closeButton.on("pointerout", () => {
      console.log("닫기 버튼에서 마우스 벗어남");
      this.closeButton?.setFillStyle(COOKING_UI_CONSTANTS.COLORS.CLOSE_BUTTON);
    });
    // popupContainer에 추가하지 않고 직접 화면에 추가
    // this.popupContainer.add(this.closeButton);
    console.log("닫기 버튼 생성 완료");

    const closeXText = this.add
      .text(centerX + 300, centerY - 200, "×", {
        fontSize: "20px",
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    closeXText.setDepth(10001); // 버튼보다 높은 depth
    closeXText.disableInteractive(); // 텍스트가 클릭을 방해하지 않도록
    // popupContainer에 추가하지 않고 직접 화면에 추가
    // this.popupContainer.add(closeXText);
  }

  // ===========================================
  // UI 생성
  // ===========================================
  /**
   * 팝업 UI 요소들을 생성합니다.
   * @private
   */
  createPopupUI() {
    this.createTitle();
    this.createPickCountText();
    this.createIngredientGrid();
    this.createPlateArea();
    this.createButtons();
  }

  /**
   * 게임 타이틀을 생성합니다.
   * @private
   */
  createTitle() {
    const titleText = this.add
      .text(0, -250, "간단한 요리 게임", {
        fontSize: COOKING_UI_CONSTANTS.FONTS.TITLE,
        color: "#8ef6ff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer?.add(titleText);
  }

  /**
   * 선택된 재료 수 텍스트를 생성합니다.
   * @private
   */
  createPickCountText() {
    this.pickCountText = this.add
      .text(0, -200, `선택: 0/3`, {
        fontSize: COOKING_UI_CONSTANTS.FONTS.LARGE,
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer?.add(this.pickCountText);
  }

  /**
   * 재료 그리드를 생성합니다.
   * @private
   */
  createIngredientGrid() {
    this.ingredientButtons = [];

    this.pantryState?.forEach((ingredient, index) => {
      const position = this.calculateIngredientPosition(index);
      const buttonData = this.createIngredientButton(ingredient, position);

      this.ingredientButtons.push(buttonData);
      this.popupContainer?.add([
        buttonData.card,
        buttonData.icon,
        buttonData.name,
        buttonData.stock,
      ]);
    });
  }

  /**
   * 재료 버튼의 위치를 계산합니다.
   * @param {number} index - 재료 인덱스
   * @returns {Object} x, y 좌표
   * @private
   */
  calculateIngredientPosition(index: number) {
    const { START_X, START_Y, ITEM_WIDTH, SPACING } =
      COOKING_UI_CONSTANTS.INGREDIENT_GRID;
    return {
      x: START_X + index * (ITEM_WIDTH + SPACING),
      y: START_Y,
    };
  }

  /**
   * 개별 재료 버튼을 생성합니다.
   * @param {Object} ingredient - 재료 데이터
   * @param {Object} position - 위치 정보
   * @returns {Object} 버튼 요소들
   * @private
   */
  createIngredientButton(ingredient: Ingredient, position: any) {
    const { ITEM_WIDTH, ITEM_HEIGHT } = COOKING_UI_CONSTANTS.INGREDIENT_GRID;

    const card = this.createIngredientCard(
      ingredient,
      position,
      ITEM_WIDTH,
      ITEM_HEIGHT
    );
    const icon = this.createIngredientIcon(ingredient, position);
    const name = this.createIngredientName(ingredient, position);
    const stock = this.createIngredientStock(
      ingredient,
      position,
      ITEM_WIDTH,
      ITEM_HEIGHT
    );

    this.setupIngredientCardEvents(card, ingredient);

    return { card, icon, name, stock, ingredient };
  }

  /**
   * 재료 카드를 생성합니다.
   * @param {Object} ingredient - 재료 데이터
   * @param {Object} position - 위치 정보
   * @param {number} width - 카드 너비
   * @param {number} height - 카드 높이
   * @returns {Phaser.GameObjects.Rectangle} 카드 객체
   * @private
   */
  createIngredientCard(
    ingredient: Ingredient,
    position: any,
    width: number,
    height: number
  ) {
    const card = this.add.rectangle(
      position.x,
      position.y,
      width,
      height,
      COOKING_UI_CONSTANTS.COLORS.CARD_BACKGROUND
    );
    card.setStrokeStyle(2, 0xffffff, 0.3);
    card.setInteractive();
    return card;
  }

  /**
   * 재료 아이콘을 생성합니다.
   * @param {Object} ingredient - 재료 데이터
   * @param {Object} position - 위치 정보
   * @returns {Phaser.GameObjects.Image} 아이콘 객체
   * @private
   */
  createIngredientIcon(ingredient: Ingredient, position: Direction) {
    const imageKey = this.getIngredientImageKey(ingredient.id);
    return this.add
      .image(position.x, position.y - 10, imageKey)
      .setDisplaySize(60, 60)
      .setOrigin(0.5);
  }

  /**
   * 재료 이름을 생성합니다.
   * @param {Object} ingredient - 재료 데이터
   * @param {Object} position - 위치 정보
   * @returns {Phaser.GameObjects.Text} 이름 텍스트 객체
   * @private
   */
  createIngredientName(ingredient: Ingredient, position: Direction) {
    return this.add
      .text(position.x, position.y + 15, ingredient.name, {
        fontSize: COOKING_UI_CONSTANTS.FONTS.SMALL,
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
  }

  /**
   * 재료 재고를 생성합니다.
   * @param {Object} ingredient - 재료 데이터
   * @param {Object} position - 위치 정보
   * @param {number} width - 카드 너비
   * @param {number} height - 카드 높이
   * @returns {Phaser.GameObjects.Text} 재고 텍스트 객체
   * @private
   */
  createIngredientStock(
    ingredient: Ingredient,
    position: Direction,
    width: number,
    height: number
  ) {
    return this.add
      .text(
        position.x + width / 2 - 5,
        position.y + height / 2 - 5,
        `${ingredient.stock}`,
        {
          fontSize: "10px",
          color: "#9aa3dd",
          fontFamily: "Arial",
        }
      )
      .setOrigin(1, 1);
  }

  /**
   * 재료 카드 이벤트를 설정합니다.
   * @param {Phaser.GameObjects.Rectangle} card - 카드 객체
   * @param {Object} ingredient - 재료 데이터
   * @private
   */
  setupIngredientCardEvents(
    card: Phaser.GameObjects.Rectangle,
    ingredient: Ingredient
  ) {
    card.on("pointerdown", () => this.pickIngredient(ingredient.id));
    card.on("pointerover", () =>
      card.setFillStyle(COOKING_UI_CONSTANTS.COLORS.CARD_HOVER)
    );
    card.on("pointerout", () =>
      card.setFillStyle(COOKING_UI_CONSTANTS.COLORS.CARD_BACKGROUND)
    );
  }

  /**
   * 접시 영역을 생성합니다.
   * @private
   */
  createPlateArea() {
    this.createPlateBackground();
    this.createPlateTitle();
    this.plateItems = [];
  }

  /**
   * 접시 배경을 생성합니다.
   * @private
   */
  createPlateBackground() {
    const { WIDTH, HEIGHT } = COOKING_UI_CONSTANTS.PLATE;
    this.plateArea = this.add.rectangle(
      0,
      50,
      WIDTH,
      HEIGHT,
      COOKING_UI_CONSTANTS.COLORS.PLATE_BACKGROUND
    );
    this.plateArea.setStrokeStyle(2, 0xffffff, 0.3);
    this.popupContainer?.add(this.plateArea);
  }

  /**
   * 접시 제목을 생성합니다.
   * @private
   */
  createPlateTitle() {
    const plateTitle = this.add
      .text(0, 10, "당신의 접시", {
        fontSize: COOKING_UI_CONSTANTS.FONTS.LARGE,
        color: "#ffd166",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer?.add(plateTitle);
  }

  /**
   * 버튼들을 생성합니다.
   * @private
   */
  createButtons() {
    this.createCookButton();
  }

  /**
   * 조리하기 버튼을 생성합니다.
   * @private
   */
  createCookButton() {
    console.log("조리하기 버튼 생성 시작");
    const { COOK_WIDTH, COOK_HEIGHT } = COOKING_UI_CONSTANTS.BUTTONS;
    const { width, height } = this.scale;

    // 화면 중앙 기준으로 버튼 배치
    const centerX = width / 2;
    const centerY = height / 2;

    // 버튼을 화면 중앙 하단에 배치
    this.cookButton = this.add.rectangle(
      centerX,
      centerY + 100, // 화면 중앙에서 아래로 100픽셀
      COOK_WIDTH,
      COOK_HEIGHT,
      COOKING_UI_CONSTANTS.COLORS.COOK_BUTTON
    );
    this.cookButton.setInteractive();
    this.cookButton.setDepth(10000); // 매우 높은 depth 설정
    // 클릭 영역을 더 크게 설정
    this.cookButton.setSize(COOK_WIDTH + 40, COOK_HEIGHT + 40);
    this.cookButton.on("pointerdown", () => {
      console.log("조리하기 버튼 클릭됨!");
      this.cookDish();
    });
    this.cookButton.on("pointerover", () => {
      console.log("조리하기 버튼에 마우스 호버됨");
      this.cookButton?.setFillStyle(COOKING_UI_CONSTANTS.COLORS.COOK_HOVER);
    });
    this.cookButton.on("pointerout", () => {
      console.log("조리하기 버튼에서 마우스 벗어남");
      this.cookButton?.setFillStyle(COOKING_UI_CONSTANTS.COLORS.COOK_BUTTON);
    });
    // popupContainer에 추가하지 않고 직접 화면에 추가
    // this.popupContainer.add(this.cookButton);
    console.log("조리하기 버튼 생성 완료");

    const cookText = this.add
      .text(centerX, centerY + 100, "조리하기", {
        fontSize: COOKING_UI_CONSTANTS.FONTS.LARGE,
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    cookText.setDepth(10001); // 버튼보다 높은 depth
    cookText.disableInteractive(); // 텍스트가 클릭을 방해하지 않도록
    // popupContainer에 추가하지 않고 직접 화면에 추가
    // this.popupContainer.add(cookText);
  }

  /**
   * 테스트용 간단한 버튼들을 생성합니다.
   * @private
   */
  createTestButtons() {
    console.log("테스트 버튼 생성 시작");

    const { width, height } = this.scale;
    console.log("화면 크기:", width, height);
    console.log("화면 중앙:", width / 2, height / 2);

    // 화면 중앙 기준으로 버튼 배치
    const centerX = width / 2;
    const centerY = height / 2;

    // 화면 중앙에서 좌우로 200픽셀 떨어진 위치에 버튼 배치
    const testButton1 = this.add.rectangle(
      centerX - 200,
      centerY,
      150,
      60,
      0xff0000
    );
    testButton1.setInteractive();
    testButton1.setDepth(20000);

    console.log("테스트 버튼 1 위치:", testButton1.x, testButton1.y);
    console.log("테스트 버튼 1 크기:", testButton1.width, testButton1.height);

    testButton1.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      console.log("테스트 버튼 1 클릭됨!", pointer.x, pointer.y);
      alert("테스트 버튼 1이 클릭되었습니다!");
    });
    testButton1.on("pointerover", () => {
      console.log("테스트 버튼 1에 호버됨");
      testButton1.setFillStyle(0xff6666);
    });
    testButton1.on("pointerout", () => {
      console.log("테스트 버튼 1에서 벗어남");
      testButton1.setFillStyle(0xff0000);
    });

    // 두 번째 테스트 버튼
    const testButton2 = this.add.rectangle(
      centerX + 200,
      centerY,
      150,
      60,
      0x0000ff
    );
    testButton2.setInteractive();
    testButton2.setDepth(20000);

    console.log("테스트 버튼 2 위치:", testButton2.x, testButton2.y);
    console.log("테스트 버튼 2 크기:", testButton2.width, testButton2.height);

    testButton2.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      console.log("테스트 버튼 2 클릭됨!", pointer.x, pointer.y);
      alert("테스트 버튼 2가 클릭되었습니다!");
    });
    testButton2.on("pointerover", () => {
      console.log("테스트 버튼 2에 호버됨");
      testButton2.setFillStyle(0x6666ff);
    });
    testButton2.on("pointerout", () => {
      console.log("테스트 버튼 2에서 벗어남");
      testButton2.setFillStyle(0x0000ff);
    });

    console.log("테스트 버튼 생성 완료");
  }

  /**
   * 전역 입력 리스너를 설정합니다.
   * @private
   */
  setupGlobalInputListeners() {
    console.log("전역 입력 리스너 설정 시작");

    // 전역 마우스 이벤트
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      console.log("전역 마우스 클릭 감지:", pointer.x, pointer.y);
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      console.log("전역 마우스 릴리즈 감지:", pointer.x, pointer.y);
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      // 너무 많은 로그를 방지하기 위해 가끔만 출력
      if (Math.random() < 0.01) {
        console.log("전역 마우스 이동 감지:", pointer.x, pointer.y);
      }
    });

    // 브라우저 DOM 이벤트도 테스트
    document.addEventListener("click", (event) => {
      console.log("DOM 클릭 이벤트 감지:", event.clientX, event.clientY);
    });

    document.addEventListener("mousedown", (event) => {
      console.log("DOM 마우스 다운 이벤트 감지:", event.clientX, event.clientY);
    });

    console.log("전역 입력 리스너 설정 완료");
  }

  // ===========================================
  // 게임 로직
  // ===========================================
  /**
   * 게임을 시작합니다.
   * @private
   */
  startGame() {
    console.log("startGame() 메서드 호출됨");
    try {
      if (this.gameLogic && "startGame" in this.gameLogic) {
        (this.gameLogic as any).startGame();
      }
      console.log("게임 로직 시작 완료");
    } catch (error) {
      console.error("게임 시작 중 오류:", error);
    }
  }

  /**
   * 재료를 선택합니다.
   * @param {string} ingredientId - 재료 ID
   * @private
   */
  pickIngredient(ingredientId: any) {
    try {
      const gameState = this.gameLogic?.getGameState();
      if (gameState.gameEnded) return;

      const ingredient = this.pantryState?.find(
        (ing) => ing.id === ingredientId
      );
      if (!ingredient || ingredient.stock <= 0) return;

      // 재고 감소
      ingredient.stock--;

      // 게임 로직에 재료 추가
      if (this.gameLogic?.addIngredient(ingredient)) {
        this.updateUI();
      }
    } catch (error) {
      console.error("재료 선택 중 오류:", error);
    }
  }

  /**
   * UI를 업데이트합니다.
   * @private
   */
  updateUI() {
    try {
      this.gameLogic?.getGameState();
      const currentPlate = this.gameLogic?.getCurrentPlate();
      this.updateIngredientGrid();
      this.updatePlate();
      this.updatePickCount(currentPlate || []);
    } catch (error) {
      console.error("UI 업데이트 중 오류:", error);
    }
  }

  /**
   * 재료 그리드를 업데이트합니다.
   * @private
   */
  updateIngredientGrid() {
    this.ingredientButtons.forEach((button: any) => {
      const ingredient = this.pantryState?.find(
        (ing) => ing.id === button.ingredient.id
      );
      button.stock.setText(`${ingredient?.stock}`);

      if (ingredient?.stock && ingredient.stock <= 0) {
        button.card.setAlpha(0.45);
        button.card.disableInteractive();
      }
    });
  }

  /**
   * 선택 수를 업데이트합니다.
   * @param {Array} currentPlate - 현재 접시의 재료들
   * @private
   */
  updatePickCount(currentPlate: Ingredient[]) {
    this.pickCountText?.setText(`선택: ${currentPlate.length}/3`);
  }

  /**
   * 접시를 업데이트합니다.
   * @private
   */
  updatePlate() {
    this.clearPlateItems();

    const currentPlate =
      this.gameLogic && "getCurrentPlate" in this.gameLogic
        ? (this.gameLogic as any).getCurrentPlate()
        : null;
    const recipe =
      this.gameLogic && "getCurrentRecipe" in this.gameLogic
        ? (this.gameLogic as any).getCurrentRecipe()
        : null;

    if (recipe) {
      this.showCompleteDish(recipe);
    } else {
      this.showIndividualIngredients(currentPlate);
    }
  }

  /**
   * 기존 접시 아이템들을 제거합니다.
   * @private
   */
  clearPlateItems() {
    this.plateItems.forEach((item) => item.destroy());
    this.plateItems = [];
  }

  /**
   * 완성된 요리를 표시합니다.
   * @param {Object} recipe - 레시피 정보
   * @private
   */
  showCompleteDish(recipe: Recipe) {
    const completeDish = this.add
      .image(0, 50, recipe.id)
      .setDisplaySize(120, 120)
      .setOrigin(0.5);

    this.plateItems.push(completeDish);
    this.popupContainer?.add(completeDish);
  }

  /**
   * 개별 재료들을 표시합니다.
   * @param {Array} currentPlate - 현재 접시의 재료들
   * @private
   */
  showIndividualIngredients(currentPlate: Ingredient[]) {
    const { ITEM_SPACING } = COOKING_UI_CONSTANTS.PLATE;
    const plateY = 50;
    const startX = (-(currentPlate.length - 1) * ITEM_SPACING) / 2;

    currentPlate.forEach((ingredient, index) => {
      const position = {
        x: startX + index * ITEM_SPACING,
        y: plateY,
      };

      this.createPlateIngredient(ingredient, position);
    });
  }

  /**
   * 접시에 재료를 생성합니다.
   * @param {Object} ingredient - 재료 데이터
   * @param {Object} position - 위치 정보
   * @private
   */
  createPlateIngredient(ingredient: Ingredient, position: Direction) {
    const imageKey = this.getIngredientImageKey(ingredient.id);
    const { ITEM_SIZE } = COOKING_UI_CONSTANTS.PLATE;

    const item = this.add
      .image(position.x, position.y, imageKey)
      .setDisplaySize(ITEM_SIZE, ITEM_SIZE)
      .setOrigin(0.5);

    this.plateItems.push(item);
    this.popupContainer?.add(item);
  }

  /**
   * 재료 ID에 따른 이미지 키 반환
   * @param {string} ingredientId - 재료 ID
   * @returns {string} 이미지 키
   */
  getIngredientImageKey(ingredientId: string) {
    switch (ingredientId) {
      case "rabbit":
        return "rabbit-meat";
      case "mushroom":
        return "glow-mushroom";
      case "pepper":
        return "rock-pepper";
      default:
        return "rabbit-meat";
    }
  }

  // ===========================================
  // 조리 시스템
  // ===========================================
  /**
   * 요리를 조리합니다.
   * @private
   */
  cookDish() {
    console.log("cookDish() 메서드 호출됨");
    try {
      const gameState = this.gameLogic?.getGameState();
      console.log("현재 게임 상태:", gameState);

      if (gameState.gameEnded) {
        console.log("게임이 이미 종료됨");
        return;
      }

      const currentPlate =
        this.gameLogic && "getCurrentPlate" in this.gameLogic
          ? (this.gameLogic as any).getCurrentPlate()
          : null;
      console.log("현재 접시 상태:", currentPlate);

      if (currentPlate.length === 0) {
        console.log("접시가 비어있음");
        this.addMessage("재료를 선택해주세요!");
        return;
      }

      console.log("조리 과정 시작");
      this.showCookingProcess();
    } catch (error) {
      console.error("조리 중 오류:", error);
    }
  }

  /**
   * 조리 과정을 표시합니다.
   * @private
   */
  showCookingProcess() {
    this.disableCookButton();
    const cookingText = this.createCookingText();
    this.createCookingAnimation();
    this.scheduleCookingCompletion(cookingText);
  }

  /**
   * 조리 버튼을 비활성화합니다.
   * @private
   */
  disableCookButton() {
    this.cookButton?.disableInteractive();
    this.cookButton?.setAlpha(0.5);
  }

  /**
   * 조리 중 텍스트를 생성합니다.
   * @returns {Phaser.GameObjects.Text} 조리 중 텍스트
   * @private
   */
  createCookingText() {
    const cookingText = this.add
      .text(0, 200, "조리 중... 🔥", {
        fontSize: "18px",
        color: "#ffd166",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer?.add(cookingText);
    return cookingText;
  }

  /**
   * 조리 완료를 스케줄링합니다.
   * @param {Phaser.GameObjects.Text} cookingText - 조리 중 텍스트
   * @private
   */
  scheduleCookingCompletion(cookingText: Phaser.GameObjects.Text) {
    this.time.delayedCall(COOKING_UI_CONSTANTS.ANIMATION.COOKING_DELAY, () => {
      this.finishCooking(cookingText);
    });
  }

  /**
   * 조리 애니메이션을 생성합니다.
   * @private
   */
  createCookingAnimation() {
    const { FLAME_COUNT } = COOKING_UI_CONSTANTS.ANIMATION;

    for (let i = 0; i < FLAME_COUNT; i++) {
      this.createFlameEffect();
    }
  }

  /**
   * 개별 불꽃 효과를 생성합니다.
   * @private
   */
  createFlameEffect() {
    const flame = this.createFlame();
    this.popupContainer?.add(flame);
    this.animateFlame(flame);
  }

  /**
   * 불꽃 객체를 생성합니다.
   * @returns {Phaser.GameObjects.Rectangle} 불꽃 객체
   * @private
   */
  createFlame() {
    const flame = this.add.rectangle(
      (Math.random() - 0.5) * 200,
      (Math.random() - 0.5) * 100 + 50,
      4,
      8,
      COOKING_UI_CONSTANTS.COLORS.FLAME
    );
    flame.setRotation((Math.random() * Math.PI) / 4);
    return flame;
  }

  /**
   * 불꽃 애니메이션을 실행합니다.
   * @param {Phaser.GameObjects.Rectangle} flame - 불꽃 객체
   * @private
   */
  animateFlame(flame: Phaser.GameObjects.Rectangle) {
    this.tweens.add({
      targets: flame,
      y: flame.y - 20,
      alpha: 0,
      duration: 800 + Math.random() * 400,
      ease: "Power2",
      repeat: 2,
    });
  }

  /**
   * 조리 완료 처리를 합니다.
   * @param {Phaser.GameObjects.Text} cookingText - 조리 중 텍스트
   * @private
   */
  finishCooking(cookingText: any) {
    try {
      this.cleanupCookingUI(cookingText);
      this.enableCookButton();

      const result = this.gameLogic?.submitPlate(this.palate);

      if (result?.success) {
        this.handleCookingSuccess(result);
      } else {
        this.handleCookingFailure(result);
      }
    } catch (error) {
      console.error("조리 완료 처리 중 오류:", error);
    }
  }

  /**
   * 조리 UI를 정리합니다.
   * @param {Phaser.GameObjects.Text} cookingText - 조리 중 텍스트
   * @private
   */
  cleanupCookingUI(cookingText: any) {
    cookingText.destroy();
  }

  /**
   * 조리 버튼을 활성화합니다.
   * @private
   */
  enableCookButton() {
    this.cookButton?.setInteractive();
    this.cookButton?.setAlpha(1);
  }

  /**
   * 조리 성공을 처리합니다.
   * @param {Object} result - 조리 결과
   * @private
   */
  handleCookingSuccess(result: any) {
    // 이벤트를 통해 RoguelikeScene에서 인벤토리 추가 처리
    this.events.emit("dishCreated", {
      type: "cooked_food",
      name: result.dishName,
      symbol: "🍽️",
      color: 0xf59e0b,
      description: `맛있는 요리! 배고픔 +${Math.max(
        1,
        Math.floor(result.score / 10)
      )}, HP +${Math.max(1, Math.floor(result.score / 15))}`,
      hunger: [
        Math.max(1, Math.floor(result.score / 10)),
        Math.max(1, Math.floor(result.score / 10)),
      ],
      hp: [
        Math.max(1, Math.floor(result.score / 15)),
        Math.max(1, Math.floor(result.score / 15)),
      ],
      value: Math.max(1, Math.floor(result.score / 5)),
      isSpecial: this.gameLogic?.getCurrentRecipe() !== null,
      recipe: this.gameLogic?.getCurrentRecipe(),
      score: result.score,
    });
    this.showResult(result.score, result.dishName);
  }

  /**
   * 조리 실패를 처리합니다.
   * @param {Object} result - 조리 결과
   * @private
   */
  handleCookingFailure(result: any) {
    this.addMessage(result.message);
  }

  // ===========================================
  // 결과 표시
  // ===========================================
  /**
   * 조리 결과를 표시합니다.
   * @param {number} score - 점수
   * @param {string} dishName - 요리 이름
   * @private
   */
  showResult(score: any, dishName: any) {
    this.createResultBackground();
    this.createResultImage();
    this.createResultTexts(score, dishName);
    this.createResultButtons();
    this.createConfetti();
  }

  /**
   * 결과 배경을 생성합니다.
   * @private
   */
  createResultBackground() {
    const resultBg = this.add.rectangle(
      0,
      0,
      600,
      400,
      COOKING_UI_CONSTANTS.COLORS.RESULT_BACKGROUND
    );
    resultBg.setStrokeStyle(2, 0x4ade80, 0.35);
    this.popupContainer?.add(resultBg);
  }

  /**
   * 결과 이미지를 생성합니다.
   * @private
   */
  createResultImage() {
    const recipe = this.gameLogic?.getCurrentRecipe();
    if (recipe) {
      const completeDishImage = this.add
        .image(0, -80, recipe.id)
        .setDisplaySize(100, 100)
        .setOrigin(0.5);
      this.popupContainer?.add(completeDishImage);
    }
  }

  /**
   * 결과 텍스트들을 생성합니다.
   * @param {number} score - 점수
   * @param {string} dishName - 요리 이름
   * @private
   */
  createResultTexts(score: number, dishName: string) {
    this.createResultTitle(dishName);
    this.createResultScore(score);
    this.createInventoryMessage();
  }

  /**
   * 결과 제목을 생성합니다.
   * @param {string} dishName - 요리 이름
   * @private
   */
  createResultTitle(dishName: string) {
    const resultTitle = this.add
      .text(0, -20, `${dishName} 완성! ✨`, {
        fontSize: "20px",
        color: "#4ade80",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer?.add(resultTitle);
  }

  /**
   * 결과 점수를 생성합니다.
   * @param {number} score - 점수
   * @private
   */
  createResultScore(score: number) {
    const resultMsg = this.add
      .text(0, 10, `점수: ${score}점`, {
        fontSize: COOKING_UI_CONSTANTS.FONTS.LARGE,
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer?.add(resultMsg);
  }

  /**
   * 인벤토리 메시지를 생성합니다.
   * @private
   */
  createInventoryMessage() {
    const inventoryMsg = this.add
      .text(0, 30, "요리가 인벤토리에 추가되었습니다! 🎒", {
        fontSize: COOKING_UI_CONSTANTS.FONTS.MEDIUM,
        color: "#4ade80",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer?.add(inventoryMsg);
  }

  /**
   * 결과 버튼들을 생성합니다.
   * @private
   */
  createResultButtons() {
    this.createRetryButton();
    this.createCloseResultButton();
  }

  /**
   * 다시 도전 버튼을 생성합니다.
   * @private
   */
  createRetryButton() {
    const { RETRY_WIDTH, RETRY_HEIGHT } = COOKING_UI_CONSTANTS.BUTTONS;

    const retryButton = this.add.rectangle(
      -50,
      50,
      RETRY_WIDTH,
      RETRY_HEIGHT,
      COOKING_UI_CONSTANTS.COLORS.RETRY_BUTTON
    );
    retryButton.setInteractive();
    retryButton.on("pointerdown", () => this.restartGame());
    retryButton.on("pointerover", () =>
      retryButton.setFillStyle(COOKING_UI_CONSTANTS.COLORS.RETRY_HOVER)
    );
    retryButton.on("pointerout", () =>
      retryButton.setFillStyle(COOKING_UI_CONSTANTS.COLORS.RETRY_BUTTON)
    );
    this.popupContainer?.add(retryButton);

    const retryText = this.add
      .text(-50, 50, "다시 도전", {
        fontSize: COOKING_UI_CONSTANTS.FONTS.SMALL,
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer?.add(retryText);
  }

  /**
   * 닫기 버튼을 생성합니다.
   * @private
   */
  createCloseResultButton() {
    const { CLOSE_WIDTH, CLOSE_HEIGHT } = COOKING_UI_CONSTANTS.BUTTONS;

    const closeResultButton = this.add.rectangle(
      50,
      50,
      CLOSE_WIDTH,
      CLOSE_HEIGHT,
      COOKING_UI_CONSTANTS.COLORS.CLOSE_BUTTON
    );
    closeResultButton.setInteractive();
    closeResultButton.on("pointerdown", () => this.closePopup());
    closeResultButton.on("pointerover", () =>
      closeResultButton.setFillStyle(COOKING_UI_CONSTANTS.COLORS.CLOSE_HOVER)
    );
    closeResultButton.on("pointerout", () =>
      closeResultButton.setFillStyle(COOKING_UI_CONSTANTS.COLORS.CLOSE_BUTTON)
    );
    this.popupContainer?.add(closeResultButton);

    const closeText = this.add
      .text(50, 50, "닫기", {
        fontSize: COOKING_UI_CONSTANTS.FONTS.SMALL,
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer?.add(closeText);
  }

  /**
   * 축하 효과를 생성합니다.
   * @private
   */
  createConfetti() {
    const { CONFETTI_COUNT } = COOKING_UI_CONSTANTS.ANIMATION;

    for (let i = 0; i < CONFETTI_COUNT; i++) {
      this.createConfettiPiece();
    }
  }

  /**
   * 개별 축하 효과를 생성합니다.
   * @private
   */
  createConfettiPiece() {
    const confetti = this.add.rectangle(
      (Math.random() - 0.5) * 200,
      -100 + Math.random() * 50,
      6,
      10,
      COOKING_UI_CONSTANTS.COLORS.CONFETTI
    );
    confetti.setRotation((Math.random() * Math.PI) / 4);
    this.popupContainer?.add(confetti);

    this.animateConfetti(confetti);
  }

  /**
   * 축하 효과 애니메이션을 실행합니다.
   * @param {Phaser.GameObjects.Rectangle} confetti - 축하 효과 객체
   * @private
   */
  animateConfetti(confetti: Phaser.GameObjects.Rectangle) {
    this.tweens.add({
      targets: confetti,
      y: 200,
      x: confetti.x + (Math.random() - 0.5) * 200,
      rotation: confetti.rotation + Math.PI * 2,
      alpha: 0,
      duration: 1500 + Math.random() * 500,
      ease: "Power2",
    });
  }

  // ===========================================
  // 게임 관리
  // ===========================================
  /**
   * 게임을 재시작합니다.
   * @private
   */
  restartGame() {
    try {
      this.gameLogic?.resetGame();
      this.initializeGameState();
      this.scene.restart();
    } catch (error) {
      console.error("게임 재시작 중 오류:", error);
    }
  }

  /**
   * 팝업을 닫습니다.
   * @private
   */
  closePopup() {
    console.log("closePopup() 메서드 호출됨");
    console.log("팝업 닫기 시작");
    try {
      // RoguelikeScene에 요리 완료 이벤트 전달 (선택사항)
      console.log("popupClosed 이벤트 발생");
      this.events.emit("popupClosed");

      // CookingScene 종료
      console.log("CookingScene 종료 중");
      this.scene.stop();

      console.log("팝업 닫기 완료");
    } catch (error) {
      console.error("팝업 닫기 중 오류:", error);
    }
  }

  /**
   * 메시지를 추가합니다.
   * @param {string} text - 메시지 텍스트
   * @private
   */
  addMessage(text: string) {
    console.log(text);
  }

  // ===========================================
  // 인벤토리 연동 (이벤트 기반으로 처리)
  // ===========================================

  /**
   * 메시지 표시를 업데이트합니다.
   * @private
   */
  updateMessageDisplay() {
    // 메시지 표시 로직 (필요시 구현)
  }

  /**
   * 요리 완료를 처리합니다.
   * @param {Object} data - 요리 완료 데이터
   * @private
   */
  handleCookingEnd(data: any) {
    // 요리 완료 처리 로직 (필요시 구현)
  }

  /**
   * 게임 루프를 업데이트합니다.
   * @private
   */
  update() {
    // 게임 루프 로직
  }
}
