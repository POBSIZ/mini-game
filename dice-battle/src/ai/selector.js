/**
 * Decide tendency based on diff, energy, shields and params.
 * @param {any} state
 * @param {{ diffAttack:number, diffDefense:number, balanceEnergy:number }} p
 */
export function decideTendency(state, p) {
  const diff = state.players.me.total - state.players.ai.total;
  if (diff <= -p.diffAttack || state.players.me.energy >= 6) return "attack";
  if (diff >= p.diffDefense || state.players.me.shields === 0) return "defense";
  if (state.players.me.energy <= p.balanceEnergy) return "balance";
  return "balance";
}

/**
 * Pre-roll cards: choose up to available slots between defense(1) and boost(4)
 * Returns array of card types to use now.
 */
export function decidePreCards(state, p) {
  const actions = [];
  const canUseMore = () => state.round.usedCards.length + actions.length < 2;
  const has = (t) => state.players.me.cards.some((c) => c.type === t);

  // Ensure target shields
  if (
    canUseMore() &&
    has("defense") &&
    state.players.me.shields < (p.targetShieldsMin || 0)
  ) {
    actions.push("defense");
  }
  // If expecting high score (bonus turn scheduled or energy high), consider boost
  if (
    canUseMore() &&
    has("boost") &&
    state.players.me.energy >= 4 &&
    (state.scheduled.bonusTurnNext || state.players.me.energy >= 6)
  ) {
    actions.push("boost");
  }
  return actions;
}

/**
 * Post-roll cards: attack/steal/reset decisions.
 */
export function decidePostCards(state, p) {
  const actions = [];
  const canUseMore = () => state.round.usedCards.length + actions.length < 2;
  const has = (t) => state.players.me.cards.some((c) => c.type === t);

  // Without opponent model, keep minimal heuristic stubs for demo
  if (
    canUseMore() &&
    has("attack") &&
    state.players.me.energy >= 2 &&
    state.players.me.shields >= 1
  ) {
    actions.push("attack");
  }
  if (
    canUseMore() &&
    has("steal") &&
    state.players.me.energy >= 2 &&
    state.players.me.energy <= 8
  ) {
    actions.push("steal");
  }
  // Use reset if round score is low and we have energy to attempt re-roll in future rounds
  if (
    canUseMore() &&
    has("reset") &&
    state.players.me.energy >= 4 &&
    (state.round.tempScore || 0) >= 18
  ) {
    // keep for high opponent scenario; in demo we skip reset often
  }
  return actions;
}
