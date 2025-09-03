const board = document.getElementById("board");
const result = document.getElementById("result");
const statusEl = document.getElementById("status");
const rollBtn = document.getElementById("roll");
const resetBtn = document.getElementById("btn-reset");
const rulesBtn = document.getElementById("btn-rules");
const turnLabel = document.getElementById("turn-label");
const turnDot = document.getElementById("turn-dot");
const sticksEls = [0, 1, 2, 3].map((i) => document.getElementById("s" + i));

let turn = "W";
let roll = null;
let pieces = { W: [1, 3, 5, 7, 9], B: [2, 4, 6, 8, 10] };
let gameOver = false;

const SAFE = new Set([15, 26]);
const WATER = 27;
const EXIT = 30;
const GLYPH = { 15: "✚", 26: "★", 27: "⎈", 30: "⟶" };

function indexToRC(idx) {
  const r = Math.floor((idx - 1) / 10);
  let c = (idx - 1) % 10;
  if (r % 2 === 1) c = 9 - c;
  return { r, c };
}

function draw() {
  board.innerHTML = "";
  for (let i = 1; i <= 30; i++) {
    const cell = document.createElement("div");
    cell.className =
      "cell" + (SAFE.has(i) ? " safe" : "") + (i === WATER ? " water" : "");
    cell.dataset.idx = i;
    const { r, c } = indexToRC(i);
    cell.style.gridRow = r + 1;
    cell.style.gridColumn = c + 1;
    const idxTag = document.createElement("div");
    idxTag.className = "idx";
    idxTag.textContent = i;
    cell.appendChild(idxTag);
    if (GLYPH[i]) {
      const g = document.createElement("div");
      g.className = "glyph";
      g.textContent = GLYPH[i];
      cell.appendChild(g);
    }
    const p = pieceAt(i);
    if (p) {
      const el = document.createElement("div");
      el.className = "piece " + p.side;
      el.textContent = p.side;
      el.onclick = () => onPieceClick(p.side, p.i);
      cell.appendChild(el);
    }
    board.appendChild(cell);
  }
  updateTurnUI();
  highlightMovablePieces();
}

function updateTurnUI() {
  const name = turn === "W" ? "흰말 차례" : "검은말 차례";
  turnLabel.textContent = name + (roll ? ` · 이동: ${roll}` : "");
  turnDot.className = "turn-dot " + turn;
}

function pieceAt(idx) {
  for (const s of ["W", "B"]) {
    const k = pieces[s].indexOf(idx);
    if (k !== -1) return { side: s, i: k };
  }
  return null;
}

function isAdjacentSameColor(idx, side) {
  const L = pieceAt(idx - 1),
    R = pieceAt(idx + 1);
  return (L && L.side === side) || (R && R.side === side);
}
function isBlockadeSquare(idx, side) {
  const here = pieceAt(idx);
  if (!here || here.side !== side) return false;
  return isAdjacentSameColor(idx, side);
}
function pathBlockedByOpponent(from, to, opp) {
  for (let s = from + 1; s <= to; s++) {
    if (isBlockadeSquare(s, opp)) return true;
  }
  return false;
}

function rollSticks() {
  const faces = [0, 0, 0, 0].map(() => (Math.random() < 0.5 ? 0 : 1));
  const sum = faces.reduce((a, b) => a + b, 0);
  const p = sum === 0 ? 5 : sum;
  sticksEls.forEach((el, i) => el.classList.toggle("on", !!faces[i]));
  result.textContent = p;
  return p;
}

function hasLegalMove(side, rollVal) {
  const opp = side === "W" ? "B" : "W";
  for (let i = 0; i < pieces[side].length; i++) {
    const from = pieces[side][i];
    if (from === 0) continue;
    const to = from + rollVal;
    if (to > EXIT) continue;
    if (pathBlockedByOpponent(from, to, opp)) continue;
    const occ = pieceAt(to);
    if (occ && occ.side === side) continue;
    if (occ && (SAFE.has(to) || isAdjacentSameColor(to, occ.side))) continue;
    if (to === WATER) {
      const back = !pieceAt(15) ? 15 : !pieceAt(26) ? 26 : null;
      if (!back) continue;
    }
    return true;
  }
  return false;
}

function highlightMovablePieces() {
  document
    .querySelectorAll(".piece")
    .forEach((p) => p.classList.remove("can-move", "dim"));
  if (!roll) {
    document.querySelectorAll(".piece").forEach((p) => p.classList.add("dim"));
    return;
  }
  const side = turn;
  const opp = side === "W" ? "B" : "W";
  for (let i = 0; i < pieces[side].length; i++) {
    const from = pieces[side][i];
    if (from === 0) continue;
    const to = from + roll;
    if (to > EXIT) continue;
    if (pathBlockedByOpponent(from, to, opp)) continue;
    const occ = pieceAt(to);
    if (occ && occ.side === side) continue;
    if (occ && (SAFE.has(to) || isAdjacentSameColor(to, occ.side))) continue;
    if (to === WATER) {
      const back = !pieceAt(15) ? 15 : !pieceAt(26) ? 26 : null;
      if (!back) continue;
    }
    const cell = document.querySelector('.cell[data-idx="' + from + '"]');
    const el = cell && cell.querySelector(".piece");
    if (el) el.classList.add("can-move");
  }
  // dim others
  document.querySelectorAll(".piece").forEach((el) => {
    if (!el.classList.contains("can-move")) el.classList.add("dim");
  });
}

function passTurnIfNoMoves() {
  if (gameOver || roll == null) return;
  if (!hasLegalMove(turn, roll)) {
    statusEl.textContent =
      (turn === "W" ? "흰말" : "검은말") +
      " 이동 가능한 수 없음 — 턴을 넘깁니다.";
    roll = null;
    result.textContent = "–";
    sticksEls.forEach((el) => el.classList.remove("on"));
    clearHighlights();
    draw();
    turn = turn === "W" ? "B" : "W";
    updateTurnUI();
  } else {
    statusEl.textContent = "";
  }
}

function onPieceClick(side, i) {
  if (gameOver || side !== turn) return;
  if (!roll) {
    roll = rollSticks();
    updateTurnUI();
    passTurnIfNoMoves();
    if (roll == null) return;
  }
  showMoves(side, i);
}

function showMoves(side, i) {
  clearHighlights();
  const from = pieces[side][i];
  const to = from + roll;
  if (to > EXIT) return;
  const opp = side === "W" ? "B" : "W";
  if (pathBlockedByOpponent(from, to, opp)) return;
  const occ = pieceAt(to);
  if (occ) {
    if (occ.side === side) return;
    if (SAFE.has(to) || isAdjacentSameColor(to, occ.side)) return;
  }
  if (to === WATER) {
    const back = !pieceAt(15) ? 15 : !pieceAt(26) ? 26 : null;
    if (!back) return;
  }
  const cell = document.querySelector('.cell[data-idx="' + to + '"]');
  if (cell) {
    cell.classList.add("highlight");
    const tip = document.createElement("div");
    tip.className = "target-label";
    tip.textContent =
      to === EXIT ? "탈출" : to === WATER ? "물 → 귀환" : "이동";
    cell.appendChild(tip);
    cell.onclick = () => move(side, i, to);
  }
}

function clearHighlights() {
  document.querySelectorAll(".cell").forEach((c) => {
    c.classList.remove("highlight");
    c.onclick = null;
    const t = c.querySelector(".target-label");
    if (t) t.remove();
  });
}

function checkWin(side) {
  const win = pieces[side].every((p) => p === 0);
  if (win) {
    gameOver = true;
    statusEl.textContent =
      (side === "W" ? "흰말" : "검은말") + " 승리! 모두 탈출했습니다.";
    alert(statusEl.textContent);
  }
  return win;
}

function animateMove(fromIdx, toIdx, side, done) {
  const fromCell = document.querySelector('.cell[data-idx="' + fromIdx + '"]');
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

function move(side, i, to) {
  if (gameOver) return;
  const from = pieces[side][i];
  const opp = side === "W" ? "B" : "W";
  let extraTurn = roll === 4 || roll === 5;
  const finalize = () => {
    if (checkWin(side)) {
      roll = null;
      result.textContent = "–";
      sticksEls.forEach((el) => el.classList.remove("on"));
      clearHighlights();
      draw();
      return;
    }
    roll = null;
    result.textContent = "–";
    sticksEls.forEach((el) => el.classList.remove("on"));
    clearHighlights();
    draw();
    if (!extraTurn) {
      turn = opp;
    } else {
      statusEl.textContent =
        (side === "W" ? "흰말" : "검은말") + " 추가턴! (4/5)";
    }
    updateTurnUI();
  };

  if (to === WATER) {
    const back = !pieceAt(15) ? 15 : !pieceAt(26) ? 26 : null;
    if (!back) return;
    pieces[side][i] = back;
    extraTurn = false;
    animateMove(from, WATER, side, finalize);
    return;
  }

  if (to === EXIT) {
    pieces[side][i] = 0;
    animateMove(from, EXIT, side, finalize);
    return;
  }

  const occ = pieceAt(to);
  if (occ && occ.side === opp) {
    pieces[occ.side][occ.i] = from;
  }
  pieces[side][i] = to;
  animateMove(from, to, side, finalize);
}

// Controls
rollBtn.addEventListener("click", () => {
  if (gameOver || roll) return;
  roll = rollSticks();
  updateTurnUI();
  passTurnIfNoMoves();
  highlightMovablePieces();
});
resetBtn.addEventListener("click", () => {
  turn = "W";
  roll = null;
  pieces = { W: [1, 3, 5, 7, 9], B: [2, 4, 6, 8, 10] };
  gameOver = false;
  statusEl.textContent = "";
  result.textContent = "–";
  sticksEls.forEach((el) => el.classList.remove("on"));
  draw();
});
rulesBtn.addEventListener("click", () =>
  document.getElementById("rules").showModal()
);
document.addEventListener("keydown", (e) => {
  if (e.key === "r" || e.key === "R") {
    if (!roll && !gameOver) {
      roll = rollSticks();
      updateTurnUI();
      passTurnIfNoMoves();
      highlightMovablePieces();
    }
  }
});

// init
draw();
