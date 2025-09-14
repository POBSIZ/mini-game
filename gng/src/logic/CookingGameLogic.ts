/**
 * 요리 게임 로직 클래스
 * 요리 게임의 핵심 로직을 담당
 */
import { BaseGameLogic } from "./BaseGameLogic.js";
import { GAME_CONFIG, GAME_EVENTS } from "../data/Config.js";
import {
  SYNERGY,
  findRecipe,
  type Ingredient,
  type Palate,
  type Recipe,
} from "../data/CookingData.js";
import {
  isValidIngredient,
  isValidPalate,
  isValidCookingGameState,
  type CookingGameState,
} from "../data/Validation.js";

// 요리 게임 상태 타입 정의
interface CookingGameStateInternal extends CookingGameState {
  messages: Array<{ text: string; isDanger: boolean; timestamp: number }>;
}

// 점수 계산 결과 타입
interface ScoreResult {
  score: number;
  notes: string[];
}

// 접시 제출 결과 타입
interface SubmitResult {
  success: boolean;
  message?: string;
  score?: number;
  totalScore?: number;
  dishName?: string;
  notes?: string[];
}

export class CookingGameLogic extends BaseGameLogic {
  constructor() {
    super();
    this.init();
  }

  /**
   * 게임 상태 검증 (요리 게임용)
   */
  protected validateGameState(gameState: any): boolean {
    return isValidCookingGameState(gameState);
  }

  /**
   * 게임 상태 초기화
   */
  protected initializeGameState(): any {
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
  public resetGame(): void {
    this.reset();
  }

  /**
   * 게임 시작
   */
  public startGame(): void {
    this.gameState.gameStarted = true;
    this.gameState.gameEnded = false;
    this.gameState.timeLeft = GAME_CONFIG.TIME_LIMIT;
    this.addMessage("요리 게임을 시작합니다!");
    this.emit(GAME_EVENTS.COOKING_START, { gameType: "cooking" });
  }

  /**
   * 게임 종료
   */
  public endGame(): void {
    this.gameState.gameEnded = true;
    this.gameState.gameStarted = false;
    this.addMessage(`게임 종료! 최종 점수: ${this.gameState.score}`);
    this.emit(GAME_EVENTS.GAME_OVER, {
      reason: "timeout",
      score: this.gameState.score,
    });
  }

  /**
   * 재료 추가
   */
  public addIngredient(ingredient: Ingredient): boolean {
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
   */
  public removeIngredient(index: number): boolean {
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
   */
  public clearPlate(): boolean {
    if (this.gameState.gameEnded || !this.gameState.gameStarted) {
      return false;
    }

    this.gameState.currentPlate = [];
    this.addMessage("접시를 비웠습니다.");
    return true;
  }

  /**
   * 점수 계산
   */
  public calculateScore(palate: Palate): ScoreResult {
    const plate = this.gameState.currentPlate;
    const names = plate.map((p: Ingredient) => p.name);
    let score = plate.length * GAME_CONFIG.BASE_POINTS;
    let notes: string[] = [];

    // 태그 기반 가중치 (취향)
    plate.forEach((p: Ingredient) => {
      p.tags.forEach((t: string) => {
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
    const uniqueTags = new Set(plate.flatMap((p: Ingredient) => p.tags));
    score += Math.max(0, uniqueTags.size - 3);

    // 너무 무거운 맛 패널티
    const fat = plate.filter((p: Ingredient) => p.tags.includes("지방")).length;
    const prot = plate.filter(
      (p: Ingredient) => p.tags.includes("단백질") || p.tags.includes("식물성")
    ).length;
    if (fat >= 2 && prot >= 2) score -= 4;

    return { score, notes };
  }

  /**
   * 음식 이름 생성 (레시피 시스템 기반)
   */
  public generateDishName(palate: Palate): string {
    const plate = this.gameState.currentPlate;
    const ingredientIds = plate.map((ingredient: Ingredient) => ingredient.id);

    // 완성된 레시피가 있는지 확인
    const recipe = findRecipe(ingredientIds);
    if (recipe) {
      return recipe.name;
    }

    // 완성된 레시피가 없으면 기본 조합 이름 생성
    const has = (n: string) => plate.some((p: Ingredient) => p.name === n);

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
   */
  public getCurrentRecipe(): Recipe | undefined {
    const plate = this.gameState.currentPlate;
    const ingredientIds = plate.map((ingredient: Ingredient) => ingredient.id);
    return findRecipe(ingredientIds);
  }

  /**
   * 접시 제출
   */
  public submitPlate(palate: Palate): SubmitResult {
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
   */
  public updateTime(deltaTime: number): void {
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
   */
  private combosOf(arr: string[], k: number): string[][] {
    const res: string[][] = [];
    (function dfs(start: number, path: string[]) {
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
   */
  public addMessage(text: string, isDanger: boolean = false): void {
    super.addMessage(text, isDanger);
    // UI 표시를 위해 최근 10개 메시지만 유지
    if (this.gameState.messages.length > 10) {
      this.gameState.messages = this.gameState.messages.slice(0, 10);
    }
  }

  /**
   * 게임 상태 반환
   */
  public getGameState(): any {
    if (!this.isInitialized) {
      console.error("게임이 초기화되지 않았습니다.");
      return this.initializeGameState();
    }
    return { ...this.gameState };
  }

  /**
   * 현재 접시 반환
   */
  public getCurrentPlate(): Ingredient[] {
    if (!this.isInitialized) {
      console.error("게임이 초기화되지 않았습니다.");
      return [];
    }
    return [...this.gameState.currentPlate];
  }

  /**
   * 게임이 진행 중인지 확인
   */
  public isGameActive(): boolean {
    return this.gameState.gameStarted && !this.gameState.gameEnded;
  }

  /**
   * 게임이 종료되었는지 확인
   */
  public isGameEnded(): boolean {
    return this.gameState.gameEnded;
  }

  /**
   * 남은 시간 반환
   */
  public getTimeLeft(): number {
    return Math.max(0, this.gameState.timeLeft);
  }

  /**
   * 현재 점수 반환
   */
  public getScore(): number {
    return this.gameState.score;
  }
}
