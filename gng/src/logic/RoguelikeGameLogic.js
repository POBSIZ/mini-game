/**
 * 로그라이크 게임 로직 클래스
 * 게임 상태 관리, 맵 생성, 전투, 아이템 처리 등의 핵심 로직을 담당
 */
import { BaseGameLogic } from "./BaseGameLogic.js";
import { ROGUELIKE_CONFIG, GAME_EVENTS, DIRECTIONS } from "../data/Config.js";
import {
  WEAPONS,
  ARMORS,
  ENEMY_TYPES,
  ITEM_DEFINITIONS,
  BALANCE_CONFIG,
} from "../data/RoguelikeData.js";
import {
  isValidCoordinate,
  isValidPlayer,
  isValidEnemy,
  isValidItem,
} from "../data/Validation.js";
import {
  randomInt,
  randomChoice,
  calculateDistance,
  getRandomElement,
} from "../utils/Utils.js";

export class RoguelikeGameLogic extends BaseGameLogic {
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
      level: 1,
      map: [],
      seen: [],
      visible: [],
      player: {
        x: 0,
        y: 0,
        hp: ROGUELIKE_CONFIG.START_HP,
        max: ROGUELIKE_CONFIG.START_HP,
        atk: [2, 6],
        level: 1,
        exp: 0,
        nextExp: 20,
        hunger: ROGUELIKE_CONFIG.HUNGER_MAX,
        facing: "right", // 'left' or 'right'
      },
      equip: { weapon: null, armor: null },
      enemies: [],
      items: [],
      traps: [],
      inventory: [],
      messages: [],
      gameOver: false,
      inventoryOpen: false,
    };
  }

  /**
   * 게임 상태 초기화 (재시작용)
   */
  resetGame() {
    this.reset();
  }

  /**
   * 새로운 레벨 생성
   */
  generateLevel() {
    const { VIEW_WIDTH, VIEW_HEIGHT } = ROGUELIKE_CONFIG;

    // 맵 초기화
    this.gameState.map = Array.from({ length: VIEW_HEIGHT }, () =>
      Array(VIEW_WIDTH).fill(1)
    );
    this.gameState.seen = Array.from({ length: VIEW_HEIGHT }, () =>
      Array(VIEW_WIDTH).fill(false)
    );
    this.gameState.visible = Array.from({ length: VIEW_HEIGHT }, () =>
      Array(VIEW_WIDTH).fill(false)
    );
    this.gameState.enemies = [];
    this.gameState.items = [];
    this.gameState.traps = [];

    // 방 생성
    const rooms = this.createRooms();

    // 방 연결
    this.connectRooms(rooms);

    // 맵 가장자리를 벽으로 설정
    this.setMapBorders();

    // 플레이어 위치 설정
    this.gameState.player.x = rooms[0].centerX;
    this.gameState.player.y = rooms[0].centerY;

    // 계단 또는 보스 배치
    const lastRoom = rooms[rooms.length - 1];
    if (this.gameState.level < ROGUELIKE_CONFIG.MAX_LEVEL) {
      this.gameState.map[lastRoom.centerY][lastRoom.centerX] = 2; // 계단
    }

    // 적 배치
    this.spawnEnemies(rooms);

    // 아이템 배치
    this.spawnItems(rooms);

    // 함정 배치
    this.spawnTraps(rooms);

    // 시야 계산
    this.computeFOV();

    this.addMessage(`지하 ${this.gameState.level}층에 진입했습니다.`);
  }

  /**
   * 방 생성
   * @returns {Array} 생성된 방 배열
   */
  createRooms() {
    const { VIEW_WIDTH, VIEW_HEIGHT } = ROGUELIKE_CONFIG;
    const rooms = [];
    const roomCount = Phaser.Math.Between(8, 12);

    for (let i = 0; i < roomCount; i++) {
      const width = Phaser.Math.Between(4, 9);
      const height = Phaser.Math.Between(3, 7);
      const x = Phaser.Math.Between(1, VIEW_WIDTH - width - 2);
      const y = Phaser.Math.Between(1, VIEW_HEIGHT - height - 2);

      // 방 그리기
      for (let ry = y; ry < y + height; ry++) {
        for (let rx = x; rx < x + width; rx++) {
          this.gameState.map[ry][rx] = 0;
        }
      }

      rooms.push({
        x,
        y,
        width,
        height,
        centerX: Math.floor(x + width / 2),
        centerY: Math.floor(y + height / 2),
      });
    }

    return rooms;
  }

  /**
   * 방들을 연결하는 복도 생성
   * @param {Array} rooms - 방 배열
   */
  connectRooms(rooms) {
    for (let i = 1; i < rooms.length; i++) {
      const prev = rooms[i - 1];
      const curr = rooms[i];

      let x = prev.centerX;
      let y = prev.centerY;

      // 수평 연결
      while (x !== curr.centerX) {
        this.gameState.map[y][x] = 0;
        x += x < curr.centerX ? 1 : -1;
      }

      // 수직 연결
      while (y !== curr.centerY) {
        this.gameState.map[y][x] = 0;
        y += y < curr.centerY ? 1 : -1;
      }
    }
  }

  /**
   * 적 스폰
   * @param {Array} rooms - 방 배열
   */
  spawnEnemies(rooms) {
    const floorCells = this.getFloorCells();
    const enemyCount = Phaser.Math.Between(
      7 + this.gameState.level,
      10 + this.gameState.level
    );

    for (let i = 0; i < enemyCount && floorCells.length > 0; i++) {
      const cell = floorCells.pop();
      if (
        cell.x === this.gameState.player.x &&
        cell.y === this.gameState.player.y
      )
        continue;

      const enemyType = Math.random() < 0.5 ? "goblin" : "slime";
      const enemyData = ENEMY_TYPES[enemyType];
      const hp =
        Phaser.Math.Between(enemyData.hp[0], enemyData.hp[1]) +
        Math.floor(this.gameState.level / 2);
      const atk = [
        enemyData.atk[0],
        enemyData.atk[1] + Math.floor(this.gameState.level / 3),
      ];

      this.gameState.enemies.push({
        x: cell.x,
        y: cell.y,
        hp: hp,
        maxHp: hp,
        type: enemyType,
        atk: atk,
        exp: enemyData.exp + Math.max(0, this.gameState.level - 1) * 2,
        facing: "right", // 기본적으로 오른쪽을 향함
      });
    }

    // 보스 스폰 (마지막 층)
    if (this.gameState.level === ROGUELIKE_CONFIG.MAX_LEVEL) {
      const lastRoom = rooms[rooms.length - 1];
      const bossData = ENEMY_TYPES.boss;
      const bossHp = 60 + Math.floor(this.gameState.player.level / 2) * 5;
      const bossAtk = [
        bossData.atk[0] + Math.floor(this.gameState.level / 3),
        bossData.atk[1] + Math.floor(this.gameState.level / 3),
      ];

      this.gameState.enemies.push({
        x: lastRoom.centerX,
        y: lastRoom.centerY,
        hp: bossHp,
        maxHp: bossHp,
        type: "boss",
        atk: bossAtk,
        exp: bossData.exp,
        facing: "right", // 기본적으로 오른쪽을 향함
      });

      this.addMessage(
        "최심부의 기척이 느껴집니다… 보스가 이 층 어딘가에 있습니다."
      );
    }
  }

  /**
   * 아이템 스폰
   * @param {Array} rooms - 방 배열
   */
  spawnItems(rooms) {
    const floorCells = this.getFloorCells();

    // 포션 스폰
    const potionCount = Phaser.Math.Between(2, 4);
    for (let i = 0; i < potionCount && floorCells.length > 0; i++) {
      const cell = floorCells.pop();
      if (
        cell.x === this.gameState.player.x &&
        cell.y === this.gameState.player.y
      )
        continue;
      this.gameState.items.push({ x: cell.x, y: cell.y, type: "potion" });
    }

    // 음식 스폰
    const foodCount = Phaser.Math.Between(2, 4);
    for (let i = 0; i < foodCount && floorCells.length > 0; i++) {
      const cell = floorCells.pop();
      if (
        cell.x === this.gameState.player.x &&
        cell.y === this.gameState.player.y
      )
        continue;
      this.gameState.items.push({
        x: cell.x,
        y: cell.y,
        type: "food",
        name: "건조 식량",
        hunger: [35, 55],
      });
    }

    // 장비 스폰
    const gearCount = Phaser.Math.Between(1, 2);
    for (let i = 0; i < gearCount && floorCells.length > 0; i++) {
      const cell = floorCells.pop();
      if (
        cell.x === this.gameState.player.x &&
        cell.y === this.gameState.player.y
      )
        continue;

      const isWeapon = Math.random() < 0.5;
      if (isWeapon) {
        const weapon = this.getRandomWeapon();
        this.gameState.items.push({
          x: cell.x,
          y: cell.y,
          type: "weapon",
          name: weapon.name,
          dmg: weapon.dmg,
        });
      } else {
        const armor = this.getRandomArmor();
        this.gameState.items.push({
          x: cell.x,
          y: cell.y,
          type: "armor",
          name: armor.name,
          def: armor.def,
        });
      }
    }
  }

  /**
   * 함정 스폰
   * @param {Array} rooms - 방 배열
   */
  spawnTraps(rooms) {
    const floorCells = this.getFloorCells();
    const trapCount = Phaser.Math.Between(
      2 + Math.floor(this.gameState.level / 2),
      4 + Math.floor(this.gameState.level / 2)
    );

    for (let i = 0; i < trapCount && floorCells.length > 0; i++) {
      const cell = floorCells.pop();
      if (
        cell.x === this.gameState.player.x &&
        cell.y === this.gameState.player.y
      )
        continue;

      this.gameState.traps.push({
        x: cell.x,
        y: cell.y,
        armed: true,
        seen: false,
        type: "spike",
        dmg: [3, 8],
      });
    }
  }

  /**
   * 바닥 타일 위치들 반환
   * @returns {Array} 바닥 타일 위치 배열
   */
  getFloorCells() {
    const cells = [];
    for (let y = 1; y < ROGUELIKE_CONFIG.VIEW_HEIGHT - 1; y++) {
      for (let x = 1; x < ROGUELIKE_CONFIG.VIEW_WIDTH - 1; x++) {
        if (this.gameState.map[y][x] === 0) {
          cells.push({ x, y });
        }
      }
    }
    return Phaser.Utils.Array.Shuffle(cells);
  }

  /**
   * 랜덤 무기 선택
   * @returns {Object} 선택된 무기
   */
  getRandomWeapon() {
    const tier = Math.min(3, 1 + Math.floor((this.gameState.level + 1) / 2));
    const availableWeapons = WEAPONS.filter((w) => w.tier <= tier);
    return Phaser.Utils.Array.GetRandom(availableWeapons);
  }

  /**
   * 랜덤 방어구 선택
   * @returns {Object} 선택된 방어구
   */
  getRandomArmor() {
    const tier = Math.min(3, 1 + Math.floor((this.gameState.level + 1) / 2));
    const availableArmors = ARMORS.filter((a) => a.tier <= tier);
    return Phaser.Utils.Array.GetRandom(availableArmors);
  }

  /**
   * 시야 계산 (FOV)
   */
  computeFOV() {
    const { FOV_RADIUS } = ROGUELIKE_CONFIG;
    const px = this.gameState.player.x;
    const py = this.gameState.player.y;

    // 모든 타일을 보이지 않음으로 설정
    for (let y = 0; y < ROGUELIKE_CONFIG.VIEW_HEIGHT; y++) {
      for (let x = 0; x < ROGUELIKE_CONFIG.VIEW_WIDTH; x++) {
        this.gameState.visible[y][x] = false;
      }
    }

    // 시야 반경 내의 타일들 확인
    for (let y = py - FOV_RADIUS; y <= py + FOV_RADIUS; y++) {
      for (let x = px - FOV_RADIUS; x <= px + FOV_RADIUS; x++) {
        if (
          x < 0 ||
          y < 0 ||
          x >= ROGUELIKE_CONFIG.VIEW_WIDTH ||
          y >= ROGUELIKE_CONFIG.VIEW_HEIGHT
        )
          continue;

        const dx = x - px;
        const dy = y - py;
        if (dx * dx + dy * dy > FOV_RADIUS * FOV_RADIUS) continue;

        if (this.hasLineOfSight(px, py, x, y)) {
          this.gameState.visible[y][x] = true;
          this.gameState.seen[y][x] = true;
        }
      }
    }
  }

  /**
   * 시야선 확인
   * @param {number} x0 - 시작 x 좌표
   * @param {number} y0 - 시작 y 좌표
   * @param {number} x1 - 끝 x 좌표
   * @param {number} y1 - 끝 y 좌표
   * @returns {boolean} 시야선이 있는지 여부
   */
  hasLineOfSight(x0, y0, x1, y1) {
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (x0 === x1 && y0 === y1) return true;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }

      if (
        x0 < 0 ||
        y0 < 0 ||
        x0 >= ROGUELIKE_CONFIG.VIEW_WIDTH ||
        y0 >= ROGUELIKE_CONFIG.VIEW_HEIGHT
      )
        return false;
      if (this.gameState.map[y0][x0] === 1) return false; // 벽에 막힘
    }
  }

  /**
   * 플레이어 이동 시도
   * @param {number} dx - x 방향 이동량
   * @param {number} dy - y 방향 이동량
   * @returns {boolean} 이동 성공 여부
   */
  tryMove(dx, dy) {
    const nx = this.gameState.player.x + dx;
    const ny = this.gameState.player.y + dy;

    if (
      nx < 0 ||
      ny < 0 ||
      nx >= ROGUELIKE_CONFIG.VIEW_WIDTH ||
      ny >= ROGUELIKE_CONFIG.VIEW_HEIGHT
    )
      return false;
    if (this.gameState.map[ny][nx] === 1) return false; // 벽

    // 적과 충돌 체크
    const enemy = this.gameState.enemies.find((e) => e.x === nx && e.y === ny);
    if (enemy) {
      this.attackEnemy(enemy);
      return true;
    }

    // 아이템 픽업 체크
    const item = this.gameState.items.find((i) => i.x === nx && i.y === ny);
    if (item) {
      this.pickupItem(item);
      this.gameState.items = this.gameState.items.filter((i) => i !== item);
    }

    // 함정 체크
    const trap = this.gameState.traps.find((t) => t.x === nx && t.y === ny);
    if (trap && trap.armed) {
      const damage = Phaser.Math.Between(trap.dmg[0], trap.dmg[1]);
      this.gameState.player.hp -= damage;
      trap.armed = false;
      trap.seen = true;
      this.addMessage(
        `함정 작동! 가시 함정에 ${damage} 피해를 입었습니다.`,
        true
      );
      this.checkGameOver();
    }

    // 계단 체크
    if (this.gameState.map[ny][nx] === 2) {
      this.addMessage("계단 위에 섰습니다. 다음 층으로 내려가려면 '>' 키.");
    }

    // 방향 변경은 Scene에서 처리됨 (즉시 반응을 위해)
    this.gameState.player.x = nx;
    this.gameState.player.y = ny;
    return true;
  }

  /**
   * 적 공격
   * @param {Object} enemy - 공격할 적
   */
  attackEnemy(enemy) {
    let damage = Phaser.Math.Between(
      this.gameState.player.atk[0],
      this.gameState.player.atk[1]
    );
    if (this.gameState.equip.weapon) {
      damage += Phaser.Math.Between(
        this.gameState.equip.weapon.dmg[0],
        this.gameState.equip.weapon.dmg[1]
      );
    }

    enemy.hp -= damage;
    this.addMessage(
      `${ENEMY_TYPES[enemy.type].name}에게 ${damage} 피해를 입혔습니다.`
    );

    if (enemy.hp <= 0) {
      this.gameState.enemies = this.gameState.enemies.filter(
        (e) => e !== enemy
      );
      this.addMessage(
        `${ENEMY_TYPES[enemy.type].name}을(를) 처치했습니다! (+${
          enemy.exp
        } EXP)`
      );
      this.gainExp(enemy.exp);

      if (enemy.type === "boss") {
        this.gameState.map[enemy.y][enemy.x] = 2; // 계단 생성
        this.addMessage("보스가 쓰러지며 발밑에 계단이 드러났습니다!");
      }
    }
  }

  /**
   * 아이템 픽업
   * @param {Object} item - 픽업할 아이템
   */
  pickupItem(item) {
    if (item.type === "potion") {
      this.gameState.inventory.push({ type: "potion", name: "체력 물약" });
      this.addMessage("체력 물약을 주웠습니다.");
    } else if (item.type === "weapon") {
      this.gameState.inventory.push({
        type: "weapon",
        name: item.name,
        dmg: item.dmg,
      });
      this.addMessage(`무기 ${item.name}을(를) 주웠습니다.`);
    } else if (item.type === "armor") {
      this.gameState.inventory.push({
        type: "armor",
        name: item.name,
        def: item.def,
      });
      this.addMessage(`방어구 ${item.name}을(를) 주웠습니다.`);
    } else if (item.type === "food") {
      this.gameState.inventory.push({
        type: "food",
        name: item.name,
        hunger: item.hunger,
      });
      this.addMessage(`음식 ${item.name}을(를) 주웠습니다.`);
    }
  }

  /**
   * 아이템을 인벤토리에 추가 (요리 아이템 포함)
   * @param {Object} item - 추가할 아이템
   * @returns {boolean} 추가 성공 여부
   */
  addItemToInventory(item) {
    // 인벤토리 크기 제한 확인 (최대 20개)
    if (this.gameState.inventory.length >= 20) {
      return false;
    }

    // 요리 아이템인 경우 특별 처리
    if (item.type === "cooked_food") {
      this.gameState.inventory.push({
        type: "cooked_food",
        name: item.name,
        symbol: item.symbol,
        color: item.color,
        description: item.description,
        hunger: item.hunger,
        hp: item.hp,
        value: item.value,
        isSpecial: item.isSpecial,
        recipe: item.recipe,
        score: item.score,
      });
      return true;
    }

    // 기존 아이템 타입들
    this.gameState.inventory.push(item);
    return true;
  }

  /**
   * 경험치 획득
   * @param {number} exp - 획득할 경험치
   */
  gainExp(exp) {
    this.gameState.player.exp += exp;
    while (this.gameState.player.exp >= this.gameState.player.nextExp) {
      this.gameState.player.exp -= this.gameState.player.nextExp;
      this.levelUp();
    }
  }

  /**
   * 레벨업
   */
  levelUp() {
    this.gameState.player.level += 1;
    const hpGain = Phaser.Math.Between(3, 5);
    this.gameState.player.max += hpGain;
    this.gameState.player.hp = this.gameState.player.max;
    if (this.gameState.player.level % 2 === 0)
      this.gameState.player.atk[0] += 1;
    this.gameState.player.atk[1] += 1;
    this.gameState.player.nextExp = 20 + (this.gameState.player.level - 1) * 15;
    this.addMessage(
      `레벨 업! Lv ${this.gameState.player.level} (최대 HP +${hpGain}, 공격력 강화)`,
      true
    );
  }

  /**
   * 턴 종료 처리
   */
  endTurn() {
    // 배고픔 처리
    this.gameState.player.hunger = Math.max(
      0,
      this.gameState.player.hunger - 1
    );
    if (this.gameState.player.hunger === 0) {
      this.gameState.player.hp -= 1;
      this.addMessage("굶주림으로 1 피해를 받았습니다!", true);
      this.checkGameOver();
    } else if (this.gameState.player.hunger === ROGUELIKE_CONFIG.HUNGER_WARN) {
      this.addMessage("배가 고파지기 시작합니다… (음식을 찾으세요)");
    }

    this.computeFOV();
    this.enemiesAct();
    this.computeFOV();
    this.checkGameOver();
  }

  /**
   * 적 행동 처리
   */
  enemiesAct() {
    this.gameState.enemies.forEach((enemy) => {
      if (enemy.hp <= 0) return;

      const distance =
        Math.abs(enemy.x - this.gameState.player.x) +
        Math.abs(enemy.y - this.gameState.player.y);

      if (distance === 1) {
        // 공격
        const damage = Phaser.Math.Between(enemy.atk[0], enemy.atk[1]);
        const defense = this.gameState.equip.armor
          ? this.gameState.equip.armor.def
          : 0;
        const finalDamage = Math.max(1, damage - defense);

        this.gameState.player.hp -= finalDamage;
        this.addMessage(
          `${
            ENEMY_TYPES[enemy.type].name
          }이(가) 당신에게 ${finalDamage} 피해를 입혔습니다.`,
          true
        );
        this.checkGameOver();
      } else if (
        distance <= ROGUELIKE_CONFIG.FOV_RADIUS &&
        this.hasLineOfSight(
          enemy.x,
          enemy.y,
          this.gameState.player.x,
          this.gameState.player.y
        )
      ) {
        // 플레이어를 향해 이동
        const dx = this.gameState.player.x - enemy.x;
        const dy = this.gameState.player.y - enemy.y;
        const moveX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
        const moveY = dy > 0 ? 1 : dy < 0 ? -1 : 0;

        // 적의 방향 업데이트 (수평 이동 시에만)
        if (moveX > 0) {
          enemy.facing = "right";
        } else if (moveX < 0) {
          enemy.facing = "left";
        }

        const newX = enemy.x + moveX;
        const newY = enemy.y + moveY;

        if (
          newX >= 0 &&
          newY >= 0 &&
          newX < ROGUELIKE_CONFIG.VIEW_WIDTH &&
          newY < ROGUELIKE_CONFIG.VIEW_HEIGHT
        ) {
          if (
            this.gameState.map[newY][newX] === 0 &&
            !this.gameState.enemies.some((e) => e.x === newX && e.y === newY) &&
            !(
              newX === this.gameState.player.x &&
              newY === this.gameState.player.y
            )
          ) {
            enemy.x = newX;
            enemy.y = newY;
          }
        }
      }
    });
  }

  /**
   * 게임 오버 체크
   */
  checkGameOver() {
    if (this.gameState.player.hp <= 0) {
      this.gameState.player.hp = 0;
      this.gameState.gameOver = true;
      this.addMessage("당신은 쓰러졌습니다... R 키로 재시작하세요.", true);
    }
  }

  /**
   * 계단 하강
   * @returns {boolean} 하강 성공 여부
   */
  descend() {
    if (this.gameState.gameOver) return false;

    // 플레이어가 계단 위에 있는지 확인
    if (
      this.gameState.map[this.gameState.player.y][this.gameState.player.x] !== 2
    ) {
      this.addMessage("여기는 계단이 아닙니다.", true);
      return false;
    }

    // 마지막 층인지 확인
    if (this.gameState.level >= ROGUELIKE_CONFIG.MAX_LEVEL) {
      this.addMessage(
        "당신은 최심부에서 살아남아 탈출했습니다. 승리! 🏆",
        true
      );
      this.gameState.gameOver = true;
      return true;
    }

    // 다음 층으로 이동
    this.gameState.level++;
    this.generateLevel();
    return true;
  }

  /**
   * 물약 사용
   * @returns {boolean} 사용 성공 여부
   */
  usePotion() {
    const potionIndex = this.gameState.inventory.findIndex(
      (item) => item.type === "potion"
    );
    if (potionIndex < 0) {
      this.addMessage("물약이 없습니다.", true);
      return false;
    }

    this.gameState.inventory.splice(potionIndex, 1);
    const heal = Phaser.Math.Between(6, 10);
    this.gameState.player.hp = Math.min(
      this.gameState.player.max,
      this.gameState.player.hp + heal
    );
    this.addMessage(
      `물약을 마셔 ${heal} 회복했습니다. (HP ${this.gameState.player.hp}/${this.gameState.player.max})`
    );
    return true;
  }

  /**
   * 음식 섭취
   * @returns {boolean} 섭취 성공 여부
   */
  eatFood() {
    const foodIndex = this.gameState.inventory.findIndex(
      (item) => item.type === "food"
    );
    if (foodIndex < 0) {
      this.addMessage("음식이 없습니다.", true);
      return false;
    }

    const food = this.gameState.inventory[foodIndex];
    this.gameState.inventory.splice(foodIndex, 1);
    const gain = Phaser.Math.Between(food.hunger[0], food.hunger[1]);
    const before = this.gameState.player.hunger;
    this.gameState.player.hunger = Math.min(
      ROGUELIKE_CONFIG.HUNGER_MAX,
      this.gameState.player.hunger + gain
    );
    this.addMessage(
      `음식을 먹었습니다. 배고픔 +${
        this.gameState.player.hunger - before
      } (현재 ${this.gameState.player.hunger}/${ROGUELIKE_CONFIG.HUNGER_MAX})`
    );
    return true;
  }

  /**
   * 인벤토리 아이템 사용
   * @param {number} index - 아이템 인덱스
   * @returns {boolean} 사용 성공 여부
   */
  useInventoryItem(index) {
    if (index < 0 || index >= this.gameState.inventory.length) {
      this.addMessage("잘못된 아이템 번호입니다.", true);
      return false;
    }

    const item = this.gameState.inventory[index];

    if (item.type === "potion") {
      this.gameState.inventory.splice(index, 1);
      const heal = Phaser.Math.Between(6, 10);
      this.gameState.player.hp = Math.min(
        this.gameState.player.max,
        this.gameState.player.hp + heal
      );
      this.addMessage(
        `물약을 마셔 ${heal} 회복했습니다. (HP ${this.gameState.player.hp}/${this.gameState.player.max})`
      );
      return true;
    } else if (item.type === "weapon") {
      this.equipWeapon(item, index);
      return true;
    } else if (item.type === "armor") {
      this.equipArmor(item, index);
      return true;
    } else if (item.type === "food") {
      this.gameState.inventory.splice(index, 1);
      const gain = Phaser.Math.Between(item.hunger[0], item.hunger[1]);
      const before = this.gameState.player.hunger;
      this.gameState.player.hunger = Math.min(
        ROGUELIKE_CONFIG.HUNGER_MAX,
        this.gameState.player.hunger + gain
      );
      this.addMessage(
        `음식을 먹었습니다. 배고픔 +${
          this.gameState.player.hunger - before
        } (현재 ${this.gameState.player.hunger}/${ROGUELIKE_CONFIG.HUNGER_MAX})`
      );
      return true;
    } else if (item.type === "cooked_food") {
      this.gameState.inventory.splice(index, 1);

      // HP 회복
      const hpGain = Phaser.Math.Between(item.hp[0], item.hp[1]);
      const beforeHp = this.gameState.player.hp;
      this.gameState.player.hp = Math.min(
        this.gameState.player.max,
        this.gameState.player.hp + hpGain
      );

      // 배고픔 회복
      const hungerGain = Phaser.Math.Between(item.hunger[0], item.hunger[1]);
      const beforeHunger = this.gameState.player.hunger;
      this.gameState.player.hunger = Math.min(
        ROGUELIKE_CONFIG.HUNGER_MAX,
        this.gameState.player.hunger + hungerGain
      );

      // 특별한 레시피인 경우 추가 효과
      let specialMessage = "";
      if (item.isSpecial) {
        specialMessage = " ✨ 특별한 맛!";
      }

      this.addMessage(
        `"${item.name}"을(를) 맛있게 먹었습니다!${specialMessage} HP +${
          this.gameState.player.hp - beforeHp
        }, 배고픔 +${this.gameState.player.hunger - beforeHunger}`
      );
      return true;
    }

    return false;
  }

  /**
   * 무기 장착
   * @param {Object} weapon - 장착할 무기
   * @param {number} index - 인벤토리 인덱스
   */
  equipWeapon(weapon, index) {
    const prevWeapon = this.gameState.equip.weapon;
    this.gameState.equip.weapon = { name: weapon.name, dmg: weapon.dmg };

    if (prevWeapon) {
      this.gameState.inventory.push({
        type: "weapon",
        name: prevWeapon.name,
        dmg: prevWeapon.dmg,
      });
    }

    this.gameState.inventory.splice(index, 1);
    this.addMessage(`무기 장착: ${weapon.name}`);
  }

  /**
   * 방어구 장착
   * @param {Object} armor - 장착할 방어구
   * @param {number} index - 인벤토리 인덱스
   */
  equipArmor(armor, index) {
    const prevArmor = this.gameState.equip.armor;
    this.gameState.equip.armor = { name: armor.name, def: armor.def };

    if (prevArmor) {
      this.gameState.inventory.push({
        type: "armor",
        name: prevArmor.name,
        def: prevArmor.def,
      });
    }

    this.gameState.inventory.splice(index, 1);
    this.addMessage(`방어구 장착: ${armor.name}`);
  }

  /**
   * 인벤토리 토글
   */
  toggleInventory() {
    this.gameState.inventoryOpen = !this.gameState.inventoryOpen;
  }

  /**
   * 특정 타입 아이템 개수 세기
   * @param {string} type - 아이템 타입
   * @returns {number} 아이템 개수
   */
  countItems(type) {
    return this.gameState.inventory.filter((item) => item.type === type).length;
  }

  /**
   * 메시지 추가 (BaseGameLogic의 addMessage 사용)
   * @param {string} text - 메시지 텍스트
   * @param {boolean} isDanger - 위험 메시지 여부
   */
  addMessage(text, isDanger = false) {
    super.addMessage(text, isDanger);
    // UI 표시를 위해 최근 6개 메시지만 유지
    if (this.gameState.messages.length > 6) {
      this.gameState.messages = this.gameState.messages.slice(0, 6);
    }
  }

  /**
   * 맵 가장자리를 벽으로 설정
   * @private
   */
  setMapBorders() {
    const { VIEW_WIDTH, VIEW_HEIGHT } = ROGUELIKE_CONFIG;

    // 상단과 하단 가장자리
    for (let x = 0; x < VIEW_WIDTH; x++) {
      this.gameState.map[0][x] = 1; // 상단
      this.gameState.map[VIEW_HEIGHT - 1][x] = 1; // 하단
    }

    // 좌측과 우측 가장자리
    for (let y = 0; y < VIEW_HEIGHT; y++) {
      this.gameState.map[y][0] = 1; // 좌측
      this.gameState.map[y][VIEW_WIDTH - 1] = 1; // 우측
    }
  }

  /**
   * 게임 상태 반환
   * @returns {Object} 현재 게임 상태
   */
  getGameState() {
    return this.gameState;
  }
}
