import { INGREDIENTS, PALATES, RECIPES } from "../data/GameData.js";
import { UI_CONFIG } from "../data/Config.js";
import { CookingGameLogic } from "../logic/CookingGameLogic.js";

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

export default class CookingScene extends Phaser.Scene {
  constructor() {
    super({ key: "CookingScene" });

    // 초기화
    this.gameLogic = null;
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
   * 게임 로직을 초기화합니다.
   * @private
   */
  initializeGameLogic() {
    this.gameLogic = new CookingGameLogic();
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
    const { width, height } = this.scale;

    this.createOverlay(width, height);
    this.createPopupContainer(width, height);
    this.createPopupBackground();
    this.createCloseButton();
    this.createPopupUI();
    this.startGame();
  }

  /**
   * 팝업 오버레이를 생성합니다.
   * @param {number} width - 화면 너비
   * @param {number} height - 화면 높이
   * @private
   */
  createOverlay(width, height) {
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
  createPopupContainer(width, height) {
    this.popupContainer = this.add.container(width / 2, height / 2);
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
    this.popupContainer.add(this.popupBg);
  }

  /**
   * 닫기 버튼을 생성합니다.
   * @private
   */
  createCloseButton() {
    this.closeButton = this.add.rectangle(
      350,
      -280,
      COOKING_UI_CONSTANTS.BUTTONS.CLOSE_SIZE,
      COOKING_UI_CONSTANTS.BUTTONS.CLOSE_SIZE,
      COOKING_UI_CONSTANTS.COLORS.CLOSE_BUTTON
    );
    this.closeButton.setInteractive();
    this.closeButton.on("pointerdown", () => this.closePopup());
    this.closeButton.on("pointerover", () =>
      this.closeButton.setFillStyle(COOKING_UI_CONSTANTS.COLORS.CLOSE_HOVER)
    );
    this.closeButton.on("pointerout", () =>
      this.closeButton.setFillStyle(COOKING_UI_CONSTANTS.COLORS.CLOSE_BUTTON)
    );
    this.popupContainer.add(this.closeButton);

    const closeXText = this.add
      .text(350, -280, "×", {
        fontSize: "20px",
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer.add(closeXText);
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
    this.popupContainer.add(titleText);
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
    this.popupContainer.add(this.pickCountText);
  }

  /**
   * 재료 그리드를 생성합니다.
   * @private
   */
  createIngredientGrid() {
    this.ingredientButtons = [];

    this.pantryState.forEach((ingredient, index) => {
      const position = this.calculateIngredientPosition(index);
      const buttonData = this.createIngredientButton(ingredient, position);

      this.ingredientButtons.push(buttonData);
      this.popupContainer.add([
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
  calculateIngredientPosition(index) {
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
  createIngredientButton(ingredient, position) {
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
  createIngredientCard(ingredient, position, width, height) {
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
  createIngredientIcon(ingredient, position) {
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
  createIngredientName(ingredient, position) {
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
  createIngredientStock(ingredient, position, width, height) {
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
  setupIngredientCardEvents(card, ingredient) {
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
    this.popupContainer.add(this.plateArea);
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
    this.popupContainer.add(plateTitle);
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
    const { COOK_WIDTH, COOK_HEIGHT } = COOKING_UI_CONSTANTS.BUTTONS;

    this.cookButton = this.add.rectangle(
      0,
      150,
      COOK_WIDTH,
      COOK_HEIGHT,
      COOKING_UI_CONSTANTS.COLORS.COOK_BUTTON
    );
    this.cookButton.setInteractive();
    this.cookButton.on("pointerdown", () => this.cookDish());
    this.cookButton.on("pointerover", () =>
      this.cookButton.setFillStyle(COOKING_UI_CONSTANTS.COLORS.COOK_HOVER)
    );
    this.cookButton.on("pointerout", () =>
      this.cookButton.setFillStyle(COOKING_UI_CONSTANTS.COLORS.COOK_BUTTON)
    );
    this.popupContainer.add(this.cookButton);

    const cookText = this.add
      .text(0, 150, "조리하기", {
        fontSize: COOKING_UI_CONSTANTS.FONTS.LARGE,
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer.add(cookText);
  }

  // ===========================================
  // 게임 로직
  // ===========================================
  /**
   * 게임을 시작합니다.
   * @private
   */
  startGame() {
    this.gameLogic.startGame();
  }

  /**
   * 재료를 선택합니다.
   * @param {string} ingredientId - 재료 ID
   * @private
   */
  pickIngredient(ingredientId) {
    try {
      const gameState = this.gameLogic.getGameState();
      if (gameState.gameEnded) return;

      const ingredient = this.pantryState.find(
        (ing) => ing.id === ingredientId
      );
      if (!ingredient || ingredient.stock <= 0) return;

      // 재고 감소
      ingredient.stock--;

      // 게임 로직에 재료 추가
      if (this.gameLogic.addIngredient(ingredient)) {
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
      const gameState = this.gameLogic.getGameState();
      const currentPlate = this.gameLogic.getCurrentPlate();

      this.updateIngredientGrid();
      this.updatePlate();
      this.updatePickCount(currentPlate);
    } catch (error) {
      console.error("UI 업데이트 중 오류:", error);
    }
  }

  /**
   * 재료 그리드를 업데이트합니다.
   * @private
   */
  updateIngredientGrid() {
    this.ingredientButtons.forEach((button) => {
      const ingredient = this.pantryState.find(
        (ing) => ing.id === button.ingredient.id
      );
      button.stock.setText(`${ingredient.stock}`);

      if (ingredient.stock <= 0) {
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
  updatePickCount(currentPlate) {
    this.pickCountText.setText(`선택: ${currentPlate.length}/3`);
  }

  /**
   * 접시를 업데이트합니다.
   * @private
   */
  updatePlate() {
    this.clearPlateItems();

    const currentPlate = this.gameLogic.getCurrentPlate();
    const recipe = this.gameLogic.getCurrentRecipe();

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
  showCompleteDish(recipe) {
    const completeDish = this.add
      .image(0, 50, recipe.id)
      .setDisplaySize(120, 120)
      .setOrigin(0.5);

    this.plateItems.push(completeDish);
    this.popupContainer.add(completeDish);
  }

  /**
   * 개별 재료들을 표시합니다.
   * @param {Array} currentPlate - 현재 접시의 재료들
   * @private
   */
  showIndividualIngredients(currentPlate) {
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
  createPlateIngredient(ingredient, position) {
    const imageKey = this.getIngredientImageKey(ingredient.id);
    const { ITEM_SIZE } = COOKING_UI_CONSTANTS.PLATE;

    const item = this.add
      .image(position.x, position.y, imageKey)
      .setDisplaySize(ITEM_SIZE, ITEM_SIZE)
      .setOrigin(0.5);

    this.plateItems.push(item);
    this.popupContainer.add(item);
  }

  /**
   * 재료 ID에 따른 이미지 키 반환
   * @param {string} ingredientId - 재료 ID
   * @returns {string} 이미지 키
   */
  getIngredientImageKey(ingredientId) {
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
    try {
      const gameState = this.gameLogic.getGameState();
      if (gameState.gameEnded) return;

      if (this.gameLogic.getCurrentPlate().length === 0) {
        this.addMessage("재료를 선택해주세요!");
        return;
      }

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
    this.cookButton.disableInteractive();
    this.cookButton.setAlpha(0.5);
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
    this.popupContainer.add(cookingText);
    return cookingText;
  }

  /**
   * 조리 완료를 스케줄링합니다.
   * @param {Phaser.GameObjects.Text} cookingText - 조리 중 텍스트
   * @private
   */
  scheduleCookingCompletion(cookingText) {
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
    this.popupContainer.add(flame);
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
  animateFlame(flame) {
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
  finishCooking(cookingText) {
    try {
      this.cleanupCookingUI(cookingText);
      this.enableCookButton();

      const result = this.gameLogic.submitPlate(this.palate);
      if (result.success) {
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
  cleanupCookingUI(cookingText) {
    cookingText.destroy();
  }

  /**
   * 조리 버튼을 활성화합니다.
   * @private
   */
  enableCookButton() {
    this.cookButton.setInteractive();
    this.cookButton.setAlpha(1);
  }

  /**
   * 조리 성공을 처리합니다.
   * @param {Object} result - 조리 결과
   * @private
   */
  handleCookingSuccess(result) {
    this.addDishToRoguelikeInventory(
      result.dishName,
      result.score,
      this.gameLogic.getCurrentRecipe()
    );
    this.showResult(result.score, result.dishName);
  }

  /**
   * 조리 실패를 처리합니다.
   * @param {Object} result - 조리 결과
   * @private
   */
  handleCookingFailure(result) {
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
  showResult(score, dishName) {
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
    this.popupContainer.add(resultBg);
  }

  /**
   * 결과 이미지를 생성합니다.
   * @private
   */
  createResultImage() {
    const recipe = this.gameLogic.getCurrentRecipe();
    if (recipe) {
      const completeDishImage = this.add
        .image(0, -80, recipe.id)
        .setDisplaySize(100, 100)
        .setOrigin(0.5);
      this.popupContainer.add(completeDishImage);
    }
  }

  /**
   * 결과 텍스트들을 생성합니다.
   * @param {number} score - 점수
   * @param {string} dishName - 요리 이름
   * @private
   */
  createResultTexts(score, dishName) {
    this.createResultTitle(dishName);
    this.createResultScore(score);
    this.createInventoryMessage();
  }

  /**
   * 결과 제목을 생성합니다.
   * @param {string} dishName - 요리 이름
   * @private
   */
  createResultTitle(dishName) {
    const resultTitle = this.add
      .text(0, -20, `${dishName} 완성! ✨`, {
        fontSize: "20px",
        color: "#4ade80",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer.add(resultTitle);
  }

  /**
   * 결과 점수를 생성합니다.
   * @param {number} score - 점수
   * @private
   */
  createResultScore(score) {
    const resultMsg = this.add
      .text(0, 10, `점수: ${score}점`, {
        fontSize: COOKING_UI_CONSTANTS.FONTS.LARGE,
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer.add(resultMsg);
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
    this.popupContainer.add(inventoryMsg);
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
    this.popupContainer.add(retryButton);

    const retryText = this.add
      .text(-50, 50, "다시 도전", {
        fontSize: COOKING_UI_CONSTANTS.FONTS.SMALL,
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer.add(retryText);
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
    this.popupContainer.add(closeResultButton);

    const closeText = this.add
      .text(50, 50, "닫기", {
        fontSize: COOKING_UI_CONSTANTS.FONTS.SMALL,
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer.add(closeText);
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
    this.popupContainer.add(confetti);

    this.animateConfetti(confetti);
  }

  /**
   * 축하 효과 애니메이션을 실행합니다.
   * @param {Phaser.GameObjects.Rectangle} confetti - 축하 효과 객체
   * @private
   */
  animateConfetti(confetti) {
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
      this.gameLogic.resetGame();
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
    try {
      this.events.emit("popupClosed");
      this.scene.stop();
    } catch (error) {
      console.error("팝업 닫기 중 오류:", error);
    }
  }

  /**
   * 메시지를 추가합니다.
   * @param {string} text - 메시지 텍스트
   * @private
   */
  addMessage(text) {
    console.log(text);
  }

  // ===========================================
  // 인벤토리 연동
  // ===========================================
  /**
   * 요리를 로그라이크 인벤토리에 추가합니다.
   * @param {string} dishName - 요리 이름
   * @param {number} score - 요리 점수
   * @param {Object|null} recipe - 레시피 정보
   * @private
   */
  addDishToRoguelikeInventory(dishName, score, recipe) {
    try {
      const dishItem = this.createDishItem(dishName, score, recipe);
      this.events.emit("dishCreated", dishItem);
      console.log(`요리 "${dishName}"이 로그라이크 인벤토리에 추가되었습니다.`);
    } catch (error) {
      console.error("인벤토리 추가 중 오류:", error);
    }
  }

  /**
   * 요리 아이템 데이터를 생성합니다.
   * @param {string} dishName - 요리 이름
   * @param {number} score - 요리 점수
   * @param {Object|null} recipe - 레시피 정보
   * @returns {Object} 로그라이크 아이템 형태의 요리 데이터
   * @private
   */
  createDishItem(dishName, score, recipe) {
    const effects = this.calculateDishEffects(score);

    return {
      type: "cooked_food",
      name: dishName,
      symbol: "🍽️",
      color: 0xf59e0b,
      description: `맛있는 요리! 배고픔 +${effects.hungerRestore}, HP +${effects.hpRestore}`,
      hunger: [effects.hungerRestore, effects.hungerRestore],
      hp: [effects.hpRestore, effects.hpRestore],
      value: Math.max(1, Math.floor(score / 5)),
      isSpecial: recipe !== null,
      recipe: recipe,
      score: score,
    };
  }

  /**
   * 요리 효과를 계산합니다.
   * @param {number} score - 요리 점수
   * @returns {Object} 효과 정보
   * @private
   */
  calculateDishEffects(score) {
    return {
      hungerRestore: Math.max(20, Math.min(80, score * 2)),
      hpRestore: Math.max(5, Math.min(25, Math.floor(score / 2))),
    };
  }

  /**
   * 게임 루프를 업데이트합니다.
   * @private
   */
  update() {
    // 게임 루프 로직
  }
}
