// Rule guards that throw when constraints are violated.

/**
 * Ensure current player has at least the required energy.
 * @param {any} state
 * @param {number} need
 */
export function assertEnergy(state, need) {
  if (state.players.me.energy < need)
    throw new Error("[Rule] Not enough energy");
}

/**
 * Ensure card usage limit per round is respected.
 * @param {any} state
 */
export function assertCardLimit(state) {
  if (state.round.usedCards.length >= 2)
    throw new Error("[Rule] Card limit exceeded");
}

/**
 * Ensure player does not exceed maximum shields.
 * @param {any} state
 * @param {number} max
 */
export function assertShieldMax(state, max = 2) {
  if (state.players.me.shields >= max)
    throw new Error("[Rule] Shield max reached");
}
