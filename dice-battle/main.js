import { createInitialState } from "./src/core/initial-state.js";
import { runRound, startRound, finalizeRound } from "./src/core/engine.js";
import { startRoundAi } from "./src/core/engine-ai.js";
import { useCard } from "./src/systems/cards.js";
import { createAI } from "./src/ai/ai.js";
import { createShield } from "./src/systems/shield.js";
import { emit, on } from "./src/shared/events.js";

const logEl = document.getElementById("log");
const seedEl = document.getElementById("seed");
const roundsEl = document.getElementById("rounds");
const tendencyEl = document.getElementById("tendency");
const runBtn = document.getElementById("run");
const resetBtn = document.getElementById("reset");
const diffEl = document.getElementById("difficulty");
const runAiBtn = document.getElementById("run-ai");

// game UI elements
const meTotalEl = document.getElementById("me-total");
const meEnergyEl = document.getElementById("me-energy");
const meShieldsEl = document.getElementById("me-shields");
const meGaugeEl = document.getElementById("me-gauge");
const aiTotalEl = document.getElementById("ai-total");
const aiEnergyEl = document.getElementById("ai-energy");
const aiShieldsEl = document.getElementById("ai-shields");
const aiGaugeEl = document.getElementById("ai-gauge");
const roundIndexEl = document.getElementById("round-index");
const roundRollEl = document.getElementById("round-roll");
const roundTendencyEl = document.getElementById("round-tendency");
const preDefenseBtn = document.getElementById("btn-pre-defense");
const preBoostBtn = document.getElementById("btn-pre-boost");
const playRoundBtn = document.getElementById("btn-play-round");
const newGameBtn = document.getElementById("btn-new-game");
const meHandEl = document.getElementById("me-hand");
const startRoundBtn = document.getElementById("btn-start-round");
const finalizeRoundBtn = document.getElementById("btn-finalize-round");
const postAttackBtn = document.getElementById("btn-post-attack");
const postStealBtn = document.getElementById("btn-post-steal");
const postResetBtn = document.getElementById("btn-post-reset");
const makeShieldBtn = document.getElementById("btn-make-shield");

function write(obj) {
  logEl.textContent +=
    typeof obj === "string" ? obj + "\n" : JSON.stringify(obj, null, 2) + "\n";
}

on("phase:*", (p) => write(["event", p]));

let gameState = null;

function updateUI(state) {
  setNum(meTotalEl, state.players.me.total);
  setNum(meEnergyEl, state.players.me.energy);
  setNum(meShieldsEl, state.players.me.shields);
  setNum(meGaugeEl, state.players.me.gauge);
  setNum(aiTotalEl, state.players.ai.total);
  setNum(aiEnergyEl, state.players.ai.energy);
  setNum(aiShieldsEl, state.players.ai.shields);
  setNum(aiGaugeEl, state.players.ai.gauge);
  roundIndexEl.textContent = state.round.index;
  roundRollEl.textContent = state.round.roll ?? "-";
  meHandEl.textContent =
    state.players.me.cards.map((c) => c.type).join(", ") || "-";

  // End-of-game banner
  const totalRounds = state.config.rounds || 8;
  const bannerId = "end-banner";
  let banner = document.getElementById(bannerId);
  if (!banner) {
    banner = document.createElement("div");
    banner.id = bannerId;
    banner.style.margin = "8px 0";
    document.body.insertBefore(banner, logEl);
  }
  if (state.round.index > totalRounds) {
    // Tiebreakers: last round score -> energy -> cards
    const me = state.players.me;
    const ai = state.players.ai;
    const lastMe = state.round.currentScores?.me ?? 0;
    const lastAi = state.round.currentScores?.ai ?? 0;
    let result = "";
    if (me.total !== ai.total)
      result = me.total > ai.total ? "You Win!" : "You Lose";
    else if (lastMe !== lastAi)
      result = lastMe > lastAi ? "You Win!" : "You Lose";
    else if (me.energy !== ai.energy)
      result = me.energy > ai.energy ? "You Win!" : "You Lose";
    else if (me.cards.length !== ai.cards.length)
      result = me.cards.length > ai.cards.length ? "You Win!" : "You Lose";
    else result = "Draw";
    banner.textContent = `Game Over — ${result} (Me ${me.total} : AI ${ai.total})`;
  } else {
    banner.textContent = "";
  }

  // Button enable/disable by phase
  const rolled = state.round.roll !== null;
  preDefenseBtn.disabled = rolled;
  preBoostBtn.disabled = rolled;
  startRoundBtn.disabled = rolled; // can't start again if already rolled
  finalizeRoundBtn.disabled = !rolled; // finalize only after roll
  postAttackBtn.disabled = !rolled;
  postStealBtn.disabled = !rolled;
  postResetBtn.disabled = !rolled;
  // Shield creation constraints
  makeShieldBtn.disabled =
    state.players.me.energy < 3 || state.players.me.shields >= 2;
}

function setNum(el, next) {
  const prev = Number(el.textContent || 0);
  el.textContent = String(next);
  if (next > prev) flash(el, "num-up");
  else if (next < prev) flash(el, "num-down");
}

function flash(el, cls) {
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 350);
}

function newGame() {
  const seed = Number(seedEl.value) || 123456;
  const rounds = Number(roundsEl.value) || 8;
  gameState = createInitialState({ rounds }, seed);
  logEl.textContent = "";
  updateUI(gameState);
}

newGame();

function runOnce() {
  const seed = Number(seedEl.value) || 123456;
  const rounds = Number(roundsEl.value) || 1;
  const tendency = tendencyEl.value;
  let state = createInitialState({ rounds }, seed);

  for (let i = 0; i < rounds; i++) {
    // Example: pre-roll defense or boost usage demo
    if (i === 0 && state.players.me.cards.length > 0) {
      // leave as-is, we draw by gauge; demo uses no pre-hand
    }
    state = runRound(state, tendency);
  }

  write(state);
}

runBtn.addEventListener("click", runOnce);
resetBtn.addEventListener("click", () => (logEl.textContent = ""));
runAiBtn.addEventListener("click", () => {
  const seed = Number(seedEl.value) || 123456;
  const rounds = Number(roundsEl.value) || 1;
  const ai = createAI(diffEl.value);
  let state = createInitialState({ rounds }, seed);
  for (let i = 0; i < rounds; i++) {
    // AI chooses tendency based on state
    const t = ai.chooseTendency(state);
    // Pre-roll decisions
    state = ai.decidePreRollCard(state);
    state = runRound(state, t);
    // Post-roll example (after runRound we could allow, but demo keeps simple)
  }
  write(state);
});

preDefenseBtn.addEventListener("click", () => {
  if (!gameState) return;
  gameState = useCard(gameState, "defense");
  updateUI(gameState);
});

preBoostBtn.addEventListener("click", () => {
  if (!gameState) return;
  gameState = useCard(gameState, "boost");
  updateUI(gameState);
});

playRoundBtn.addEventListener("click", () => {
  if (!gameState) return;
  const t = roundTendencyEl.value;
  gameState = runRound(gameState, t);
  updateUI(gameState);
  write(["round:end", { index: gameState.round.index - 1 }]);
});

newGameBtn.addEventListener("click", () => newGame());

startRoundBtn.addEventListener("click", () => {
  if (!gameState) return;
  const t = roundTendencyEl.value;
  gameState = startRound(gameState, t);
  const ai = createAI(diffEl.value);
  const aiT = ai.chooseTendency(gameState);
  gameState = startRoundAi(gameState, aiT);
  updateUI(gameState);
  write([
    "round:started",
    { index: gameState.round.index, roll: gameState.round.roll },
  ]);
});

finalizeRoundBtn.addEventListener("click", () => {
  if (!gameState) return;
  gameState = finalizeRound(gameState);
  updateUI(gameState);
  write(["round:finalized", { index: gameState.round.index - 1 }]);
});

postAttackBtn.addEventListener("click", () => {
  if (!gameState) return;
  gameState = useCard(gameState, "attack");
  updateUI(gameState);
});

postStealBtn.addEventListener("click", () => {
  if (!gameState) return;
  gameState = useCard(gameState, "steal");
  updateUI(gameState);
});

postResetBtn.addEventListener("click", () => {
  if (!gameState) return;
  gameState = useCard(gameState, "reset");
  updateUI(gameState);
});

makeShieldBtn.addEventListener("click", () => {
  if (!gameState) return;
  try {
    gameState = createShield(gameState);
    updateUI(gameState);
  } catch (e) {
    write(String(e));
  }
});
