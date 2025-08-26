import { spendEnergy, gainEnergy } from "./energy.js";
import { consumeShield } from "./shield.js";
import { shuffle } from "../shared/rng.js";

/**
 * Draw one strategy card into player's hand. Shuffles discard into draw as needed.
 * @param {any} state
 * @returns {any} newState
 */
export function drawCard(state) {
  if (state.decks.cards.draw.length === 0) {
    state.decks.cards.draw = shuffle(state.decks.cards.discard, state.rng);
    state.decks.cards.discard = [];
  }
  const c = state.decks.cards.draw.pop();
  const me = { ...state.players.me, cards: [...state.players.me.cards, c] };
  return { ...state, players: { ...state.players, me } };
}

/**
 * Add gauge and award cards for each full 5, carrying overflow.
 * @param {any} state
 * @param {number} delta
 */
export function addGauge(state, delta) {
  let gauge = state.players.me.gauge + delta;
  let newState = { ...state };
  while (gauge >= 5) {
    gauge -= 5;
    newState = drawCard(newState);
  }
  newState.players = {
    ...newState.players,
    me: { ...newState.players.me, gauge },
  };
  return newState;
}

/**
 * Check if player can use a card of given type this round.
 * Enforces: max 2 per round, same type only once.
 * @param {any} state
 * @param {'attack'|'defense'|'boost'|'steal'|'reset'} type
 */
export function canUseCard(state, type) {
  if (state.round.usedCards.length >= 2) return false;
  if (state.round.usedCards.some((c) => c.type === type)) return false;
  return state.players.me.cards.some((c) => c.type === type);
}

/**
 * Remove one card of the given type from hand.
 * @param {any} state
 * @param {string} type
 */
function removeFromHand(state, type) {
  const idx = state.players.me.cards.findIndex((c) => c.type === type);
  const hand = [...state.players.me.cards];
  const [card] = hand.splice(idx, 1);
  return { card, hand };
}

/**
 * Use a strategy card, applying energy costs and effects.
 * Effects applied to self only for demo (no opponent model). Attack/steal will log-only.
 * @param {any} state
 * @param {'attack'|'defense'|'boost'|'steal'|'reset'} type
 */
export function useCard(state, type) {
  if (!canUseCard(state, type)) return state;
  let s = { ...state };
  const costs = { attack: 2, defense: 1, boost: 4, steal: 2, reset: 4 };
  // spend energy first when needed
  if (costs[type] > 0) s = spendEnergy(s, costs[type]);

  const { card, hand } = removeFromHand(s, type);
  s.players = { ...s.players, me: { ...s.players.me, cards: hand } };
  s.round = { ...s.round, usedCards: [...s.round.usedCards, card] };

  switch (type) {
    case "defense": {
      const shields = Math.min(2, s.players.me.shields + 1);
      s.players = { ...s.players, me: { ...s.players.me, shields } };
      break;
    }
    case "boost": {
      s.round = { ...s.round, boostActive: true };
      break;
    }
    case "reset": {
      s.round = { ...s.round, tempScore: 0, boostActive: false };
      break;
    }
    case "attack": {
      const res = consumeShield(s, "attack-card", "ai");
      s = res.state;
      if (!res.blocked) {
        s.players.ai.total = Math.max(1, s.players.ai.total - 3);
      }
      s.log.push(["card:attack", { target: "ai", amount: 3, blocked: res.blocked }]);
      break;
    }
    case "steal": {
      const res = consumeShield(s, "steal-card", "ai");
      s = res.state;
      if (!res.blocked) {
        const amount = 1 + Math.floor(s.rng.next() * 2);
        const take = Math.min(amount, s.players.ai.energy);
        s.players = {
          ...s.players,
          ai: { ...s.players.ai, energy: s.players.ai.energy - take },
          me: { ...s.players.me, energy: Math.min(10, s.players.me.energy + take) },
        };
        s.log.push(["card:steal", { from: "ai", amount: take }]);
      } else {
        s.log.push(["card:steal", { from: "ai", amount: 0, blocked: true }]);
      }
      break;
    }
  }
  return s;
}
