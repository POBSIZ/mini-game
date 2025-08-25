// ===== 게임 변수들 =====
let scene, camera, renderer, player, maze, goalBlock;
let gameState = "menu"; // 'menu', 'playing', 'won', 'complete'
let currentLevel = 1;
let maxLevel = 5;
let startTime,
  gameTime = 0;
let totalTime = 0;
let animationId;

// ===== 미로 데이터 저장 =====
let currentMazeData = null;
let currentLevelSize = 0;

// ===== 게임 설정 =====
const MAZE_SIZE = 15; // 미로 크기 (홀수여야 함)
const CELL_SIZE = 2;
const WALL_HEIGHT = 3;
const PLAYER_SIZE = 0.3;
const PLAYER_SPEED = 0.08; // 프레임 드랍에도 안전하게 처리
const PLAYER_RADIUS = Math.min(0.35, CELL_SIZE * 0.25); // 원형 히트박스 반지름

// ===== 충돌 안정화(흔들림 방지) 설정 =====
const CONTACT_OFFSET = 0.02; // 벽과 항상 이만큼 띄워둠(스킨 폭)

// ===== 1인칭 시점 관련 변수 =====
let isPointerLocked = false;
let pitch = 0; // 상하 회전
let yaw = 0; // 좌우 회전
const maxPitch = Math.PI / 3; // 위/아래 회전 제한 (60도)

// ===== 플레이어 입력 =====
const keys = { forward: false, backward: false, left: false, right: false };

// ===== 미로 생성 클래스 =====
class MazeGenerator {
  constructor(size) {
    this.size = size;
    this.maze = [];
    this.initialize();
    this.generate();
  }
  initialize() {
    for (let i = 0; i < this.size; i++) {
      this.maze[i] = [];
      for (let j = 0; j < this.size; j++) this.maze[i][j] = 1; // 1=벽, 0=통로
    }
  }
  generate() {
    const stack = [];
    const start = [1, 1];
    this.maze[start[0]][start[1]] = 0;
    stack.push(start);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(current);

      if (neighbors.length > 0) {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        const wall = [
          current[0] + (next[0] - current[0]) / 2,
          current[1] + (next[1] - current[1]) / 2,
        ];
        this.maze[next[0]][next[1]] = 0;
        this.maze[wall[0]][wall[1]] = 0;
        stack.push(next);
      } else {
        stack.pop();
      }
    }

    // 출구(우하단 근처)
    this.maze[this.size - 2][this.size - 2] = 0;
  }
  getUnvisitedNeighbors(cell) {
    const neighbors = [];
    const directions = [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ];
    for (const [dr, dc] of directions) {
      const nr = cell[0] + dr,
        nc = cell[1] + dc;
      if (
        nr > 0 &&
        nr < this.size - 1 &&
        nc > 0 &&
        nc < this.size - 1 &&
        this.maze[nr][nc] === 1
      ) {
        neighbors.push([nr, nc]);
      }
    }
    return neighbors;
  }
  getMaze() {
    return this.maze;
  }
}

// ===== 초기화 =====
function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x001122);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 5, 5);

  const canvas = document.getElementById("game-canvas");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  setupLighting();
  setupEventListeners();
  createMaze();
  createPlayer();
  animate();
}

function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 20, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 20;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -20;
  scene.add(directionalLight);

  const playerLight = new THREE.PointLight(0x4ecdc4, 0.8, 8);
  playerLight.position.set(0, 2, 0);
  scene.add(playerLight);
  window.playerLight = playerLight;
}

function createMaze() {
  if (maze) scene.remove(maze);
  maze = new THREE.Group();

  currentLevelSize = Math.min(MAZE_SIZE + (currentLevel - 1) * 2, 25);
  const mazeGenerator = new MazeGenerator(currentLevelSize);
  currentMazeData = mazeGenerator.getMaze();

  // 바닥
  const floorGeometry = new THREE.PlaneGeometry(
    currentLevelSize * CELL_SIZE,
    currentLevelSize * CELL_SIZE
  );
  const floorMaterial = new THREE.MeshLambertMaterial({
    color: 0x333333,
    transparent: true,
    opacity: 0.8,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(
    ((currentLevelSize - 1) * CELL_SIZE) / 2,
    0,
    ((currentLevelSize - 1) * CELL_SIZE) / 2
  );
  floor.receiveShadow = true;
  maze.add(floor);

  // 벽
  const wallGeometry = new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, CELL_SIZE);
  const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
  for (let i = 0; i < currentLevelSize; i++) {
    for (let j = 0; j < currentLevelSize; j++) {
      if (currentMazeData[i][j] === 1) {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(j * CELL_SIZE, WALL_HEIGHT / 2, i * CELL_SIZE);
        wall.castShadow = true;
        wall.receiveShadow = true;
        maze.add(wall);
      }
    }
  }

  // 목표
  if (goalBlock) scene.remove(goalBlock);
  const goalGeometry = new THREE.BoxGeometry(
    CELL_SIZE * 0.8,
    0.5,
    CELL_SIZE * 0.8
  );
  const goalMaterial = new THREE.MeshLambertMaterial({
    color: 0xff4444,
    emissive: 0x442222,
  });
  goalBlock = new THREE.Mesh(goalGeometry, goalMaterial);
  goalBlock.position.set(
    (currentLevelSize - 2) * CELL_SIZE,
    0.25,
    (currentLevelSize - 2) * CELL_SIZE
  );
  goalBlock.castShadow = true;
  scene.add(goalBlock);

  scene.add(maze);

  // 플레이어 시작 위치(첫 통로 중앙)
  if (player) {
    let startX = 1 * CELL_SIZE + CELL_SIZE * 0.5;
    let startZ = 1 * CELL_SIZE + CELL_SIZE * 0.5;
    let startGridX = 1,
      startGridZ = 1;

    let found = false;
    for (let i = 1; i < currentLevelSize - 1 && !found; i += 2) {
      for (let j = 1; j < currentLevelSize - 1 && !found; j += 2) {
        if (currentMazeData[i][j] === 0) {
          startX = j * CELL_SIZE + CELL_SIZE * 0.5;
          startZ = i * CELL_SIZE + CELL_SIZE * 0.5;
          startGridX = j;
          startGridZ = i;
          found = true;
        }
      }
    }

    player.position.set(startX, 1.6, startZ);
    const openDirection = findOpenDirection(startGridX, startGridZ);
    yaw = openDirection.yaw;
    pitch = 0;
  }
}

// 시작 위치에서 빈공간을 향하는 방향
function findOpenDirection(gridX, gridZ) {
  const dirs = [
    { dx: 0, dz: -1, yaw: 0 }, // 북
    { dx: 1, dz: 0, yaw: -Math.PI / 2 }, // 동
    { dx: 0, dz: 1, yaw: Math.PI }, // 남
    { dx: -1, dz: 0, yaw: Math.PI / 2 }, // 서
  ];
  for (const d of dirs) {
    const cx = gridX + d.dx,
      cz = gridZ + d.dz;
    if (
      cx >= 0 &&
      cx < currentLevelSize &&
      cz >= 0 &&
      cz < currentLevelSize &&
      currentMazeData[cz][cx] === 0
    ) {
      return { yaw: d.yaw };
    }
  }
  return { yaw: 0 };
}

// ===== 플레이어 생성 =====
function createPlayer() {
  const playerGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const playerMaterial = new THREE.MeshBasicMaterial({ visible: false });
  player = new THREE.Mesh(playerGeometry, playerMaterial);
  player.position.set(
    1 * CELL_SIZE + CELL_SIZE / 2,
    1.6,
    1 * CELL_SIZE + CELL_SIZE / 2
  );
  scene.add(player);
  updateCamera(true); // 즉시 반영
}

// ===== 카메라 =====
// smoothing=true: 위치만 약간 스무딩(잔떨림 저감), 회전은 즉시
function updateCamera(immediate = false) {
  if (!player) return;
  if (immediate) {
    camera.position.copy(player.position);
  } else {
    camera.position.lerp(player.position, 0.18); // 스무딩 정도
  }
  camera.rotation.order = "YXZ";
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}

// ===== 이벤트 =====
function setupEventListeners() {
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  document.addEventListener("click", requestPointerLock);
  document.addEventListener("pointerlockchange", onPointerLockChange);
  document.addEventListener("mousemove", onMouseMove);

  document.getElementById("start-button").addEventListener("click", startGame);
  document
    .getElementById("next-level-button")
    .addEventListener("click", nextLevel);
  document
    .getElementById("restart-button")
    .addEventListener("click", restartGame);
  document
    .getElementById("play-again-button")
    .addEventListener("click", restartGame);

  window.addEventListener("resize", onWindowResize);
}

function requestPointerLock() {
  if (gameState === "playing") renderer.domElement.requestPointerLock();
}
function onPointerLockChange() {
  isPointerLocked = document.pointerLockElement === renderer.domElement;
}
function onMouseMove(event) {
  if (!isPointerLocked || gameState !== "playing") return;
  const sensitivity = 0.002;
  yaw -= event.movementX * sensitivity;
  pitch -= event.movementY * sensitivity;
  pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));
  updateCamera(true); // 회전은 즉시 반영
}
function onKeyDown(event) {
  if (gameState !== "playing") return;
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      keys.forward = true;
      break;
    case "ArrowDown":
    case "KeyS":
      keys.backward = true;
      break;
    case "ArrowLeft":
    case "KeyA":
      keys.left = true;
      break;
    case "ArrowRight":
    case "KeyD":
      keys.right = true;
      break;
    case "Escape":
      if (isPointerLocked) document.exitPointerLock();
      break;
  }
}
function onKeyUp(event) {
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      keys.forward = false;
      break;
    case "ArrowDown":
    case "KeyS":
      keys.backward = false;
      break;
    case "ArrowLeft":
    case "KeyA":
      keys.left = false;
      break;
    case "ArrowRight":
    case "KeyD":
      keys.right = false;
      break;
  }
}
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ===== UI/게임 상태 =====
function startGame() {
  gameState = "playing";
  startTime = Date.now();
  document.getElementById("start-screen").classList.add("hidden");
  updateUI();
}
function nextLevel() {
  currentLevel++;
  if (currentLevel > maxLevel) {
    gameComplete();
    return;
  }
  totalTime += gameTime;
  gameState = "playing";
  startTime = Date.now();
  createMaze();
  updateCamera(true);
  document.getElementById("win-screen").classList.add("hidden");
  updateUI();
}
function restartGame() {
  currentLevel = 1;
  totalTime = 0;
  gameTime = 0;
  gameState = "playing";
  startTime = Date.now();
  createMaze();
  updateCamera(true);
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("win-screen").classList.add("hidden");
  document.getElementById("game-over-screen").classList.add("hidden");
  updateUI();
}
function levelComplete() {
  gameState = "won";
  gameTime = (Date.now() - startTime) / 1000;
  document.getElementById("completion-time").textContent = gameTime.toFixed(1);
  document.getElementById("win-screen").classList.remove("hidden");
}
function gameComplete() {
  gameState = "complete";
  const finalTime = totalTime + gameTime;
  document.getElementById("total-time").textContent = finalTime.toFixed(1);
  document.getElementById("game-over-screen").classList.remove("hidden");
}
function updateUI() {
  if (gameState === "playing") {
    gameTime = (Date.now() - startTime) / 1000;
    document.getElementById("time").textContent = gameTime.toFixed(1);
  }
  document.getElementById("current-level").textContent = currentLevel;
}

// ===== 충돌 유틸 (원 vs AABB) =====
function isWallCell(gz, gx) {
  if (gx < 0 || gx >= currentLevelSize || gz < 0 || gz >= currentLevelSize)
    return true; // 바깥=벽
  return (
    currentMazeData && currentMazeData[gz] && currentMazeData[gz][gx] === 1
  );
}
function getCellAABB(gx, gz) {
  const cx = gx * CELL_SIZE; // 벽 메쉬 중심
  const cz = gz * CELL_SIZE;
  const hs = CELL_SIZE / 2;
  return { minX: cx - hs, maxX: cx + hs, minZ: cz - hs, maxZ: cz + hs };
}

// ===== 축별 스윕 클램프 (원 vs AABB) =====
// axis: 'x' | 'z', from: 현재 축 좌표, to: 목표 축 좌표, other: 다른 축 좌표
function sweepAxisClamp(axis, from, to, other) {
  let result = to;
  const dir = Math.sign(to - from); // +1 / -1 / 0
  if (dir === 0) return result;

  // 주변 몇 칸만 확인 (성능/안정성 밸런스)
  const cgx = Math.floor((axis === "x" ? to : other) / CELL_SIZE);
  const cgz = Math.floor((axis === "z" ? to : other) / CELL_SIZE);

  for (let gz = cgz - 2; gz <= cgz + 2; gz++) {
    for (let gx = cgx - 2; gx <= cgx + 2; gx++) {
      if (!isWallCell(gz, gx)) continue;
      const aabb = getCellAABB(gx, gz);
      const r = PLAYER_RADIUS + CONTACT_OFFSET; // 스킨폭 포함 반지름

      if (axis === "x") {
        // Z가 맞닿을 수 있는 범위여야 X축 충돌 후보
        if (other >= aabb.minZ - r && other <= aabb.maxZ + r) {
          // +X로 이동하며 벽의 왼쪽면에 닿는 경우
          if (dir > 0 && result > aabb.minX - r && from <= aabb.minX) {
            result = Math.min(result, aabb.minX - r);
          }
          // -X로 이동하며 벽의 오른쪽면에 닿는 경우
          else if (dir < 0 && result < aabb.maxX + r && from >= aabb.maxX) {
            result = Math.max(result, aabb.maxX + r);
          }
        }
      } else {
        // X가 맞닿을 수 있는 범위여야 Z축 충돌 후보
        if (other >= aabb.minX - r && other <= aabb.maxX + r) {
          // +Z로 이동하며 벽의 위쪽면에 닿는 경우
          if (dir > 0 && result > aabb.minZ - r && from <= aabb.minZ) {
            result = Math.min(result, aabb.minZ - r);
          }
          // -Z로 이동하며 벽의 아래쪽면에 닿는 경우
          else if (dir < 0 && result < aabb.maxZ + r && from >= aabb.maxZ) {
            result = Math.max(result, aabb.maxZ + r);
          }
        }
      }
    }
  }
  return result;
}

// ===== 이동 (축 분리 스윕으로 코너/벽 떨림 제거) =====
function moveWithSliding(targetX, targetZ) {
  const sx = player.position.x;
  const sz = player.position.z;

  // ① X축만 이동하면서 벽에 닿으면 그 지점에서 클램프
  const nx = sweepAxisClamp("x", sx, targetX, sz);

  // ② Z축만 이동하면서 벽에 닿으면 그 지점에서 클램프
  const nz = sweepAxisClamp("z", sz, targetZ, nx);

  player.position.x = nx;
  player.position.z = nz;
}

// ===== 매 프레임 업데이트 =====
function updatePlayer() {
  if (gameState !== "playing") return;

  const moveDistance = PLAYER_SPEED;

  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

  const dir = new THREE.Vector3();
  if (keys.forward) dir.add(forward);
  if (keys.backward) dir.sub(forward);
  if (keys.left) dir.sub(right);
  if (keys.right) dir.add(right);

  if (dir.lengthSq() > 0) {
    dir.normalize();
    const targetX = player.position.x + dir.x * moveDistance;
    const targetZ = player.position.z + dir.z * moveDistance;
    // 기존 moveWithSubsteps(...) → 축 분리 스윕 이동으로 교체
    moveWithSliding(targetX, targetZ);
  }

  if (window.playerLight) {
    window.playerLight.position.set(
      player.position.x,
      player.position.y,
      player.position.z
    );
  }

  updateCamera(false); // 위치 스무딩

  const goalDistance = new THREE.Vector2(
    player.position.x - goalBlock.position.x,
    player.position.z - goalBlock.position.z
  ).length();

  if (goalDistance < CELL_SIZE * 0.7) levelComplete();
}

// ===== 루프 =====
function animate() {
  animationId = requestAnimationFrame(animate);
  updatePlayer();
  updateUI();

  if (goalBlock) {
    goalBlock.rotation.y += 0.02;
    goalBlock.position.y = 0.25 + Math.sin(Date.now() * 0.003) * 0.1;
  }

  renderer.render(scene, camera);
}

// ===== 시작/정리 =====
document.addEventListener("DOMContentLoaded", () => {
  init();
});
window.addEventListener("beforeunload", () => {
  if (animationId) cancelAnimationFrame(animationId);
});
