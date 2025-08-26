import { createInitialState } from "./src/core/initial-state.js";
import { runRound, startRound, finalizeRound } from "./src/core/engine.js";
import { startRoundAi } from "./src/core/engine-ai.js";
import { useCard, canUseCard } from "./src/systems/cards.js";
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
const roundsTotalEl = document.getElementById("rounds-total");
const roundRollEl = document.getElementById("round-roll");
const startRoundBtn = document.getElementById("btn-start-round");
const finalizeRoundBtn = document.getElementById("btn-finalize-round");
const makeShieldBtn = document.getElementById("btn-make-shield");
const newGameBtn = document.getElementById("btn-new-game");
const handEl = document.getElementById("hand");
const eventFeedEl = document.getElementById("event-feed");
const meResTray = document.getElementById("me-reservations");
const aiResTray = document.getElementById("ai-reservations");
const meCardsCountEl = document.getElementById("me-cards-count");
const aiCardsCountEl = document.getElementById("ai-cards-count");
const phaseBadgeEl = document.getElementById("phase-badge");
const rollBadgeEl = document.getElementById("roll-badge");
const tendencyToggleEl = document.getElementById("tendency-toggle");
const confirmTendencyBtn = document.getElementById("btn-confirm-tendency");

function write(obj) {
  logEl.textContent +=
    typeof obj === "string" ? obj + "\n" : JSON.stringify(obj, null, 2) + "\n";
}

on("phase:*", (p) => write(["event", p]));

let gameState = null;
let selectedTendency = null;

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
  if (roundsTotalEl) roundsTotalEl.textContent = state.config.rounds || 8;

  renderTendencyToggle(state);
  renderHand(state);
  renderReservations(state);
  setPhaseBadge(state);
  updateButtonsByPhase(state);

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
  selectedTendency = null;
  clearEventFeed();
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

newGameBtn.addEventListener("click", () => newGame());

startRoundBtn.addEventListener("click", () => {
  if (!gameState) return;
  const t = selectedTendency || "balance";
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

makeShieldBtn.addEventListener("click", () => {
  if (!gameState) return;
  try {
    gameState = createShield(gameState);
    updateUI(gameState);
  } catch (e) {
    write(String(e));
  }
});

// Tendency selection
if (tendencyToggleEl) {
  tendencyToggleEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tendency]");
    if (!btn || !gameState) return;
    if (gameState.round.roll !== null) return; // locked after roll
    selectedTendency = btn.getAttribute("data-tendency");
    renderTendencyToggle(gameState);
    updateButtonsByPhase(gameState);
  });
}

confirmTendencyBtn?.addEventListener("click", () => {
  if (!gameState) return;
  if (gameState.round.roll !== null) return;
  if (!selectedTendency) return;
  // Move to next step: enable Roll button explicitly
  updateButtonsByPhase(gameState);
});

// Event feed helpers
function pushEventFeed(text) {
  if (!eventFeedEl) return;
  const div = document.createElement("div");
  div.textContent = text;
  eventFeedEl.appendChild(div);
  eventFeedEl.scrollTop = eventFeedEl.scrollHeight;
}
function clearEventFeed() {
  if (!eventFeedEl) return;
  eventFeedEl.textContent = "";
}

// UI renderers
function renderTendencyToggle(state) {
  if (!tendencyToggleEl) return;
  const buttons = tendencyToggleEl.querySelectorAll("button[data-tendency]");
  buttons.forEach((b) => {
    const val = b.getAttribute("data-tendency");
    b.classList.toggle("selected", val === selectedTendency);
    b.disabled = state.round.roll !== null; // disabled after roll
  });
}

function renderHand(state) {
  if (!handEl) return;
  handEl.textContent = "";
  const phaseRolled = state.round.roll !== null;
  const cards = state.players.me.cards;
  meCardsCountEl && (meCardsCountEl.textContent = String(cards.length));
  aiCardsCountEl &&
    (aiCardsCountEl.textContent = String(state.players.ai.cards.length || 0));
  const preAllowed = new Set(["defense", "boost"]);
  const postAllowed = new Set(["attack", "steal", "reset"]);
  for (const c of cards) {
    const btn = document.createElement("button");
    btn.className = `card-btn ${c.type}`;
    btn.textContent = c.type;
    const canUse = canUseCard(state, c.type);
    const allowedByPhase = phaseRolled
      ? postAllowed.has(c.type)
      : preAllowed.has(c.type);
    btn.disabled = !(canUse && allowedByPhase);
    btn.title = tooltipForCard(c.type, canUse, allowedByPhase, state);
    btn.addEventListener("click", () => {
      if (!gameState) return;
      gameState = useCard(gameState, c.type);
      updateUI(gameState);
    });
    handEl.appendChild(btn);
  }
}

function tooltipForCard(type, canUse, allowedByPhase, state) {
  const cost =
    { attack: 2, defense: 1, boost: 4, steal: 2, reset: 4 }[type] || 0;
  const parts = [`cost ${cost}`];
  if (!allowedByPhase)
    parts.push(state.round.roll === null ? "사후 전용" : "사전 전용");
  if (!canUse) {
    if (state.round.usedCards.length >= 2) parts.push("2장제한");
    if (state.round.usedCards.some((c) => c.type === type))
      parts.push("중복종류");
  }
  if (state.players.me.energy < cost) parts.push("E부족");
  return parts.join(" / ");
}

function renderReservations(state) {
  if (meResTray) meResTray.textContent = "";
  if (aiResTray) aiResTray.textContent = "";
  const makeIcon = (txt) => {
    const s = document.createElement("span");
    s.textContent = txt;
    s.style.border = "1px solid #e3e7ef";
    s.style.borderRadius = "6px";
    s.style.padding = "2px 6px";
    return s;
  };
  if (gameState?.scheduled.luckNext) meResTray?.appendChild(makeIcon("🍀"));
  if (gameState?.scheduled.bonusTurnNext)
    meResTray?.appendChild(makeIcon("🌙"));
  if ((gameState?.scheduled.curseNext || 0) > 0)
    meResTray?.appendChild(makeIcon(`🎲x${gameState.scheduled.curseNext}`));
}

function setPhaseBadge(state) {
  if (!phaseBadgeEl) return;
  const phase = state.round.roll === null ? "PreRound" : "PostCard";
  phaseBadgeEl.textContent = phase;
  // Roll badge
  if (state.round.roll === 6 && state.round.tendency === "attack")
    rollBadgeEl.textContent = "⚡";
  else if (state.round.roll === 2 && state.round.tendency === "defense")
    rollBadgeEl.textContent = "🛡️";
  else rollBadgeEl.textContent = "";
}

function updateButtonsByPhase(state) {
  const rolled = state.round.roll !== null;
  startRoundBtn.disabled = rolled || !selectedTendency;
  finalizeRoundBtn.disabled = !rolled;
  confirmTendencyBtn &&
    (confirmTendencyBtn.disabled = rolled || !selectedTendency);
}

// Event bus for phase updates
on("phase:*", (p) => {
  if (p?.name === "round:start") {
    pushEventFeed(`🎲 Roll: ${gameState?.round.roll ?? "-"}`);
  } else if (p?.name === "round:end") {
    pushEventFeed(`✅ Round ${p.index} end`);
  }
});
