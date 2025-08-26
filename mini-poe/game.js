(() => {
  // ======== 설정값 (원하면 여기만 만지세요) ========
  const CONFIG = {
    PLAYER_SPEED: 230, // 플레이어 이동속도 (px/s)
    PLAYER_RADIUS: 14, // 플레이어 반경
    PLAYER_MAX_HP: 100,
    ATTACK_ARC_TIME: 0.16, // 한 번 휘두르는 데 걸리는 시간(s)
    ATTACK_COOLDOWN: 0.32, // 공격 쿨다운(s)
    ATTACK_RANGE: 52, // 공격 반경
    ATTACK_SWEEP: Math.PI * 0.9, // 휘두르는 각도 범위
    ENEMY_BASE_SPEED: 80,
    ENEMY_SPAWN_INTERVAL: 1.1,
    ENEMY_HP_BASE: 2,
    ENEMY_TOUCH_DMG: 8,
    ENEMY_HIT_IFRAME: 0.45, // 적이 플레이어에게 연속 피격 주기(근접 접촉)
    WAVE_TIME: 22, // 웨이브가 증가하는 시간 주기 (s)
    CANVAS_MARGIN_SPAWN: 40, // 스폰은 화면 밖 여유
  };

  // ======== 캔버스 / 컨텍스트 ========
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const DPR = window.devicePixelRatio || 1;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  // ======== 유틸 ========
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const dist2 = (x1, y1, x2, y2) => {
    const dx = x2 - x1,
      dy = y2 - y1;
    return dx * dx + dy * dy;
  };
  const angleTo = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);
  const wrapAngle = (a) => {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  };

  // ======== 입력 ========
  const keys = new Set();
  window.addEventListener("keydown", (e) => {
    keys.add(e.key.toLowerCase());
  });
  window.addEventListener("keyup", (e) => {
    keys.delete(e.key.toLowerCase());
  });

  const pointer = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    down: false,
  };
  window.addEventListener("pointermove", (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  });
  window.addEventListener("pointerdown", () => {
    pointer.down = true;
  });
  window.addEventListener("pointerup", () => {
    pointer.down = false;
  });

  // ======== 게임 상태 ========
  const state = {
    running: false,
    paused: false,
    time: 0,
    score: 0,
    wave: 1,
    enemies: [],
    particles: [],
    spawnTimer: 0,
    player: {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      r: CONFIG.PLAYER_RADIUS,
      hp: CONFIG.PLAYER_MAX_HP,
      facing: 0,
      atk: {
        cooldown: 0,
        swingT: 0,
        active: false,
        hitIds: new Set(),
      },
    },
  };

  // ======== DOM HUD ========
  const hpFill = document.getElementById("hpFill");
  const scoreEl = document.getElementById("score");
  const waveEl = document.getElementById("wave");
  const centerEl = document.getElementById("center");
  const startBtn = document.getElementById("startBtn");

  startBtn.addEventListener("click", startGame);
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "p") togglePause();
    if (e.key.toLowerCase() === "r") resetGame(true);
  });

  function startGame() {
    if (state.running) return;
    centerEl.style.display = "none";
    state.running = true;
    state.paused = false;
    state.time = 0;
    state.score = 0;
    state.wave = 1;
    state.enemies.length = 0;
    state.particles.length = 0;
    state.spawnTimer = 0;
    Object.assign(state.player, {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      hp: CONFIG.PLAYER_MAX_HP,
    });
  }

  function resetGame(andStart = false) {
    centerEl.style.display = "block";
    centerEl.innerHTML = `
      <div class="title">다시 도전?</div>
      <div class="subtitle">점수 <b>${state.score}</b> · 최고 웨이브 <b>${state.wave}</b></div>
      <div class="btnRow">
        <button class="btn" id="restartBtn">재시작 (R)</button>
      </div>
    `;
    document.getElementById("restartBtn").addEventListener("click", () => {
      centerEl.style.display = "none";
      startGame();
    });
    state.running = false;
    if (andStart) {
      /* R 키에서 호출 시 즉시 시작하도록 */ startGame();
    }
  }

  function togglePause() {
    if (!state.running) return;
    state.paused = !state.paused;
    centerEl.style.display = state.paused ? "block" : "none";
    if (state.paused) {
      centerEl.innerHTML = `
        <div class="title">일시정지</div>
        <div class="subtitle">재개하려면 <b>P</b> 키</div>
      `;
    }
  }

  // ======== 적 / 파티클 팩토리 ========
  let enemyIdSeq = 1;
  function spawnEnemy() {
    const margin = CONFIG.CANVAS_MARGIN_SPAWN;
    const side = Math.floor(Math.random() * 4); // 0:top 1:right 2:bottom 3:left
    let x = 0,
      y = 0;
    if (side === 0) {
      x = rand(-margin, innerWidth + margin);
      y = -margin;
    }
    if (side === 1) {
      x = innerWidth + margin;
      y = rand(-margin, innerHeight + margin);
    }
    if (side === 2) {
      x = rand(-margin, innerWidth + margin);
      y = innerHeight + margin;
    }
    if (side === 3) {
      x = -margin;
      y = rand(-margin, innerHeight + margin);
    }

    const waveMul = 1 + (state.wave - 1) * 0.12;
    const speed = CONFIG.ENEMY_BASE_SPEED * rand(0.9, 1.25) * waveMul;
    const hp = Math.round(
      CONFIG.ENEMY_HP_BASE * rand(0.9, 1.2) * (1 + (state.wave - 1) * 0.08)
    );
    const r = rand(10, 16);
    state.enemies.push({
      id: enemyIdSeq++,
      x,
      y,
      r,
      hp,
      maxhp: hp,
      speed,
      hitTimer: 0,
      touchTimer: 0,
    });
  }

  function addBurst(x, y, color = "#9cf") {
    for (let i = 0; i < 10; i++) {
      state.particles.push({
        x,
        y,
        vx: rand(-100, 100),
        vy: rand(-100, 100),
        life: rand(0.25, 0.6),
        t: 0,
        color,
      });
    }
  }

  // ======== 공격 판정 ========
  function tryAttack(dt) {
    const atk = state.player.atk;
    if (atk.cooldown > 0) atk.cooldown -= dt;

    // 발동
    if (!atk.active && atk.cooldown <= 0 && pointer.down) {
      atk.active = true;
      atk.swingT = 0;
      atk.cooldown = CONFIG.ATTACK_COOLDOWN + CONFIG.ATTACK_ARC_TIME * 0.2; // 소폭 여유
      atk.hitIds.clear();
      addBurst(
        state.player.x + Math.cos(state.player.facing) * 20,
        state.player.y + Math.sin(state.player.facing) * 20,
        "#ccf"
      );
    }

    if (!atk.active) return;

    atk.swingT += dt;
    const t = clamp(atk.swingT / CONFIG.ATTACK_ARC_TIME, 0, 1);
    const start = state.player.facing - CONFIG.ATTACK_SWEEP / 2;
    const end = state.player.facing + CONFIG.ATTACK_SWEEP / 2;
    const curAngle = start + (end - start) * t;

    // 적 히트 판정
    const R = CONFIG.ATTACK_RANGE + 4;
    for (const e of state.enemies) {
      if (atk.hitIds.has(e.id)) continue;
      const d2 = dist2(state.player.x, state.player.y, e.x, e.y);
      const within = d2 <= (R + e.r) * (R + e.r);
      if (!within) continue;
      const a = angleTo(state.player.x, state.player.y, e.x, e.y);
      const diff = Math.abs(wrapAngle(a - curAngle));
      if (diff < 0.35) {
        // 현재 스윙 각 근처
        e.hp -= 1;
        atk.hitIds.add(e.id);
        addBurst(e.x, e.y, "#f88");
        state.score += 1;
      }
    }

    if (t >= 1) {
      atk.active = false;
    }
  }

  // ======== 업데이트/렌더 ========
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);

    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (!state.running || state.paused) return;

    state.time += dt;
    state.wave = 1 + Math.floor(state.time / CONFIG.WAVE_TIME);

    // 입력 → 이동
    const p = state.player;
    const dir = { x: 0, y: 0 };
    if (keys.has("w")) dir.y -= 1;
    if (keys.has("s")) dir.y += 1;
    if (keys.has("a")) dir.x -= 1;
    if (keys.has("d")) dir.x += 1;
    let len = Math.hypot(dir.x, dir.y) || 1;
    dir.x /= len;
    dir.y /= len;

    p.x += dir.x * CONFIG.PLAYER_SPEED * dt;
    p.y += dir.y * CONFIG.PLAYER_SPEED * dt;
    p.x = clamp(p.x, p.r, innerWidth - p.r);
    p.y = clamp(p.y, p.r, innerHeight - p.r);

    // 조준각
    p.facing = angleTo(p.x, p.y, pointer.x, pointer.y);

    // 공격
    tryAttack(dt);

    // 적 스폰
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      const count = 1 + Math.floor((state.wave - 1) * 0.5);
      for (let i = 0; i < count; i++) spawnEnemy();
      state.spawnTimer =
        CONFIG.ENEMY_SPAWN_INTERVAL * (0.85 + Math.random() * 0.4);
    }

    // 적 이동 및 충돌
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      const a = angleTo(e.x, e.y, p.x, p.y);
      e.x += Math.cos(a) * e.speed * dt;
      e.y += Math.sin(a) * e.speed * dt;

      // 플레이어 접촉 데미지
      const d2p = dist2(e.x, e.y, p.x, p.y);
      const rr = (e.r + p.r) * (e.r + p.r);
      e.touchTimer -= dt;
      if (d2p <= rr && e.touchTimer <= 0) {
        p.hp -= CONFIG.ENEMY_TOUCH_DMG;
        e.touchTimer = CONFIG.ENEMY_HIT_IFRAME;
        addBurst(p.x, p.y, "#f55");
        if (p.hp <= 0) {
          p.hp = 0;
          drawFrame();
          gameOver();
          return;
        }
      }

      // 사망 처리
      if (e.hp <= 0) {
        // 드랍 (소확률 회복)
        if (Math.random() < 0.12) {
          // 회복 파티클만, 실제 아이템은 없이 즉시 회복
          p.hp = clamp(p.hp + 8, 0, CONFIG.PLAYER_MAX_HP);
          addBurst(e.x, e.y, "#9f9");
        }
        state.enemies.splice(i, 1);
      }
    }

    // 파티클
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const pa = state.particles[i];
      pa.t += dt;
      if (pa.t > pa.life) {
        state.particles.splice(i, 1);
        continue;
      }
      pa.x += pa.vx * dt;
      pa.y += pa.vy * dt;
    }

    // HUD 업데이트
    const hpPct = (p.hp / CONFIG.PLAYER_MAX_HP) * 100;
    hpFill.style.width = hpPct.toFixed(1) + "%";
    scoreEl.textContent = `점수 ${state.score}`;
    waveEl.textContent = `웨이브 ${state.wave}`;

    drawFrame();
  }

  function gameOver() {
    state.running = false;
    // 센터 메시지
    centerEl.style.display = "block";
    centerEl.innerHTML = `
      <div class="title">게임 오버</div>
      <div class="subtitle">점수 <b>${state.score}</b> · 도달 웨이브 <b>${state.wave}</b></div>
      <div class="btnRow">
        <button class="btn" id="againBtn">다시 시작 (R)</button>
      </div>
    `;
    document.getElementById("againBtn").addEventListener("click", () => {
      centerEl.style.display = "none";
      startGame();
    });
  }

  // ======== 렌더 ========
  function drawFrame() {
    const w = innerWidth,
      h = innerHeight;
    ctx.clearRect(0, 0, w, h);

    // 바닥 그리드 살짝
    ctx.globalAlpha = 0.25;
    const grid = 48;
    ctx.beginPath();
    for (let x = -(state.time * 20) % grid; x < w; x += grid) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = -(state.time * 12) % grid; y < h; y += grid) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.strokeStyle = "#1b2431";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 플레이어
    const p = state.player;
    // 공격 원호 미리 시각화
    if (p.atk.active) {
      const t = clamp(p.atk.swingT / CONFIG.ATTACK_ARC_TIME, 0, 1);
      const start = p.facing - CONFIG.ATTACK_SWEEP / 2;
      const end = p.facing + CONFIG.ATTACK_SWEEP / 2;
      const cur = start + (end - start) * t;
      ctx.beginPath();
      ctx.arc(p.x, p.y, CONFIG.ATTACK_RANGE, cur - 0.4, cur + 0.4);
      ctx.strokeStyle = "rgba(180,210,255,.9)";
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    // 플레이어 몸체
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = "#cfe6ff";
    ctx.fill();

    // 방향표시
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(
      p.x + Math.cos(p.facing) * (p.r + 10),
      p.y + Math.sin(p.facing) * (p.r + 10)
    );
    ctx.strokeStyle = "#9cc9ff";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 적들
    for (const e of state.enemies) {
      // 본체
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fillStyle = "#ff6b6b";
      ctx.fill();
      // 체력 바
      const bw = e.r * 2,
        bh = 4;
      ctx.fillStyle = "rgba(0,0,0,.35)";
      ctx.fillRect(e.x - e.r, e.y - e.r - 8, bw, bh);
      ctx.fillStyle = "#3aff87";
      const pct = clamp(e.hp / e.maxhp, 0, 1);
      ctx.fillRect(e.x - e.r, e.y - e.r - 8, bw * pct, bh);
    }

    // 파티클
    for (const pa of state.particles) {
      const a = 1 - pa.t / pa.life;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(pa.x, pa.y, 2 + a * 2, 0, Math.PI * 2);
      ctx.fillStyle = pa.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // 가장자리에 비네팅
    const g = ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.6,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.8
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.4)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  requestAnimationFrame(loop);
})();
