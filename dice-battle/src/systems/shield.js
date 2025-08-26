import { spendEnergy } from "./energy.js";

/**
 * Spend 3 energy to create a shield (max 2).
 * @param {any} state
 */
export function createShield(state) {
  if (state.players.me.shields >= 2) return state;
  // spend energy cost 3 or throw
  const s = spendEnergy(state, 3);
  const shields = Math.min(2, s.players.me.shields + 1);
  return { ...s, players: { ...s.players, me: { ...s.players.me, shields } } };
}

/** Add up to n shields with cap 2 for a given side. */
export function addShield(state, n = 1, who = "me") {
  const next = Math.min(2, state.players[who].shields + n);
  return { ...state, players: { ...state.players, [who]: { ...state.players[who], shields: next } } };
}

/** Which effects can be blocked by shield per docs. */
export function canBlock(effect) {
  return [
    "attack-card", // 공격 카드
    "attack-die", // ⚡ 공격 주사위 -2
    "flame-die-now", // 🔥 화염 이번 라운드 -3만
    "steal-card", // 🦹 스틸 카드/이벤트
  ].includes(effect);
}

/**
 * Consume 1 shield if effect is blockable and shields > 0.
 * Returns { state, blocked }.
 */
export function consumeShield(state, effect, who = "me") {
  if (!canBlock(effect)) return { state, blocked: false };
  const s = state.players[who].shields;
  if (s > 0) {
    const next = { ...state, players: { ...state.players, [who]: { ...state.players[who], shields: s - 1 } } };
    return { state: next, blocked: true };
  }
  return { state, blocked: false };
}


