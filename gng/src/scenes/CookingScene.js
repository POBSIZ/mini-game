import { INGREDIENTS, PALATES, RECIPES } from "../data/GameData.js";
import { CookingGameLogic } from "../logic/CookingGameLogic.js";

export default class CookingScene extends Phaser.Scene {
  constructor() {
    super({ key: "CookingScene" });
  }

  preload() {
    // 기본 재료 이미지 로드
    this.load.image("glow-mushroom", "assets/glow-mushroom.png");
    this.load.image("rock-pepper", "assets/rock-black-pepper.png");
    this.load.image("rabbit-meat", "assets/rabbit-meat.png");

    // 레시피 이미지들 로드
    RECIPES.forEach((recipe) => {
      this.load.image(recipe.id, `assets/${recipe.image}`);
    });

    // 게임 로직 인스턴스 생성
    this.gameLogic = new CookingGameLogic();

    // 팝업 게임 상태 초기화
    this.pantryState = JSON.parse(JSON.stringify(INGREDIENTS));
    this.palate = PALATES[Math.floor(Math.random() * PALATES.length)];
  }

  create() {
    const { width, height } = this.scale;

    // 팝업 배경 (어두운 오버레이)
    this.overlay = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.7
    );

    // 팝업 컨테이너
    this.popupContainer = this.add.container(width / 2, height / 2);

    // 팝업 배경
    this.popupBg = this.add.rectangle(0, 0, 800, 600, 0x0f1020);
    this.popupBg.setStrokeStyle(2, 0x8ef6ff, 0.3);
    this.popupContainer.add(this.popupBg);

    // 닫기 버튼
    this.closeButton = this.add.rectangle(350, -280, 30, 30, 0xf87171);
    this.closeButton.setInteractive();
    this.closeButton.on("pointerdown", () => this.closePopup());
    this.closeButton.on("pointerover", () =>
      this.closeButton.setFillStyle(0xff5252)
    );
    this.closeButton.on("pointerout", () =>
      this.closeButton.setFillStyle(0xf87171)
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

    // UI 생성
    this.createPopupUI();

    // 게임 시작
    this.startGame();
  }

  createPopupUI() {
    // 타이틀 (간소화)
    const titleText = this.add
      .text(0, -250, "간단한 요리 게임", {
        fontSize: "24px",
        color: "#8ef6ff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer.add(titleText);

    // 선택된 재료 수
    this.pickCountText = this.add
      .text(0, -200, `선택: 0/3`, {
        fontSize: "16px",
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer.add(this.pickCountText);

    // 재료 그리드 생성
    this.createIngredientGrid();

    // 접시 영역 생성
    this.createPlateArea();

    // 버튼들 생성
    this.createButtons();
  }

  createIngredientGrid() {
    const startX = -100;
    const startY = -100;
    const itemWidth = 80;
    const itemHeight = 80;
    const spacing = 20;

    this.ingredientButtons = [];

    this.pantryState.forEach((ingredient, index) => {
      const x = startX + index * (itemWidth + spacing);
      const y = startY;

      // 재료 카드 배경
      const card = this.add.rectangle(x, y, itemWidth, itemHeight, 0x202552);
      card.setStrokeStyle(2, 0xffffff, 0.3);
      card.setInteractive();

      // 재료 아이콘 (이미지 사용)
      const imageKey = this.getIngredientImageKey(ingredient.id);

      const icon = this.add
        .image(x, y - 10, imageKey)
        .setDisplaySize(60, 60)
        .setOrigin(0.5);

      // 재료 이름
      const name = this.add
        .text(x, y + 15, ingredient.name, {
          fontSize: "12px",
          color: "#ffffff",
          fontFamily: "Arial",
        })
        .setOrigin(0.5);

      // 재고 표시
      const stock = this.add
        .text(
          x + itemWidth / 2 - 5,
          y + itemHeight / 2 - 5,
          `${ingredient.stock}`,
          {
            fontSize: "10px",
            color: "#9aa3dd",
            fontFamily: "Arial",
          }
        )
        .setOrigin(1, 1);

      // 클릭 이벤트
      card.on("pointerdown", () => this.pickIngredient(ingredient.id));
      card.on("pointerover", () => card.setFillStyle(0x2a2f55));
      card.on("pointerout", () => card.setFillStyle(0x202552));

      this.ingredientButtons.push({
        card,
        icon,
        name,
        stock,
        ingredient,
      });

      this.popupContainer.add([card, icon, name, stock]);
    });
  }

  createPlateArea() {
    // 접시 영역 배경
    this.plateArea = this.add.rectangle(0, 50, 400, 80, 0x1b1f46);
    this.plateArea.setStrokeStyle(2, 0xffffff, 0.3);
    this.popupContainer.add(this.plateArea);

    // 접시 제목
    const plateTitle = this.add
      .text(0, 10, "당신의 접시", {
        fontSize: "16px",
        color: "#ffd166",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer.add(plateTitle);

    // 접시에 담긴 재료들
    this.plateItems = [];
  }

  createButtons() {
    // 조리하기 버튼
    this.cookButton = this.add.rectangle(0, 150, 100, 40, 0x2f9dfd);
    this.cookButton.setInteractive();
    this.cookButton.on("pointerdown", () => this.cookDish());
    this.cookButton.on("pointerover", () =>
      this.cookButton.setFillStyle(0x1e90ff)
    );
    this.cookButton.on("pointerout", () =>
      this.cookButton.setFillStyle(0x2f9dfd)
    );
    this.popupContainer.add(this.cookButton);

    const cookText = this.add
      .text(0, 150, "조리하기", {
        fontSize: "16px",
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer.add(cookText);
  }

  startGame() {
    this.gameLogic.startGame();
  }

  pickIngredient(ingredientId) {
    const gameState = this.gameLogic.getGameState();
    if (gameState.gameEnded) return;

    const ingredient = this.pantryState.find((ing) => ing.id === ingredientId);
    if (!ingredient || ingredient.stock <= 0) return;

    // 재고 감소
    ingredient.stock--;

    // 게임 로직에 재료 추가
    if (this.gameLogic.addIngredient(ingredient)) {
      // UI 업데이트
      this.updateUI();
    }
  }

  updateUI() {
    const gameState = this.gameLogic.getGameState();
    const currentPlate = this.gameLogic.getCurrentPlate();

    // 재료 그리드 업데이트
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

    // 접시 업데이트
    this.updatePlate();

    // 선택 수 업데이트
    this.pickCountText.setText(`선택: ${currentPlate.length}/3`);
  }

  updatePlate() {
    // 기존 접시 아이템들 제거
    this.plateItems.forEach((item) => item.destroy());
    this.plateItems = [];

    const currentPlate = this.gameLogic.getCurrentPlate();
    const plateY = 50;

    // 완성된 레시피가 있는지 확인
    const recipe = this.gameLogic.getCurrentRecipe();
    if (recipe) {
      // 완성된 요리 이미지 표시
      const completeDish = this.add
        .image(0, plateY, recipe.id)
        .setDisplaySize(120, 120)
        .setOrigin(0.5);

      this.plateItems.push(completeDish);
      this.popupContainer.add(completeDish);
      return;
    }

    // 개별 재료들 표시 (완성된 레시피가 없을 때)
    const itemSpacing = 50;
    const startX = (-(currentPlate.length - 1) * itemSpacing) / 2;

    currentPlate.forEach((ingredient, index) => {
      const x = startX + index * itemSpacing;
      const y = plateY;

      // 재료별 이미지 선택
      const imageKey = this.getIngredientImageKey(ingredient.id);

      const item = this.add
        .image(x, y, imageKey)
        .setDisplaySize(70, 70)
        .setOrigin(0.5);

      this.plateItems.push(item);
      this.popupContainer.add(item);
    });
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

  cookDish() {
    const gameState = this.gameLogic.getGameState();
    if (gameState.gameEnded) return;

    // 접시가 비어있으면 조리할 수 없음
    if (this.gameLogic.getCurrentPlate().length === 0) {
      this.addMessage("재료를 선택해주세요!");
      return;
    }

    // 조리 과정 시뮬레이션 (간단한 딜레이)
    this.showCookingProcess();
  }

  /**
   * 조리 과정 표시
   */
  showCookingProcess() {
    // 조리하기 버튼 비활성화
    this.cookButton.disableInteractive();
    this.cookButton.setAlpha(0.5);

    // 조리 중 메시지 표시
    const cookingText = this.add
      .text(0, 200, "조리 중... 🔥", {
        fontSize: "18px",
        color: "#ffd166",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer.add(cookingText);

    // 조리 애니메이션 효과
    this.createCookingAnimation();

    // 2초 후 조리 완료
    this.time.delayedCall(2000, () => {
      this.finishCooking(cookingText);
    });
  }

  /**
   * 조리 애니메이션 생성
   */
  createCookingAnimation() {
    // 불꽃 효과
    for (let i = 0; i < 8; i++) {
      const flame = this.add.rectangle(
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 100 + 50,
        4,
        8,
        0xff6b35
      );
      flame.setRotation((Math.random() * Math.PI) / 4);
      this.popupContainer.add(flame);

      this.tweens.add({
        targets: flame,
        y: flame.y - 20,
        alpha: 0,
        duration: 800 + Math.random() * 400,
        ease: "Power2",
        repeat: 2,
      });
    }
  }

  /**
   * 조리 완료 처리
   * @param {Phaser.GameObjects.Text} cookingText - 조리 중 텍스트
   */
  finishCooking(cookingText) {
    // 조리 중 텍스트 제거
    cookingText.destroy();

    // 조리하기 버튼 다시 활성화
    this.cookButton.setInteractive();
    this.cookButton.setAlpha(1);

    // 요리 완성 처리
    const result = this.gameLogic.submitPlate(this.palate);
    if (result.success) {
      // 요리를 로그라이크 인벤토리에 추가
      this.addDishToRoguelikeInventory(result.dishName, result.score, this.gameLogic.getCurrentRecipe());
      
      // 결과 화면 표시
      this.showResult(result.score, result.dishName);
    } else {
      this.addMessage(result.message);
    }
  }

  showResult(score, dishName) {
    // 결과 배경
    const resultBg = this.add.rectangle(0, 0, 600, 400, 0x141632);
    resultBg.setStrokeStyle(2, 0x4ade80, 0.35);
    this.popupContainer.add(resultBg);

    // 완성된 레시피가 있으면 해당 이미지 표시
    const recipe = this.gameLogic.getCurrentRecipe();
    if (recipe) {
      const completeDishImage = this.add
        .image(0, -80, recipe.id)
        .setDisplaySize(100, 100)
        .setOrigin(0.5);
      this.popupContainer.add(completeDishImage);
    }

    // 결과 텍스트
    const resultTitle = this.add
      .text(0, -20, `${dishName} 완성! ✨`, {
        fontSize: "20px",
        color: "#4ade80",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer.add(resultTitle);

    const resultMsg = this.add
      .text(0, 10, `점수: ${score}점`, {
        fontSize: "16px",
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer.add(resultMsg);

    // 인벤토리 추가 메시지
    const inventoryMsg = this.add
      .text(0, 30, "요리가 인벤토리에 추가되었습니다! 🎒", {
        fontSize: "14px",
        color: "#4ade80",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer.add(inventoryMsg);

    // 다시 도전 버튼
    const retryButton = this.add.rectangle(-50, 50, 100, 30, 0x2a2f55);
    retryButton.setInteractive();
    retryButton.on("pointerdown", () => this.restartGame());
    retryButton.on("pointerover", () => retryButton.setFillStyle(0x3a3f65));
    retryButton.on("pointerout", () => retryButton.setFillStyle(0x2a2f55));
    this.popupContainer.add(retryButton);

    const retryText = this.add
      .text(-50, 50, "다시 도전", {
        fontSize: "12px",
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer.add(retryText);

    // 닫기 버튼
    const closeResultButton = this.add.rectangle(50, 50, 100, 30, 0xf87171);
    closeResultButton.setInteractive();
    closeResultButton.on("pointerdown", () => this.closePopup());
    closeResultButton.on("pointerover", () =>
      closeResultButton.setFillStyle(0xff5252)
    );
    closeResultButton.on("pointerout", () =>
      closeResultButton.setFillStyle(0xf87171)
    );
    this.popupContainer.add(closeResultButton);

    const closeText = this.add
      .text(50, 50, "닫기", {
        fontSize: "12px",
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.popupContainer.add(closeText);

    // 애니메이션 효과
    this.createConfetti();
  }

  createConfetti() {
    for (let i = 0; i < 15; i++) {
      const confetti = this.add.rectangle(
        (Math.random() - 0.5) * 200,
        -100 + Math.random() * 50,
        6,
        10,
        0xffd166
      );
      confetti.setRotation((Math.random() * Math.PI) / 4);
      this.popupContainer.add(confetti);

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
  }

  restartGame() {
    // 게임 로직 초기화
    this.gameLogic.resetGame();

    // 팝업 게임 상태 초기화
    this.pantryState = JSON.parse(JSON.stringify(INGREDIENTS));
    this.palate = PALATES[Math.floor(Math.random() * PALATES.length)];

    // 씬 재시작
    this.scene.restart();
  }

  closePopup() {
    // 팝업 닫기 이벤트 발생
    this.events.emit("popupClosed");

    // 씬 종료
    this.scene.stop();
  }

  addMessage(text) {
    console.log(text); // 간단한 메시지 출력
  }

  /**
   * 요리를 로그라이크 인벤토리에 추가
   * @param {string} dishName - 요리 이름
   * @param {number} score - 요리 점수
   * @param {Object|null} recipe - 레시피 정보
   */
  addDishToRoguelikeInventory(dishName, score, recipe) {
    // 요리 아이템 데이터 생성
    const dishItem = this.createDishItem(dishName, score, recipe);

    // 로그라이크 씬에 요리 아이템 추가 이벤트 발생
    this.events.emit("dishCreated", dishItem);

    console.log(`요리 "${dishName}"이 로그라이크 인벤토리에 추가되었습니다.`);
  }

  /**
   * 요리 아이템 데이터 생성
   * @param {string} dishName - 요리 이름
   * @param {number} score - 요리 점수
   * @param {Object|null} recipe - 레시피 정보
   * @returns {Object} 로그라이크 아이템 형태의 요리 데이터
   */
  createDishItem(dishName, score, recipe) {
    // 점수에 따른 효과 계산
    const hungerRestore = Math.max(20, Math.min(80, score * 2)); // 20-80 범위
    const hpRestore = Math.max(5, Math.min(25, Math.floor(score / 2))); // 5-25 범위

    return {
      type: "cooked_food", // 새로운 아이템 타입
      name: dishName,
      symbol: "🍽️", // 요리 아이콘
      color: 0xf59e0b, // 음식 색상
      description: `맛있는 요리! 배고픔 +${hungerRestore}, HP +${hpRestore}`,
      hunger: [hungerRestore, hungerRestore], // 배고픔 회복량
      hp: [hpRestore, hpRestore], // HP 회복량
      value: Math.max(1, Math.floor(score / 5)), // 가치
      isSpecial: recipe !== null, // 특별한 레시피인지 여부
      recipe: recipe, // 원본 레시피 정보
      score: score, // 요리 점수
    };
  }

  update() {
    // 게임 루프 로직
  }
}
