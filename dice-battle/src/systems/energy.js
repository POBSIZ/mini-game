// Energy system with bounds enforcement and helpers

/**
 * Gain energy with cap at 10.
 * @param {any} state
 * @param {number} amount
 */
export function gainEnergy(state, amount) {
  const e = Math.min(10, state.players.me.energy + amount);
  return {
    ...state,
    players: { ...state.players, me: { ...state.players.me, energy: e } },
  };
}

/**
 * Spend energy, cannot go below 0.
 * @param {any} state
 * @param {number} amount
 */
export function spendEnergy(state, amount) {
  const after = state.players.me.energy - amount;
  if (after < 0) throw new Error("[Energy] not enough");
  const e = Math.max(0, after);
  return {
    ...state,
    players: { ...state.players, me: { ...state.players.me, energy: e } },
  };
}

/**
 * Apply energy event kinds defined in docs.
 * @param {any} state
 * @param {'charge'|'drain'} kind
 */
export function applyEnergyEvent(state, kind) {
  if (kind === "charge") {
    // +3 but respect max 10 with step logic per spec
    const cur = state.players.me.energy;
    const delta = cur <= 7 ? 3 : cur <= 9 ? 2 : 0;
    return gainEnergy(state, delta);
  }
  if (kind === "drain") {
    const cur = state.players.me.energy;
    if (cur >= 3) {
      const next = Math.max(1, cur - 2);
      return {
        ...state,
        players: {
          ...state.players,
          me: { ...state.players.me, energy: next },
        },
      };
    }
    return state;
  }
  return state;
}
