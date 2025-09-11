# Phaser.js 패턴

GNG 프로젝트에서 사용하는 Phaser 3 프레임워크 패턴과 베스트 프랙티스입니다.

## 📋 목차

- [씬 관리 패턴](#씬-관리-패턴)
- [리소스 로딩 패턴](#리소스-로딩-패턴)
- [게임 오브젝트 생성 패턴](#게임-오브젝트-생성-패턴)
- [입력 처리 패턴](#입력-처리-패턴)
- [애니메이션 패턴](#애니메이션-패턴)
- [물리 엔진 패턴](#물리-엔진-패턴)
- [UI 관리 패턴](#ui-관리-패턴)
- [성능 최적화 패턴](#성능-최적화-패턴)

## 씬 관리 패턴

### 1. 씬 생명주기

```javascript
export default class RoguelikeScene extends Phaser.Scene {
  constructor() {
    super({ key: "RoguelikeScene" });
  }

  // 1. 리소스 로딩
  preload() {
    // 이미지, 사운드, 데이터 로딩
    this.load.image("player", "assets/player.png");
    this.load.audio("bgm", "assets/bgm.mp3");
  }

  // 2. 씬 초기화
  create() {
    // 게임 오브젝트 생성
    // 이벤트 리스너 등록
    // 초기 상태 설정
  }

  // 3. 게임 루프 (매 프레임 실행)
  update(time, delta) {
    // 게임 로직 업데이트
    // 입력 처리
    // 상태 변경
  }

  // 4. 씬 종료 시 정리
  destroy() {
    // 이벤트 리스너 제거
    // 타이머 정리
    // 메모리 해제
  }
}
```

### 2. 씬 전환 패턴

```javascript
// 씬 시작
this.scene.start("RoguelikeScene");

// 씬 전환 (현재 씬 중지 후 새 씬 시작)
this.scene.switch("MenuScene");

// 씬 실행 (현재 씬 유지하면서 새 씬 추가)
this.scene.launch("CookingScene");

// 씬 중지
this.scene.stop("CookingScene");

// 씬 일시정지/재개
this.scene.pause("RoguelikeScene");
this.scene.resume("RoguelikeScene");
```

### 3. 씬 간 데이터 전달

```javascript
// 데이터와 함께 씬 시작
this.scene.start('RoguelikeScene', {
  playerLevel: 5,
  inventory: this.inventory,
  settings: this.settings
});

// 씬에서 데이터 받기
create(data) {
  const { playerLevel, inventory, settings } = data;
  this.playerLevel = playerLevel || 1;
  this.inventory = inventory || [];
  this.settings = settings || {};
}
```

## 리소스 로딩 패턴

### 1. 기본 리소스 로딩

```javascript
preload() {
  // 이미지 로딩
  this.load.image('player', 'assets/player.png');
  this.load.image('enemy', 'assets/enemy.png');

  // 스프라이트 시트
  this.load.spritesheet('playerAnim', 'assets/player-sheet.png', {
    frameWidth: 32,
    frameHeight: 32
  });

  // 아틀라스 (텍스처 패킹)
  this.load.atlas('gameAssets', 'assets/sprites.png', 'assets/sprites.json');

  // 사운드
  this.load.audio('bgm', 'assets/bgm.mp3');
  this.load.audio('sfx', ['assets/sfx1.mp3', 'assets/sfx2.mp3']);

  // JSON 데이터
  this.load.json('levelData', 'assets/levels.json');
}
```

### 2. 동적 리소스 로딩

```javascript
// 런타임에 리소스 로딩
async loadDynamicAsset(key, url, type = 'image') {
  return new Promise((resolve, reject) => {
    this.load.once('complete', () => resolve());
    this.load.once('loaderror', (file) => reject(file));

    switch (type) {
      case 'image':
        this.load.image(key, url);
        break;
      case 'audio':
        this.load.audio(key, url);
        break;
      case 'json':
        this.load.json(key, url);
        break;
    }

    this.load.start();
  });
}
```

### 3. 로딩 진행률 표시

```javascript
preload() {
  // 로딩 바 생성
  this.createLoadingBar();

  // 로딩 진행률 이벤트
  this.load.on('progress', (progress) => {
    this.updateLoadingBar(progress);
  });

  // 로딩 완료 이벤트
  this.load.on('complete', () => {
    this.hideLoadingBar();
  });

  // 에러 처리
  this.load.on('loaderror', (file) => {
    console.error(`리소스 로딩 실패: ${file.key}`);
  });
}

createLoadingBar() {
  const { width, height } = this.scale;

  // 배경
  this.loadingBg = this.add.rectangle(width / 2, height / 2, 400, 20, 0x333333);

  // 진행 바
  this.loadingBar = this.add.rectangle(width / 2, height / 2, 0, 20, 0x00ff00);

  // 텍스트
  this.loadingText = this.add.text(width / 2, height / 2 + 30, '로딩 중...', {
    fontSize: '16px',
    color: '#ffffff'
  }).setOrigin(0.5);
}

updateLoadingBar(progress) {
  const { width } = this.scale;
  this.loadingBar.width = 400 * progress;
  this.loadingText.setText(`로딩 중... ${Math.round(progress * 100)}%`);
}
```

## 게임 오브젝트 생성 패턴

### 1. 기본 오브젝트 생성

```javascript
create() {
  // 스프라이트 생성
  this.player = this.add.sprite(100, 100, 'player');

  // 그룹 생성
  this.enemies = this.add.group();

  // 컨테이너 생성
  this.uiContainer = this.add.container(0, 0);

  // 텍스트 생성
  this.scoreText = this.add.text(10, 10, 'Score: 0', {
    fontSize: '16px',
    color: '#ffffff'
  });
}
```

### 2. 팩토리 패턴

```javascript
// 적 생성 팩토리
class EnemyFactory {
  constructor(scene) {
    this.scene = scene;
  }

  createEnemy(type, x, y) {
    switch (type) {
      case "goblin":
        return this.createGoblin(x, y);
      case "orc":
        return this.createOrc(x, y);
      case "dragon":
        return this.createDragon(x, y);
      default:
        return this.createGoblin(x, y);
    }
  }

  createGoblin(x, y) {
    const goblin = this.scene.add.sprite(x, y, "goblin");
    goblin.setData("type", "goblin");
    goblin.setData("health", 50);
    goblin.setData("damage", 10);
    return goblin;
  }
}
```

### 3. 오브젝트 풀링 패턴

```javascript
class BulletPool {
  constructor(scene, poolSize = 20) {
    this.scene = scene;
    this.pool = [];
    this.poolSize = poolSize;

    // 풀 초기화
    for (let i = 0; i < poolSize; i++) {
      const bullet = scene.add.sprite(0, 0, "bullet");
      bullet.setActive(false);
      bullet.setVisible(false);
      this.pool.push(bullet);
    }
  }

  get() {
    // 사용 가능한 총알 찾기
    for (let bullet of this.pool) {
      if (!bullet.active) {
        bullet.setActive(true);
        bullet.setVisible(true);
        return bullet;
      }
    }

    // 풀이 비어있으면 새로 생성
    const bullet = this.scene.add.sprite(0, 0, "bullet");
    this.pool.push(bullet);
    return bullet;
  }

  release(bullet) {
    bullet.setActive(false);
    bullet.setVisible(false);
    bullet.setPosition(0, 0);
  }
}
```

## 입력 처리 패턴

### 1. 키보드 입력

```javascript
create() {
  // 키보드 입력 설정
  this.cursors = this.input.keyboard.createCursorKeys();
  this.wasd = this.input.keyboard.addKeys('W,S,A,D');
  this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

  // 특정 키 이벤트
  this.input.keyboard.on('keydown-ENTER', () => {
    this.startGame();
  });
}

update() {
  // 지속적인 키 입력 처리
  if (this.cursors.left.isDown) {
    this.player.x -= this.playerSpeed;
  }
  if (this.cursors.right.isDown) {
    this.player.x += this.playerSpeed;
  }

  // 단발성 키 입력 처리
  if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
    this.jump();
  }
}
```

### 2. 마우스/터치 입력

```javascript
create() {
  // 마우스 클릭
  this.input.on('pointerdown', (pointer) => {
    this.handleClick(pointer.x, pointer.y);
  });

  // 터치 입력
  this.input.on('pointerup', (pointer) => {
    this.handleTouch(pointer.x, pointer.y);
  });

  // 드래그
  this.input.on('dragstart', (pointer, gameObject) => {
    this.startDrag(gameObject);
  });

  this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
    this.updateDrag(gameObject, dragX, dragY);
  });
}
```

### 3. 입력 매니저 패턴

```javascript
class InputManager {
  constructor(scene) {
    this.scene = scene;
    this.keys = {};
    this.setupKeys();
  }

  setupKeys() {
    this.keys = {
      left: this.scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.LEFT
      ),
      right: this.scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.RIGHT
      ),
      up: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: this.scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.DOWN
      ),
      space: this.scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.SPACE
      ),
      enter: this.scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.ENTER
      ),
    };
  }

  isKeyDown(key) {
    return this.keys[key] && this.keys[key].isDown;
  }

  isKeyJustDown(key) {
    return this.keys[key] && Phaser.Input.Keyboard.JustDown(this.keys[key]);
  }
}
```

## 애니메이션 패턴

### 1. 기본 애니메이션

```javascript
create() {
  // 애니메이션 생성
  this.anims.create({
    key: 'playerWalk',
    frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1
  });

  // 애니메이션 재생
  this.player.play('playerWalk');

  // 애니메이션 이벤트
  this.player.on('animationcomplete', (animation) => {
    if (animation.key === 'playerAttack') {
      this.onAttackComplete();
    }
  });
}
```

### 2. 애니메이션 시퀀스

```javascript
// 복합 애니메이션 시퀀스
playAttackSequence() {
  this.player.play('attack1');

  this.player.once('animationcomplete', () => {
    this.player.play('attack2');

    this.player.once('animationcomplete', () => {
      this.player.play('idle');
    });
  });
}
```

### 3. 트윈 애니메이션

```javascript
// 기본 트윈
this.tweens.add({
  targets: this.player,
  x: 300,
  duration: 1000,
  ease: "Power2",
});

// 복합 트윈
this.tweens.add({
  targets: this.player,
  x: 300,
  y: 200,
  scaleX: 1.5,
  scaleY: 1.5,
  duration: 1000,
  ease: "Back.easeOut",
  onComplete: () => {
    console.log("애니메이션 완료");
  },
});

// 체인 트윈
this.tweens.add({
  targets: this.player,
  x: 300,
  duration: 500,
  onComplete: () => {
    this.tweens.add({
      targets: this.player,
      y: 200,
      duration: 500,
    });
  },
});
```

## 물리 엔진 패턴

### 1. 물리 바디 설정

```javascript
create() {
  // 물리 바디 활성화
  this.physics.add.existing(this.player);

  // 바디 타입 설정
  this.player.body.setCollideWorldBounds(true);
  this.player.body.setBounce(0.2);
  this.player.body.setDragX(100);

  // 충돌 그룹 설정
  this.player.setCollisionGroup(this.playerGroup);
  this.enemies.setCollisionGroup(this.enemyGroup);

  // 충돌 감지 설정
  this.physics.add.collider(this.player, this.enemies, this.handlePlayerEnemyCollision);
}
```

### 2. 물리 업데이트

```javascript
update() {
  // 중력 적용
  if (this.player.body.touching.down) {
    this.player.body.setVelocityY(0);
  } else {
    this.player.body.setVelocityY(this.player.body.velocity.y + this.gravity);
  }

  // 점프
  if (this.inputManager.isKeyJustDown('space') && this.player.body.touching.down) {
    this.player.body.setVelocityY(-300);
  }

  // 좌우 이동
  if (this.inputManager.isKeyDown('left')) {
    this.player.body.setVelocityX(-200);
  } else if (this.inputManager.isKeyDown('right')) {
    this.player.body.setVelocityX(200);
  } else {
    this.player.body.setVelocityX(0);
  }
}
```

## UI 관리 패턴

### 1. UI 컨테이너 패턴

```javascript
create() {
  // UI 컨테이너 생성
  this.uiContainer = this.add.container(0, 0);

  // HUD 생성
  this.createHUD();

  // 메뉴 생성
  this.createMenu();
}

createHUD() {
  // HUD 배경
  const hudBg = this.add.rectangle(0, 0, this.scale.width, 60, 0x000000, 0.7);
  hudBg.setOrigin(0, 0);
  this.uiContainer.add(hudBg);

  // 점수 텍스트
  this.scoreText = this.add.text(10, 10, 'Score: 0', {
    fontSize: '16px',
    color: '#ffffff'
  });
  this.uiContainer.add(this.scoreText);

  // 체력 바
  this.createHealthBar();
}

createHealthBar() {
  const barWidth = 200;
  const barHeight = 20;

  // 배경
  this.healthBarBg = this.add.rectangle(10, 40, barWidth, barHeight, 0x333333);
  this.healthBarBg.setOrigin(0, 0);
  this.uiContainer.add(this.healthBarBg);

  // 체력 바
  this.healthBar = this.add.rectangle(10, 40, barWidth, barHeight, 0xff0000);
  this.healthBar.setOrigin(0, 0);
  this.uiContainer.add(this.healthBar);
}
```

### 2. 버튼 컴포넌트

```javascript
class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, text, callback) {
    super(scene, x, y);

    this.callback = callback;

    // 배경
    this.background = scene.add.rectangle(0, 0, 200, 50, 0x4a90e2);
    this.background.setStrokeStyle(2, 0xffffff);
    this.add(this.background);

    // 텍스트
    this.text = scene.add
      .text(0, 0, text, {
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.add(this.text);

    // 인터랙션
    this.setSize(200, 50);
    this.setInteractive();

    this.on("pointerdown", () => this.onClick());
    this.on("pointerover", () => this.onHover());
    this.on("pointerout", () => this.onOut());

    scene.add.existing(this);
  }

  onClick() {
    this.background.setFillStyle(0x357abd);
    this.callback();
  }

  onHover() {
    this.background.setFillStyle(0x5ba0f2);
  }

  onOut() {
    this.background.setFillStyle(0x4a90e2);
  }
}
```

## 성능 최적화 패턴

### 1. 오브젝트 풀링

```javascript
class ObjectPool {
  constructor(scene, createFn, resetFn, initialSize = 10) {
    this.scene = scene;
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.pool = [];

    // 초기 풀 생성
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  get() {
    // 사용 가능한 오브젝트 찾기
    for (let obj of this.pool) {
      if (!obj.active) {
        obj.setActive(true);
        obj.setVisible(true);
        return obj;
      }
    }

    // 풀이 비어있으면 새로 생성
    const obj = this.createFn();
    this.pool.push(obj);
    return obj;
  }

  release(obj) {
    this.resetFn(obj);
    obj.setActive(false);
    obj.setVisible(false);
  }
}
```

### 2. 렌더링 최적화

```javascript
// 컨테이너 사용으로 드로우 콜 감소
this.enemyContainer = this.add.container(0, 0);

// 배치 업데이트
update() {
  // 매 프레임이 아닌 필요할 때만 업데이트
  if (this.needsUpdate) {
    this.updateEnemies();
    this.needsUpdate = false;
  }
}

// 불필요한 업데이트 방지
moveEnemy(enemy) {
  enemy.x += enemy.speed;
  this.needsUpdate = true; // 다음 프레임에 업데이트
}
```

### 3. 메모리 관리

```javascript
destroy() {
  // 이벤트 리스너 제거
  this.input.off('pointerdown');
  this.events.off('playerLevelUp');

  // 타이머 정리
  this.time.removeAllEvents();

  // 트윈 정리
  this.tweens.killAll();

  // 그룹 정리
  this.enemies.clear(true, true);

  // 부모 destroy 호출
  super.destroy();
}
```

이러한 패턴들을 사용하면 Phaser 3로 효율적이고 유지보수 가능한 게임을 개발할 수 있습니다.
