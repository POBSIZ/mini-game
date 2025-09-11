# 성능 최적화

GNG 프로젝트의 게임 성능 최적화 가이드라인과 베스트 프랙티스입니다.

## 📋 목차

- [성능 목표](#성능-목표)
- [렌더링 최적화](#렌더링-최적화)
- [메모리 관리](#메모리-관리)
- [물리 엔진 최적화](#물리-엔진-최적화)
- [오디오 최적화](#오디오-최적화)
- [네트워크 최적화](#네트워크-최적화)
- [프로파일링 도구](#프로파일링-도구)

## 성능 목표

### 1. 핵심 지표

| 지표          | 목표값  | 측정 방법        |
| ------------- | ------- | ---------------- |
| FPS           | 60fps   | Phaser 게임 루프 |
| 메모리 사용량 | < 100MB | Chrome DevTools  |
| 로딩 시간     | < 3초   | Network 탭       |
| 번들 크기     | < 1MB   | Build 결과       |
| 응답 시간     | < 100ms | 사용자 입력      |

### 2. 성능 모니터링

```javascript
// 성능 모니터 클래스
class PerformanceMonitor {
  constructor(scene) {
    this.scene = scene;
    this.metrics = {
      fps: 0,
      memory: 0,
      drawCalls: 0,
      updateTime: 0,
    };

    this.setupMonitoring();
  }

  setupMonitoring() {
    // FPS 모니터링
    this.scene.events.on("postupdate", () => {
      this.metrics.fps = this.scene.game.loop.actualFps;
    });

    // 메모리 모니터링
    if (performance.memory) {
      this.metrics.memory = performance.memory.usedJSHeapSize / 1024 / 1024;
    }

    // 드로우 콜 모니터링
    this.scene.events.on("prerender", () => {
      this.metrics.drawCalls = this.scene.renderer.drawCalls;
    });
  }

  logMetrics() {
    console.log("성능 지표:", this.metrics);
  }

  getPerformanceReport() {
    return {
      ...this.metrics,
      timestamp: Date.now(),
    };
  }
}
```

## 렌더링 최적화

### 1. 드로우 콜 최적화

```javascript
// 컨테이너 사용으로 드로우 콜 감소
class OptimizedRenderer {
  constructor(scene) {
    this.scene = scene;

    // 관련 오브젝트들을 컨테이너로 그룹화
    this.enemyContainer = this.scene.add.container(0, 0);
    this.itemContainer = this.scene.add.container(0, 0);
    this.effectContainer = this.scene.add.container(0, 0);
  }

  addEnemy(enemy) {
    // 개별 추가 대신 컨테이너에 추가
    this.enemyContainer.add(enemy);
  }

  removeEnemy(enemy) {
    this.enemyContainer.remove(enemy);
  }
}
```

### 2. 텍스처 아틀라스 사용

```javascript
// 텍스처 아틀라스 로딩
preload() {
  // 개별 이미지 로딩 (비효율적)
  // this.load.image('player', 'assets/player.png');
  // this.load.image('enemy1', 'assets/enemy1.png');
  // this.load.image('enemy2', 'assets/enemy2.png');

  // 텍스처 아틀라스 사용 (효율적)
  this.load.atlas('gameSprites', 'assets/sprites.png', 'assets/sprites.json');
}

create() {
  // 아틀라스에서 스프라이트 생성
  this.player = this.add.sprite(100, 100, 'gameSprites', 'player');
  this.enemy1 = this.add.sprite(200, 200, 'gameSprites', 'enemy1');
  this.enemy2 = this.add.sprite(300, 300, 'gameSprites', 'enemy2');
}
```

### 3. 배치 렌더링

```javascript
// 배치 렌더링 매니저
class BatchRenderer {
  constructor(scene) {
    this.scene = scene;
    this.batchGroups = new Map();
  }

  createBatchGroup(key, texture, maxSize = 1000) {
    const batchGroup = this.scene.add.group();
    batchGroup.texture = texture;
    batchGroup.maxSize = maxSize;
    this.batchGroups.set(key, batchGroup);
    return batchGroup;
  }

  addToBatch(batchKey, x, y, frame) {
    const batchGroup = this.batchGroups.get(batchKey);
    if (batchGroup && batchGroup.children.size < batchGroup.maxSize) {
      const sprite = this.scene.add.sprite(x, y, batchGroup.texture, frame);
      batchGroup.add(sprite);
      return sprite;
    }
    return null;
  }
}
```

### 4. 시야 절두체 컬링

```javascript
// 시야 절두체 컬링
class ViewportCulling {
  constructor(scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.culledObjects = new Set();
  }

  updateCulling() {
    const bounds = this.camera.getBounds();

    // 모든 게임 오브젝트에 대해 시야 체크
    this.scene.children.list.forEach((obj) => {
      if (this.isInViewport(obj, bounds)) {
        if (this.culledObjects.has(obj)) {
          obj.setVisible(true);
          this.culledObjects.delete(obj);
        }
      } else {
        if (!this.culledObjects.has(obj)) {
          obj.setVisible(false);
          this.culledObjects.add(obj);
        }
      }
    });
  }

  isInViewport(obj, bounds) {
    return (
      obj.x >= bounds.x - 100 &&
      obj.x <= bounds.x + bounds.width + 100 &&
      obj.y >= bounds.y - 100 &&
      obj.y <= bounds.y + bounds.height + 100
    );
  }
}
```

## 메모리 관리

### 1. 오브젝트 풀링

```javascript
// 오브젝트 풀 클래스
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

  clear() {
    this.pool.forEach((obj) => {
      obj.destroy();
    });
    this.pool = [];
  }
}

// 사용 예시
class BulletPool extends ObjectPool {
  constructor(scene) {
    super(
      scene,
      () => scene.add.sprite(0, 0, "bullet"), // 생성 함수
      (bullet) => {
        // 리셋 함수
        bullet.setPosition(0, 0);
        bullet.setVelocity(0, 0);
      },
      20 // 초기 크기
    );
  }
}
```

### 2. 메모리 누수 방지

```javascript
// 메모리 누수 방지 매니저
class MemoryLeakPrevention {
  constructor(scene) {
    this.scene = scene;
    this.eventListeners = new Map();
    this.timers = new Set();
  }

  // 이벤트 리스너 등록 (자동 정리용)
  addEventListener(target, event, callback) {
    if (!this.eventListeners.has(target)) {
      this.eventListeners.set(target, []);
    }

    target.on(event, callback);
    this.eventListeners.get(target).push({ event, callback });
  }

  // 타이머 등록 (자동 정리용)
  addTimer(callback, delay) {
    const timer = this.scene.time.delayedCall(delay, callback);
    this.timers.add(timer);
    return timer;
  }

  // 정리 작업
  cleanup() {
    // 이벤트 리스너 정리
    this.eventListeners.forEach((listeners, target) => {
      listeners.forEach(({ event, callback }) => {
        target.off(event, callback);
      });
    });
    this.eventListeners.clear();

    // 타이머 정리
    this.timers.forEach((timer) => {
      timer.destroy();
    });
    this.timers.clear();
  }
}
```

### 3. 가비지 컬렉션 최적화

```javascript
// 가비지 컬렉션 최적화
class GCOptimizer {
  constructor(scene) {
    this.scene = scene;
    this.objectCache = new Map();
    this.lastGCTime = 0;
    this.gcInterval = 30000; // 30초마다 GC 힌트
  }

  update() {
    const now = Date.now();

    // 주기적으로 GC 힌트 제공
    if (now - this.lastGCTime > this.gcInterval) {
      this.hintGC();
      this.lastGCTime = now;
    }
  }

  hintGC() {
    // 명시적 GC 힌트 (브라우저가 지원하는 경우)
    if (window.gc) {
      window.gc();
    }

    // 캐시 정리
    this.cleanupCache();
  }

  cleanupCache() {
    // 사용하지 않는 오브젝트 캐시 정리
    this.objectCache.forEach((obj, key) => {
      if (!obj.active) {
        this.objectCache.delete(key);
      }
    });
  }
}
```

## 물리 엔진 최적화

### 1. 충돌 최적화

```javascript
// 충돌 최적화 매니저
class CollisionOptimizer {
  constructor(scene) {
    this.scene = scene;
    this.collisionGroups = new Map();
    this.spatialHash = new Map();
    this.cellSize = 64;
  }

  // 공간 해시 테이블 생성
  updateSpatialHash() {
    this.spatialHash.clear();

    this.scene.physics.world.bodies.entries.forEach((body) => {
      const cellX = Math.floor(body.x / this.cellSize);
      const cellY = Math.floor(body.y / this.cellSize);
      const key = `${cellX},${cellY}`;

      if (!this.spatialHash.has(key)) {
        this.spatialHash.set(key, []);
      }
      this.spatialHash.get(key).push(body);
    });
  }

  // 근처 오브젝트만 충돌 검사
  checkNearbyCollisions(body) {
    const cellX = Math.floor(body.x / this.cellSize);
    const cellY = Math.floor(body.y / this.cellSize);
    const nearbyBodies = [];

    // 주변 9개 셀만 검사
    for (let x = cellX - 1; x <= cellX + 1; x++) {
      for (let y = cellY - 1; y <= cellY + 1; y++) {
        const key = `${x},${y}`;
        if (this.spatialHash.has(key)) {
          nearbyBodies.push(...this.spatialHash.get(key));
        }
      }
    }

    return nearbyBodies;
  }
}
```

### 2. 물리 바디 최적화

```javascript
// 물리 바디 최적화
class PhysicsOptimizer {
  constructor(scene) {
    this.scene = scene;
    this.staticBodies = new Set();
    this.dynamicBodies = new Set();
  }

  // 정적 바디 최적화
  optimizeStaticBody(body) {
    body.setImmovable(true);
    body.setCollideWorldBounds(false);
    body.setBounce(0);
    body.setDrag(0);
    this.staticBodies.add(body);
  }

  // 동적 바디 최적화
  optimizeDynamicBody(body) {
    body.setCollideWorldBounds(true);
    body.setBounce(0.2);
    body.setDrag(100);
    this.dynamicBodies.add(body);
  }

  // 불필요한 물리 계산 비활성화
  disablePhysicsForInactive(body) {
    if (!body.gameObject.active) {
      body.enable = false;
    }
  }
}
```

## 오디오 최적화

### 1. 오디오 풀링

```javascript
// 오디오 풀 매니저
class AudioPoolManager {
  constructor(scene) {
    this.scene = scene;
    this.audioPools = new Map();
    this.maxConcurrentSounds = 8;
  }

  createAudioPool(key, path, poolSize = 5) {
    const pool = [];

    for (let i = 0; i < poolSize; i++) {
      const sound = this.scene.sound.add(key, { volume: 0.5 });
      pool.push(sound);
    }

    this.audioPools.set(key, pool);
    return pool;
  }

  playSound(key, config = {}) {
    const pool = this.audioPools.get(key);
    if (!pool) return null;

    // 사용 가능한 사운드 찾기
    for (let sound of pool) {
      if (!sound.isPlaying) {
        sound.play(config);
        return sound;
      }
    }

    // 모든 사운드가 재생 중이면 가장 오래된 것 재사용
    const oldestSound = pool[0];
    oldestSound.stop();
    oldestSound.play(config);
    return oldestSound;
  }
}
```

### 2. 오디오 압축

```javascript
// 오디오 압축 설정
const audioConfig = {
  // MP3 설정
  mp3: {
    bitrate: 128, // kbps
    sampleRate: 44100,
    channels: 2,
  },

  // OGG 설정
  ogg: {
    bitrate: 96, // kbps
    sampleRate: 44100,
    channels: 2,
  },

  // WAV 설정 (음성용)
  wav: {
    bitDepth: 16,
    sampleRate: 44100,
    channels: 1,
  },
};
```

## 네트워크 최적화

### 1. 리소스 압축

```javascript
// Vite 설정으로 압축 최적화
// vite.config.js
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
  server: {
    // Gzip 압축
    middlewareMode: false,
    hmr: {
      overlay: false,
    },
  },
};
```

### 2. 지연 로딩

```javascript
// 지연 로딩 매니저
class LazyLoader {
  constructor(scene) {
    this.scene = scene;
    this.loadingQueue = [];
    this.isLoading = false;
  }

  addToQueue(assetType, key, path, priority = "normal") {
    this.loadingQueue.push({ assetType, key, path, priority });
    this.loadingQueue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
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
}
```

## 프로파일링 도구

### 1. 성능 프로파일러

```javascript
// 성능 프로파일러
class PerformanceProfiler {
  constructor(scene) {
    this.scene = scene;
    this.profiles = new Map();
    this.isProfiling = false;
  }

  startProfile(name) {
    if (this.isProfiling) {
      this.profiles.set(name, {
        startTime: performance.now(),
        startMemory: performance.memory ? performance.memory.usedJSHeapSize : 0,
      });
    }
  }

  endProfile(name) {
    if (this.isProfiling && this.profiles.has(name)) {
      const profile = this.profiles.get(name);
      const endTime = performance.now();
      const endMemory = performance.memory
        ? performance.memory.usedJSHeapSize
        : 0;

      const result = {
        duration: endTime - profile.startTime,
        memoryDelta: endMemory - profile.startMemory,
        timestamp: Date.now(),
      };

      console.log(`프로파일 [${name}]:`, result);
      this.profiles.delete(name);
      return result;
    }
  }

  toggleProfiling() {
    this.isProfiling = !this.isProfiling;
    console.log("프로파일링:", this.isProfiling ? "활성화" : "비활성화");
  }
}
```

### 2. 메모리 사용량 모니터링

```javascript
// 메모리 모니터
class MemoryMonitor {
  constructor() {
    this.memoryHistory = [];
    this.maxHistorySize = 100;
  }

  update() {
    if (performance.memory) {
      const memoryInfo = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        timestamp: Date.now(),
      };

      this.memoryHistory.push(memoryInfo);

      // 히스토리 크기 제한
      if (this.memoryHistory.length > this.maxHistorySize) {
        this.memoryHistory.shift();
      }

      // 메모리 사용량 경고
      if (memoryInfo.used > memoryInfo.limit * 0.8) {
        console.warn("메모리 사용량이 높습니다:", memoryInfo);
      }
    }
  }

  getMemoryReport() {
    if (this.memoryHistory.length === 0) return null;

    const latest = this.memoryHistory[this.memoryHistory.length - 1];
    const average =
      this.memoryHistory.reduce((sum, info) => sum + info.used, 0) /
      this.memoryHistory.length;

    return {
      current: latest.used,
      average: average,
      peak: Math.max(...this.memoryHistory.map((info) => info.used)),
      trend: this.calculateTrend(),
    };
  }

  calculateTrend() {
    if (this.memoryHistory.length < 2) return 0;

    const recent = this.memoryHistory.slice(-10);
    const first = recent[0].used;
    const last = recent[recent.length - 1].used;

    return (last - first) / first;
  }
}
```

### 3. 성능 벤치마크

```javascript
// 성능 벤치마크
class PerformanceBenchmark {
  constructor(scene) {
    this.scene = scene;
    this.benchmarks = new Map();
  }

  async runBenchmark(name, testFn, iterations = 100) {
    const results = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await testFn();
      const endTime = performance.now();

      results.push(endTime - startTime);
    }

    const benchmark = {
      name,
      iterations,
      average: results.reduce((sum, time) => sum + time, 0) / results.length,
      min: Math.min(...results),
      max: Math.max(...results),
      median: results.sort((a, b) => a - b)[Math.floor(results.length / 2)],
    };

    this.benchmarks.set(name, benchmark);
    console.log(`벤치마크 [${name}]:`, benchmark);

    return benchmark;
  }

  compareBenchmarks(name1, name2) {
    const bench1 = this.benchmarks.get(name1);
    const bench2 = this.benchmarks.get(name2);

    if (!bench1 || !bench2) {
      console.error("벤치마크를 찾을 수 없습니다");
      return;
    }

    const improvement =
      ((bench1.average - bench2.average) / bench1.average) * 100;
    console.log(
      `${name2}가 ${name1}보다 ${improvement.toFixed(2)}% ${
        improvement > 0 ? "빠름" : "느림"
      }`
    );
  }
}
```

이러한 성능 최적화 기법들을 적용하면 GNG 게임의 성능을 크게 향상시킬 수 있습니다.
