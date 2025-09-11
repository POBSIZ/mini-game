# 에셋 관리

GNG 프로젝트의 게임 에셋 관리 규칙과 최적화 가이드라인입니다.

## 📋 목차

- [에셋 폴더 구조](#에셋-폴더-구조)
- [이미지 에셋 관리](#이미지-에셋-관리)
- [사운드 에셋 관리](#사운드-에셋-관리)
- [데이터 파일 관리](#데이터-파일-관리)
- [에셋 최적화](#에셋-최적화)
- [버전 관리](#버전-관리)

## 에셋 폴더 구조

```
public/
└── assets/
    ├── images/                 # 이미지 에셋
    │   ├── characters/         # 캐릭터 스프라이트
    │   │   ├── player/
    │   │   ├── enemies/
    │   │   └── npcs/
    │   ├── environments/       # 환경 에셋
    │   │   ├── tiles/
    │   │   ├── backgrounds/
    │   │   └── props/
    │   ├── ui/                 # UI 에셋
    │   │   ├── buttons/
    │   │   ├── icons/
    │   │   └── panels/
    │   └── effects/            # 이펙트 에셋
    │       ├── particles/
    │       └── animations/
    ├── audio/                  # 오디오 에셋
    │   ├── music/              # 배경음악
    │   ├── sfx/                # 효과음
    │   └── voice/              # 음성
    ├── data/                   # 데이터 파일
    │   ├── levels/             # 레벨 데이터
    │   ├── configs/            # 설정 파일
    │   └── localizations/      # 다국어 지원
    └── fonts/                  # 폰트 파일
        ├── game-font.woff2
        └── ui-font.woff2
```

## 이미지 에셋 관리

### 1. 파일 명명 규칙

```
✅ 좋은 예
- player-idle.png
- enemy-goblin-walk-01.png
- tile-grass-01.png
- ui-button-start.png
- effect-explosion-01.png

❌ 나쁜 예
- Player.png
- enemy_goblin.png
- tile01.png
- button.png
- explosion.png
```

### 2. 이미지 최적화

#### 텍스처 아틀라스 사용

```javascript
// 개별 이미지 로딩 (비효율적)
this.load.image("player", "assets/images/characters/player.png");
this.load.image("enemy1", "assets/images/characters/enemy1.png");
this.load.image("enemy2", "assets/images/characters/enemy2.png");

// 텍스처 아틀라스 사용 (효율적)
this.load.atlas(
  "characters",
  "assets/images/characters/atlas.png",
  "assets/images/characters/atlas.json"
);
```

#### 스프라이트 시트 설정

```javascript
// 애니메이션용 스프라이트 시트
this.load.spritesheet(
  "playerAnim",
  "assets/images/characters/player-sheet.png",
  {
    frameWidth: 32,
    frameHeight: 32,
    endFrame: 7,
  }
);
```

### 3. 이미지 포맷 가이드라인

| 용도              | 포맷 | 최적 크기      | 압축률 |
| ----------------- | ---- | -------------- | ------ |
| UI 아이콘         | PNG  | 16x16, 32x32   | 무손실 |
| 캐릭터 스프라이트 | PNG  | 32x32, 64x64   | 무손실 |
| 배경 이미지       | JPG  | 1920x1080      | 80-90% |
| 파티클 효과       | PNG  | 64x64, 128x128 | 무손실 |

### 4. 이미지 로딩 패턴

```javascript
// 이미지 로딩 매니저
class ImageLoader {
  constructor(scene) {
    this.scene = scene;
    this.loadedImages = new Map();
  }

  async loadImage(key, path) {
    if (this.loadedImages.has(key)) {
      return this.loadedImages.get(key);
    }

    return new Promise((resolve, reject) => {
      this.scene.load.once("filecomplete-image-" + key, () => {
        const image = this.scene.textures.get(key);
        this.loadedImages.set(key, image);
        resolve(image);
      });

      this.scene.load.once("loaderror", (file) => {
        reject(new Error(`이미지 로딩 실패: ${file.key}`));
      });

      this.scene.load.image(key, path);
      this.scene.load.start();
    });
  }
}
```

## 사운드 에셋 관리

### 1. 오디오 포맷 가이드라인

| 용도     | 포맷 | 비트레이트 | 샘플레이트 |
| -------- | ---- | ---------- | ---------- |
| 배경음악 | MP3  | 128kbps    | 44.1kHz    |
| 효과음   | OGG  | 96kbps     | 44.1kHz    |
| 음성     | WAV  | 16bit      | 44.1kHz    |

### 2. 사운드 로딩 패턴

```javascript
// 사운드 매니저
class SoundManager {
  constructor(scene) {
    this.scene = scene;
    this.sounds = new Map();
    this.musicVolume = 0.7;
    this.sfxVolume = 0.8;
  }

  loadSound(key, path, config = {}) {
    this.scene.load.audio(key, path, config);
  }

  playSound(key, config = {}) {
    if (this.sounds.has(key)) {
      const sound = this.sounds.get(key);
      sound.volume = this.sfxVolume * (config.volume || 1);
      sound.play(config);
    }
  }

  playMusic(key, config = {}) {
    if (this.sounds.has(key)) {
      const music = this.sounds.get(key);
      music.volume = this.musicVolume * (config.volume || 1);
      music.play({
        loop: true,
        ...config,
      });
    }
  }

  stopAllSounds() {
    this.sounds.forEach((sound) => sound.stop());
  }
}
```

### 3. 오디오 최적화

```javascript
// 오디오 풀링
class AudioPool {
  constructor(scene, soundKey, poolSize = 5) {
    this.scene = scene;
    this.soundKey = soundKey;
    this.pool = [];

    // 사운드 풀 생성
    for (let i = 0; i < poolSize; i++) {
      const sound = this.scene.sound.add(soundKey);
      this.pool.push(sound);
    }
  }

  play() {
    // 사용 가능한 사운드 찾기
    for (let sound of this.pool) {
      if (!sound.isPlaying) {
        sound.play();
        return sound;
      }
    }

    // 모든 사운드가 재생 중이면 첫 번째 사운드 재사용
    this.pool[0].play();
    return this.pool[0];
  }
}
```

## 데이터 파일 관리

### 1. JSON 데이터 구조

```javascript
// levels/level01.json
{
  "id": "level01",
  "name": "첫 번째 던전",
  "width": 20,
  "height": 15,
  "tiles": [
    // 타일 데이터
  ],
  "enemies": [
    {
      "type": "goblin",
      "x": 5,
      "y": 3,
      "health": 50
    }
  ],
  "items": [
    {
      "type": "health_potion",
      "x": 10,
      "y": 8
    }
  ]
}
```

### 2. 설정 파일 관리

```javascript
// configs/game-config.json
{
  "game": {
    "title": "GNG",
    "version": "1.0.0",
    "maxLevel": 10
  },
  "player": {
    "startHealth": 100,
    "startLevel": 1,
    "moveSpeed": 200
  },
  "graphics": {
    "tileSize": 32,
    "viewWidth": 20,
    "viewHeight": 15
  }
}
```

### 3. 데이터 로딩 패턴

```javascript
// 데이터 로더
class DataLoader {
  constructor(scene) {
    this.scene = scene;
    this.cache = new Map();
  }

  async loadData(key, path) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    return new Promise((resolve, reject) => {
      this.scene.load.once("filecomplete-json-" + key, () => {
        const data = this.scene.cache.json.get(key);
        this.cache.set(key, data);
        resolve(data);
      });

      this.scene.load.once("loaderror", (file) => {
        reject(new Error(`데이터 로딩 실패: ${file.key}`));
      });

      this.scene.load.json(key, path);
      this.scene.load.start();
    });
  }
}
```

## 에셋 최적화

### 1. 이미지 최적화 도구

```bash
# ImageMagick을 사용한 이미지 최적화
# PNG 압축
magick input.png -strip -define png:compression-level=9 output.png

# JPG 압축
magick input.jpg -strip -quality 85 output.jpg

# WebP 변환
magick input.png -define webp:lossless=true output.webp
```

### 2. 텍스처 아틀라스 생성

```javascript
// TexturePacker 설정 (texturepacker.json)
{
  "texture": {
    "width": 1024,
    "height": 1024,
    "format": "png",
    "compression": "png"
  },
  "sprites": {
    "path": "assets/images/characters/",
    "pattern": "*.png"
  },
  "output": {
    "path": "assets/images/characters/atlas.png",
    "data": "assets/images/characters/atlas.json"
  }
}
```

### 3. 번들 크기 최적화

```javascript
// Vite 설정 (vite.config.js)
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
          "game-data": ["./src/data/GameData.js"],
          "utils": ["./src/utils/Utils.js"],
        },
      },
    },
    assetsInlineLimit: 4096, // 4KB 이하 에셋은 인라인화
    chunkSizeWarningLimit: 1000,
  },
};
```

## 버전 관리

### 1. 에셋 버전 관리

```javascript
// 에셋 버전 관리 시스템
class AssetVersionManager {
  constructor() {
    this.versions = new Map();
    this.loadVersionManifest();
  }

  loadVersionManifest() {
    // 버전 매니페스트 로딩
    fetch("/assets/version-manifest.json")
      .then((response) => response.json())
      .then((manifest) => {
        this.versions = new Map(Object.entries(manifest));
      });
  }

  getAssetPath(assetKey) {
    const version = this.versions.get(assetKey) || "1.0.0";
    return `/assets/${assetKey}?v=${version}`;
  }
}
```

### 2. 캐시 무효화

```javascript
// 캐시 무효화 전략
class CacheManager {
  constructor() {
    this.cacheVersion = "1.0.0";
    this.cachePrefix = "gng_";
  }

  getCacheKey(key) {
    return `${this.cachePrefix}${key}_${this.cacheVersion}`;
  }

  clearOldCache() {
    // 이전 버전 캐시 정리
    Object.keys(localStorage).forEach((key) => {
      if (
        key.startsWith(this.cachePrefix) &&
        !key.includes(this.cacheVersion)
      ) {
        localStorage.removeItem(key);
      }
    });
  }
}
```

### 3. 에셋 무결성 검증

```javascript
// 에셋 무결성 검증
class AssetIntegrityChecker {
  constructor() {
    this.checksums = new Map();
  }

  async verifyAsset(assetPath, expectedChecksum) {
    try {
      const response = await fetch(assetPath);
      const arrayBuffer = await response.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      return hashHex === expectedChecksum;
    } catch (error) {
      console.error("에셋 무결성 검증 실패:", error);
      return false;
    }
  }
}
```

## 에셋 로딩 전략

### 1. 지연 로딩

```javascript
// 지연 로딩 매니저
class LazyLoader {
  constructor(scene) {
    this.scene = scene;
    this.loadingQueue = [];
    this.isLoading = false;
  }

  addToQueue(assetType, key, path) {
    this.loadingQueue.push({ assetType, key, path });
  }

  async loadNext() {
    if (this.isLoading || this.loadingQueue.length === 0) {
      return;
    }

    this.isLoading = true;
    const { assetType, key, path } = this.loadingQueue.shift();

    try {
      await this.loadAsset(assetType, key, path);
    } catch (error) {
      console.error("에셋 로딩 실패:", error);
    } finally {
      this.isLoading = false;
      // 다음 에셋 로딩
      this.loadNext();
    }
  }

  async loadAsset(assetType, key, path) {
    return new Promise((resolve, reject) => {
      const loadEvent = `filecomplete-${assetType}-${key}`;

      this.scene.load.once(loadEvent, () => resolve());
      this.scene.load.once("loaderror", (file) => reject(file));

      switch (assetType) {
        case "image":
          this.scene.load.image(key, path);
          break;
        case "audio":
          this.scene.load.audio(key, path);
          break;
        case "json":
          this.scene.load.json(key, path);
          break;
      }

      this.scene.load.start();
    });
  }
}
```

### 2. 우선순위 로딩

```javascript
// 우선순위 기반 로딩
class PriorityLoader {
  constructor(scene) {
    this.scene = scene;
    this.priorities = {
      critical: 1, // 필수 에셋
      high: 2, // 중요 에셋
      medium: 3, // 일반 에셋
      low: 4, // 선택적 에셋
    };
  }

  loadWithPriority(assets) {
    // 우선순위별로 정렬
    const sortedAssets = assets.sort(
      (a, b) => this.priorities[a.priority] - this.priorities[b.priority]
    );

    // 우선순위 순서대로 로딩
    sortedAssets.forEach((asset) => {
      this.loadAsset(asset);
    });
  }
}
```

이러한 에셋 관리 규칙을 따르면 게임의 로딩 성능을 최적화하고 유지보수성을 향상시킬 수 있습니다.
