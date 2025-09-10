// 게임 로직 및 규칙 모듈
import { gameStateManager } from "./game-state.js";
import { uiManager } from "./ui-manager.js";

export class GameLogic {
  constructor() {
    // 게임 상수들
    this.SAFE = new Set([15, 26]);
    this.WATER = 27;
    this.EXIT = 30;
    this.GLYPH = { 15: "✚", 26: "★", 27: "⎈", 30: "⟶" };

    this.initializeEventListeners();
  }

  // 이벤트 리스너 초기화
  initializeEventListeners() {
    // 키보드 이벤트
    document.addEventListener("keydown", (e) => {
      if (e.key === "r" || e.key === "R") {
        if (
          !gameStateManager.gameState.roll &&
          !gameStateManager.gameState.gameOver &&
          gameStateManager.gameState.turn ===
            gameStateManager.currentPlayer.side
        ) {
          this.rollSticks();
        }
      }
    });
  }

  // 게임 초기화
  initGame() {
    const rollBtn = document.getElementById("roll");
    const resetBtn = document.getElementById("btn-reset");
    const rulesBtn = document.getElementById("btn-rules");
    const backToMenuBtn = document.getElementById("btn-back-to-menu");

    // 이벤트 리스너 등록
    if (rollBtn) {
      rollBtn.addEventListener("click", () => this.rollSticks());
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (!gameStateManager.currentPlayer.isOwner) return;
        wsManager.send("RESET_GAME", {
          roomId: gameStateManager.currentRoom.id,
          playerId: gameStateManager.currentPlayer.id,
        });
      });
    }

    if (rulesBtn) {
      rulesBtn.addEventListener("click", () =>
        document.getElementById("rules").showModal()
      );
    }

    if (backToMenuBtn) {
      backToMenuBtn.addEventListener("click", () => {
        // 방 나가기 로직은 roomManager에서 처리
        if (typeof window.roomManager !== "undefined") {
          window.roomManager.leaveRoom();
        } else {
          // roomManager가 없으면 직접 메인메뉴로 이동
          uiManager.showMainMenu();
        }
      });
    }

    // 초기 게임 그리기
    this.draw();

    // 게임 초기화 시 상태 메시지 초기화
    this.clearStatusMessage();
  }

  // 주사위 굴리기
  rollSticks() {
    if (
      gameStateManager.gameState.gameOver ||
      gameStateManager.gameState.roll ||
      gameStateManager.gameState.turn !== gameStateManager.currentPlayer.side
    )
      return;

    console.log("막대기 굴리기 요청:", {
      roomId: gameStateManager.currentRoom.id,
      playerId: gameStateManager.currentPlayer.id,
      currentTurn: gameStateManager.gameState.turn,
      currentRoll: gameStateManager.gameState.roll,
      isMyTurn:
        gameStateManager.gameState.turn === gameStateManager.currentPlayer.side,
    });

    if (window.wsManager) {
      window.wsManager.send("ROLL_STICKS", {
        roomId: gameStateManager.currentRoom.id,
        playerId: gameStateManager.currentPlayer.id,
      });
    }
  }

  // 주사위 UI 업데이트
  updateSticksUI(faces) {
    const sticksEls = [0, 1, 2, 3].map((i) => document.getElementById("s" + i));
    const result = document.getElementById("result");

    sticksEls.forEach((el, i) => {
      if (el) el.classList.toggle("on", !!faces[i]);
    });

    if (result) {
      const sum = faces.reduce((a, b) => a + b, 0);
      result.textContent = sum === 0 ? 5 : sum;
    }
  }

  // 턴 UI 업데이트
  updateTurnUI() {
    const turnLabel = document.getElementById("turn-label");
    const turnDot = document.getElementById("turn-dot");
    if (!turnLabel || !turnDot) return;

    const name =
      gameStateManager.gameState.turn === "W" ? "흰말 차례" : "검은말 차례";
    const isMyTurn =
      gameStateManager.gameState.turn === gameStateManager.currentPlayer.side;
    turnLabel.textContent =
      name +
      (gameStateManager.gameState.roll
        ? ` · 이동: ${gameStateManager.gameState.roll}`
        : "") +
      (isMyTurn ? " (내 차례)" : "");
    turnDot.className = "turn-dot " + gameStateManager.gameState.turn;

    // 디버깅을 위한 로그
    console.log("턴 UI 업데이트:", {
      turn: gameStateManager.gameState.turn,
      roll: gameStateManager.gameState.roll,
      isMyTurn: isMyTurn,
      currentPlayerSide: gameStateManager.currentPlayer.side,
      turnLabelText: turnLabel.textContent,
    });
  }

  // 게임 보드 그리기
  draw() {
    const board = document.getElementById("board");
    if (!board) return;

    board.innerHTML = "";
    for (let i = 1; i <= 30; i++) {
      const cell = document.createElement("div");
      cell.className =
        "cell" +
        (this.SAFE.has(i) ? " safe" : "") +
        (i === this.WATER ? " water" : "");
      cell.dataset.idx = i;
      const { r, c } = this.indexToRC(i);
      cell.style.gridRow = r + 1;
      cell.style.gridColumn = c + 1;
      const idxTag = document.createElement("div");
      idxTag.className = "idx";
      idxTag.textContent = i;
      cell.appendChild(idxTag);
      if (this.GLYPH[i]) {
        const g = document.createElement("div");
        g.className = "glyph";
        g.textContent = this.GLYPH[i];
        cell.appendChild(g);
      }
      const p = this.pieceAt(i);
      if (p) {
        const el = document.createElement("div");
        el.className = "piece " + p.side;
        el.textContent = p.side;
        el.onclick = () => this.onPieceClick(p.side, p.i);
        cell.appendChild(el);
      }
      board.appendChild(cell);
    }
    this.updateTurnUI();
    this.highlightMovablePieces();
  }

  // 인덱스를 행/열로 변환
  indexToRC(idx) {
    const r = Math.floor((idx - 1) / 10);
    let c = (idx - 1) % 10;
    if (r % 2 === 1) c = 9 - c;
    return { r, c };
  }

  // 특정 위치의 말 확인
  pieceAt(idx) {
    for (const s of ["W", "B"]) {
      const k = gameStateManager.gameState.pieces[s].indexOf(idx);
      if (k !== -1) return { side: s, i: k };
    }
    return null;
  }

  // 인접한 같은 색 말 확인
  isAdjacentSameColor(idx, side) {
    const L = this.pieceAt(idx - 1),
      R = this.pieceAt(idx + 1);
    return (L && L.side === side) || (R && R.side === side);
  }

  // 봉쇄 사각형 확인
  isBlockadeSquare(idx, side) {
    const here = this.pieceAt(idx);
    if (!here || here.side !== side) return false;
    return this.isAdjacentSameColor(idx, side);
  }

  // 경로가 상대방에 의해 막혔는지 확인
  pathBlockedByOpponent(from, to, opp) {
    for (let s = from + 1; s <= to; s++) {
      if (this.isBlockadeSquare(s, opp)) return true;
    }
    return false;
  }

  // 합법적인 이동이 있는지 확인
  hasLegalMove(side, rollVal) {
    const opp = side === "W" ? "B" : "W";
    for (let i = 0; i < gameStateManager.gameState.pieces[side].length; i++) {
      const from = gameStateManager.gameState.pieces[side][i];
      if (from === 0) continue;
      const to = from + rollVal;
      if (to > this.EXIT) continue;
      if (this.pathBlockedByOpponent(from, to, opp)) continue;
      const occ = this.pieceAt(to);
      if (occ && occ.side === side) continue;
      if (occ && (this.SAFE.has(to) || this.isAdjacentSameColor(to, occ.side)))
        continue;
      if (to === this.WATER) {
        const back = !this.pieceAt(15) ? 15 : !this.pieceAt(26) ? 26 : null;
        if (!back) continue;
      }
      return true;
    }
    return false;
  }

  // 이동 가능한 말 하이라이트
  highlightMovablePieces() {
    document
      .querySelectorAll(".piece")
      .forEach((p) => p.classList.remove("can-move", "dim"));
    if (
      !gameStateManager.gameState.roll ||
      gameStateManager.gameState.turn !== gameStateManager.currentPlayer.side
    ) {
      document
        .querySelectorAll(".piece")
        .forEach((p) => p.classList.add("dim"));
      return;
    }
    const side = gameStateManager.gameState.turn;
    const opp = side === "W" ? "B" : "W";
    for (let i = 0; i < gameStateManager.gameState.pieces[side].length; i++) {
      const from = gameStateManager.gameState.pieces[side][i];
      if (from === 0) continue;
      const to = from + gameStateManager.gameState.roll;
      if (to > this.EXIT) continue;
      if (this.pathBlockedByOpponent(from, to, opp)) continue;
      const occ = this.pieceAt(to);
      if (occ && occ.side === side) continue;
      if (occ && (this.SAFE.has(to) || this.isAdjacentSameColor(to, occ.side)))
        continue;
      if (to === this.WATER) {
        const back = !this.pieceAt(15) ? 15 : !this.pieceAt(26) ? 26 : null;
        if (!back) continue;
      }
      const cell = document.querySelector('.cell[data-idx="' + from + '"]');
      const el = cell && cell.querySelector(".piece");
      if (el) el.classList.add("can-move");
    }
    document.querySelectorAll(".piece").forEach((el) => {
      if (!el.classList.contains("can-move")) el.classList.add("dim");
    });
  }

  // 이동할 수 없으면 턴 넘기기
  passTurnIfNoMoves() {
    if (
      gameStateManager.gameState.gameOver ||
      gameStateManager.gameState.roll == null
    )
      return;
    if (
      !this.hasLegalMove(
        gameStateManager.gameState.turn,
        gameStateManager.gameState.roll
      )
    ) {
      const statusEl = document.getElementById("status");
      if (statusEl) {
        statusEl.textContent =
          (gameStateManager.gameState.turn === "W" ? "흰말" : "검은말") +
          " 이동 가능한 수 없음 — 턴을 넘깁니다.";
      }
      this.clearHighlights();

      // 서버에 턴 패스 요청
      if (window.wsManager) {
        window.wsManager.send("PASS_TURN", {
          roomId: gameStateManager.currentRoom.id,
          playerId: gameStateManager.currentPlayer.id,
          turn: gameStateManager.gameState.turn,
          roll: gameStateManager.gameState.roll,
        });
      }
    } else {
      const statusEl = document.getElementById("status");
      if (statusEl) statusEl.textContent = "";
    }
  }

  // 말 클릭 이벤트
  onPieceClick(side, i) {
    if (
      gameStateManager.gameState.gameOver ||
      side !== gameStateManager.gameState.turn ||
      side !== gameStateManager.currentPlayer.side
    )
      return;
    if (!gameStateManager.gameState.roll) return;
    this.showMoves(side, i);
  }

  // 가능한 이동 표시
  showMoves(side, i) {
    this.clearHighlights();
    const from = gameStateManager.gameState.pieces[side][i];
    const to = from + gameStateManager.gameState.roll;
    if (to > this.EXIT) return;
    const opp = side === "W" ? "B" : "W";
    if (this.pathBlockedByOpponent(from, to, opp)) return;
    const occ = this.pieceAt(to);
    if (occ) {
      if (occ.side === side) return;
      if (this.SAFE.has(to) || this.isAdjacentSameColor(to, occ.side)) return;
    }
    if (to === this.WATER) {
      const back = !this.pieceAt(15) ? 15 : !this.pieceAt(26) ? 26 : null;
      if (!back) return;
    }
    const cell = document.querySelector('.cell[data-idx="' + to + '"]');
    if (cell) {
      cell.classList.add("highlight");
      const tip = document.createElement("div");
      tip.className = "target-label";
      tip.textContent =
        to === this.EXIT ? "탈출" : to === this.WATER ? "물 → 귀환" : "이동";
      cell.appendChild(tip);
      cell.onclick = () => this.move(side, i, to);
    }
  }

  // 하이라이트 제거
  clearHighlights() {
    document.querySelectorAll(".cell").forEach((c) => {
      c.classList.remove("highlight");
      c.onclick = null;
      const t = c.querySelector(".target-label");
      if (t) t.remove();
    });
  }

  // 상태 메시지 초기화
  clearStatusMessage() {
    const statusEl = document.getElementById("status");
    if (statusEl) {
      statusEl.textContent = "";
    }
  }

  // 승리 확인
  checkWin(side) {
    const win = gameStateManager.gameState.pieces[side].every((p) => p === 0);
    if (win) {
      gameStateManager.updateGameState({ gameOver: true });
      const statusEl = document.getElementById("status");
      if (statusEl) {
        statusEl.textContent =
          (side === "W" ? "흰말" : "검은말") + " 승리! 모두 탈출했습니다.";
      }
    }
    return win;
  }

  // 말 이동 애니메이션
  animateMove(fromIdx, toIdx, side, done) {
    const fromCell = document.querySelector(
      '.cell[data-idx="' + fromIdx + '"]'
    );
    const toCell =
      document.querySelector('.cell[data-idx="' + toIdx + '"]') ||
      document.querySelector('.cell[data-idx="30"]');
    if (!fromCell || !toCell) {
      done();
      return;
    }
    const pieceEl = fromCell.querySelector(".piece");
    const fb = fromCell.getBoundingClientRect();
    const tb = toCell.getBoundingClientRect();
    const ghost = document.createElement("div");
    ghost.className = "float-piece " + side;
    ghost.style.background =
      side === "W"
        ? "linear-gradient(180deg,#e6f0ff,#cfe0ff)"
        : "linear-gradient(180deg,#2b2f4f,#1c203b)";
    ghost.style.color = side === "W" ? "#09121f" : "#e7eaff";
    ghost.textContent = side;
    document.body.appendChild(ghost);
    ghost.style.left = fb.left + window.scrollX + (fb.width - 58) / 2 + "px";
    ghost.style.top = fb.top + window.scrollY + (fb.height - 58) / 2 + "px";
    ghost.style.transition = "transform .28s ease";
    const dx = tb.left - fb.left;
    const dy = tb.top - fb.top;
    requestAnimationFrame(() => {
      ghost.style.transform = "translate(" + dx + "px," + dy + "px)";
    });
    setTimeout(() => {
      ghost.remove();
      done();
    }, 300);
  }

  // 말 이동
  move(side, i, to) {
    if (
      gameStateManager.gameState.gameOver ||
      side !== gameStateManager.currentPlayer.side
    )
      return;

    console.log("말 이동 요청:", {
      roomId: gameStateManager.currentRoom.id,
      playerId: gameStateManager.currentPlayer.id,
      move: {
        side: side,
        pieceIndex: i,
        from: gameStateManager.gameState.pieces[side][i],
        to: to,
        roll: gameStateManager.gameState.roll,
      },
    });

    if (window.wsManager) {
      window.wsManager.send("MOVE_PIECE", {
        roomId: gameStateManager.currentRoom.id,
        playerId: gameStateManager.currentPlayer.id,
        move: {
          side: side,
          pieceIndex: i,
          from: gameStateManager.gameState.pieces[side][i],
          to: to,
          roll: gameStateManager.gameState.roll,
        },
      });
    }
  }
}

// 싱글톤 인스턴스 생성
export const gameLogic = new GameLogic();
