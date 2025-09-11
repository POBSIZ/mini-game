/**
 * 요리 게임 로직 클래스
 * 요리 게임의 핵심 로직을 담당
 */
import { BaseGameLogic } from "./BaseGameLogic.js";
import { GAME_CONFIG, GAME_EVENTS } from "../data/Config.js";
import { SYNERGY, findRecipe } from "../data/CookingData.js";
import { isValidIngredient, isValidPalate } from "../data/Validation.js";

export class CookingGameLogic extends BaseGameLogic {
  constructor() {
    super();
    this.init();
  }

  /**
   * 게임 상태 초기화
   * @returns {Object} 초기 게임 상태
   */
  initializeGameState() {
    return {
      currentPlate: [],
      score: 0,
      timeLeft: GAME_CONFIG.TIME_LIMIT,
      gameStarted: false,
      gameEnded: false,
      messages: [],
    };
  }

  /**
   * 게임 상태 초기화 (재시작용)
   */
  resetGame() {
    this.reset();
  }

  /**
   * 게임 시작
   */
  startGame() {
    this.gameState.gameStarted = true;
    this.gameState.gameEnded = false;
    this.gameState.timeLeft = GAME_CONFIG.TIME_LIMIT;
    this.addMessage("요리 게임을 시작합니다!");
  }

  /**
   * 게임 종료
   */
  endGame() {
    this.gameState.gameEnded = true;
    this.gameState.gameStarted = false;
    this.addMessage(`게임 종료! 최종 점수: ${this.gameState.score}`);
  }

  /**
   * 재료 추가
   * @param {Object} ingredient - 추가할 재료
   * @returns {boolean} 추가 성공 여부
   */
  addIngredient(ingredient) {
    if (this.gameState.gameEnded || !this.gameState.gameStarted) {
      return false;
    }

    if (this.gameState.currentPlate.length >= GAME_CONFIG.MAX_PICK) {
      this.addMessage("더 이상 재료를 추가할 수 없습니다!");
      return false;
    }

    this.gameState.currentPlate.push(ingredient);
    this.addMessage(`${ingredient.name}을(를) 추가했습니다.`);
    return true;
  }

  /**
   * 재료 제거
   * @param {number} index - 제거할 재료의 인덱스
   * @returns {boolean} 제거 성공 여부
   */
  removeIngredient(index) {
    if (this.gameState.gameEnded || !this.gameState.gameStarted) {
      return false;
    }

    if (index < 0 || index >= this.gameState.currentPlate.length) {
      return false;
    }

    const removed = this.gameState.currentPlate.splice(index, 1)[0];
    this.addMessage(`${removed.name}을(를) 제거했습니다.`);
    return true;
  }

  /**
   * 접시 비우기
   * @returns {boolean} 비우기 성공 여부
   */
  clearPlate() {
    if (this.gameState.gameEnded || !this.gameState.gameStarted) {
      return false;
    }

    this.gameState.currentPlate = [];
    this.addMessage("접시를 비웠습니다.");
    return true;
  }

  /**
   * 점수 계산
   * @param {Object} palate - 미식가 취향
   * @returns {Object} 점수와 노트
   */
  calculateScore(palate) {
    const plate = this.gameState.currentPlate;
    const names = plate.map((p) => p.name);
    let score = plate.length * GAME_CONFIG.BASE_POINTS;
    let notes = [];

    // 태그 기반 가중치 (취향)
    plate.forEach((p) => {
      p.tags.forEach((t) => {
        if (palate.likes.includes(t)) score += 3;
        if (palate.hates.includes(t)) score -= 2;
      });
    });

    // 페어 시너지
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const pair1 = `${names[i]}+${names[j]}`;
        const pair2 = `${names[j]}+${names[i]}`;
        const val = SYNERGY.pairs[pair1] ?? SYNERGY.pairs[pair2];
        if (val) {
          score += val;
          if (val > 0) {
            notes.push(`페어 ${pair1.replace("+", " + ")} = +${val}`);
          } else {
            notes.push(
              `페어 (신선도 하락) ${pair1.replace("+", " + ")} = ${val}`
            );
          }
        }
      }
    }

    // 트리오 시너지
    if (names.length >= 3) {
      const combos = this.combosOf(names, 3);
      combos.forEach((c) => {
        const key = c.join("+");
        if (SYNERGY.trios[key]) {
          score += SYNERGY.trios[key];
          notes.push(`트리오 ${c.join(" + ")} = +${SYNERGY.trios[key]}`);
        }
      });
    }

    // 다양성 보너스
    const uniqueTags = new Set(plate.flatMap((p) => p.tags));
    score += Math.max(0, uniqueTags.size - 3);

    // 너무 무거운 맛 패널티
    const fat = plate.filter((p) => p.tags.includes("지방")).length;
    const prot = plate.filter(
      (p) => p.tags.includes("단백질") || p.tags.includes("식물성")
    ).length;
    if (fat >= 2 && prot >= 2) score -= 4;

    return { score, notes };
  }

  /**
   * 음식 이름 생성 (레시피 시스템 기반)
   * @param {Object} palate - 미식가 취향
   * @returns {string} 생성된 음식 이름
   */
  generateDishName(palate) {
    const plate = this.gameState.currentPlate;
    const ingredientIds = plate.map((ingredient) => ingredient.id);

    // 완성된 레시피가 있는지 확인
    const recipe = findRecipe(ingredientIds);
    if (recipe) {
      return recipe.name;
    }

    // 완성된 레시피가 없으면 기본 조합 이름 생성
    const has = (n) => plate.some((p) => p.name === n);

    if (has("토끼고기") && has("형광버섯")) {
      return "형광 토끼고기 버섯구이";
    }
    if (has("형광버섯") && has("돌 후추")) {
      return "형광버섯 후추볶음";
    }
    if (has("토끼고기") && has("돌 후추")) {
      return "후추 토끼고기";
    }
    if (has("토끼고기")) {
      return "토끼고기 요리";
    }
    if (has("형광버섯")) {
      return "형광버섯 요리";
    }
    if (has("돌 후추")) {
      return "후추 요리";
    }

    return "간단한 요리";
  }

  /**
   * 현재 접시의 레시피 정보 반환
   * @returns {Object|null} 레시피 정보 또는 null
   */
  getCurrentRecipe() {
    const plate = this.gameState.currentPlate;
    const ingredientIds = plate.map((ingredient) => ingredient.id);
    return findRecipe(ingredientIds);
  }

  /**
   * 접시 제출
   * @param {Object} palate - 미식가 취향
   * @returns {Object} 제출 결과
   */
  submitPlate(palate) {
    if (this.gameState.gameEnded || !this.gameState.gameStarted) {
      return { success: false, message: "게임이 진행 중이 아닙니다." };
    }

    if (this.gameState.currentPlate.length === 0) {
      return { success: false, message: "접시가 비어있습니다!" };
    }

    const result = this.calculateScore(palate);
    const dishName = this.generateDishName(palate);

    this.gameState.score += result.score;
    this.addMessage(`"${dishName}" 제출! +${result.score}점`);

    if (result.notes.length > 0) {
      result.notes.forEach((note) => this.addMessage(note));
    }

    // 접시 비우기
    this.gameState.currentPlate = [];

    return {
      success: true,
      score: result.score,
      totalScore: this.gameState.score,
      dishName: dishName,
      notes: result.notes,
    };
  }

  /**
   * 시간 업데이트
   * @param {number} deltaTime - 경과 시간 (초)
   */
  updateTime(deltaTime) {
    if (!this.gameState.gameStarted || this.gameState.gameEnded) {
      return;
    }

    this.gameState.timeLeft -= deltaTime;

    if (this.gameState.timeLeft <= 0) {
      this.gameState.timeLeft = 0;
      this.endGame();
    }
  }

  /**
   * 조합 생성 함수
   * @param {Array} arr - 배열
   * @param {number} k - 조합 크기
   * @returns {Array} 조합 배열
   */
  combosOf(arr, k) {
    const res = [];
    (function dfs(start, path) {
      if (path.length === k) {
        res.push([...path]);
        return;
      }
      for (let i = start; i < arr.length; i++) {
        path.push(arr[i]);
        dfs(i + 1, path);
        path.pop();
      }
    })(0, []);
    return res;
  }

  /**
   * 메시지 추가 (BaseGameLogic의 addMessage 사용)
   * @param {string} text - 메시지 텍스트
   * @param {boolean} isDanger - 위험 메시지 여부
   */
  addMessage(text, isDanger = false) {
    super.addMessage(text, isDanger);
    // UI 표시를 위해 최근 10개 메시지만 유지
    if (this.gameState.messages.length > 10) {
      this.gameState.messages = this.gameState.messages.slice(0, 10);
    }
  }

  /**
   * 게임 상태 반환
   * @returns {Object} 현재 게임 상태
   */
  getGameState() {
    return this.gameState;
  }

  /**
   * 현재 접시 반환
   * @returns {Array} 현재 접시의 재료들
   */
  getCurrentPlate() {
    return [...this.gameState.currentPlate];
  }

  /**
   * 게임이 진행 중인지 확인
   * @returns {boolean} 게임 진행 여부
   */
  isGameActive() {
    return this.gameState.gameStarted && !this.gameState.gameEnded;
  }

  /**
   * 게임이 종료되었는지 확인
   * @returns {boolean} 게임 종료 여부
   */
  isGameEnded() {
    return this.gameState.gameEnded;
  }

  /**
   * 남은 시간 반환
   * @returns {number} 남은 시간 (초)
   */
  getTimeLeft() {
    return Math.max(0, this.gameState.timeLeft);
  }

  /**
   * 현재 점수 반환
   * @returns {number} 현재 점수
   */
  getScore() {
    return this.gameState.score;
  }
}
