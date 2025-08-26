import { gainEnergy } from "./energy.js";

/**
 * Draw an event card for the player from deck, expanding category to concrete type.
 * Mutates decks by moving drawn to discard.
 * @param {any} state
 * @param {{ next:()=>number }} rng
 * @returns {{ id:string, type:string }} event
 */
export function drawEvent(state, rng) {
  if (state.decks.events.draw.length === 0) {
    state.decks.events.draw = state.decks.events.discard;
    state.decks.events.discard = [];
  }
  const card = state.decks.events.draw.pop();
  // Expand kind to concrete event type
  const pools = {
    none: ["none"],
    positive: ["lucky", "score_boost", "bonus_turn", "energy_charge"],
    negative: ["bomb", "thief", "curse", "energy_drain"],
    neutral: ["score_swap", "reset", "card_exchange", "none"],
  };
  const list = pools[card.kind] || ["none"];
  const type = list[Math.floor(rng.next() * list.length)];
  const e = { id: card.id, type };
  state.decks.events.discard.push({ ...card, picked: type });
  return e;
}

/** Apply immediate event effects for the given side ('me'|'ai'). */
export function applyImmediate(state, event, who = "me") {
  switch (event.type) {
    case "none":
      return state;
    case "score_boost": {
      // applied later in finalize; record on round per side
      if (who === "me") {
        return {
          ...state,
          round: {
            ...state.round,
            scoreBoost: (state.round.scoreBoost || 0) + 2,
          },
        };
      }
      return {
        ...state,
        round: {
          ...state.round,
          scoreBoostAi: (state.round.scoreBoostAi || 0) + 2,
        },
      };
    }
    case "energy_charge": {
      const key = who;
      const cur = state.players[key].energy;
      const delta = cur <= 7 ? 3 : cur <= 9 ? 2 : 0;
      const next = Math.min(10, cur + delta);
      return {
        ...state,
        players: {
          ...state.players,
          [key]: { ...state.players[key], energy: next },
        },
      };
    }
    case "energy_drain": {
      const key = who;
      const cur = state.players[key].energy;
      if (cur >= 3) {
        const next = Math.max(1, cur - 2);
        return {
          ...state,
          players: {
            ...state.players,
            [key]: { ...state.players[key], energy: next },
          },
        };
      }
      return state;
    }
    case "bomb": {
      const key = who;
      const halved = Math.max(3, Math.floor(state.players[key].total / 2));
      return {
        ...state,
        players: {
          ...state.players,
          [key]: { ...state.players[key], total: halved },
        },
      };
    }
    case "thief": {
      // victim: the drawer
      const victim = who;
      const attacker = who === "me" ? "ai" : "me";
      // block by victim's shield
      if (state.players[victim].shields > 0) {
        return {
          ...state,
          players: {
            ...state.players,
            [victim]: {
              ...state.players[victim],
              shields: state.players[victim].shields - 1,
            },
          },
        };
      }
      if (state.players[victim].total >= 5) {
        const v = Math.max(1, state.players[victim].total - 2);
        const a = state.players[attacker].total + 2;
        return {
          ...state,
          players: {
            ...state.players,
            [victim]: { ...state.players[victim], total: v },
            [attacker]: { ...state.players[attacker], total: a },
          },
        };
      }
      return state;
    }
    case "reset": {
      // only for player UI round
      return {
        ...state,
        round: { ...state.round, tempScore: 0, currentScore: 0 },
      };
    }
    case "score_swap": {
      const mt = state.players.me.total,
        at = state.players.ai.total;
      if (Math.abs(mt - at) >= 3) {
        return {
          ...state,
          players: {
            ...state.players,
            me: { ...state.players.me, total: at },
            ai: { ...state.players.ai, total: mt },
          },
        };
      }
      return state;
    }
    case "card_exchange": {
      if (
        state.players.me.cards.length > 0 &&
        state.players.ai.cards.length > 0
      ) {
        const mi = Math.floor(Math.random() * state.players.me.cards.length);
        const ai = Math.floor(Math.random() * state.players.ai.cards.length);
        const mCard = state.players.me.cards[mi];
        const aCard = state.players.ai.cards[ai];
        const mHand = [...state.players.me.cards];
        const aHand = [...state.players.ai.cards];
        mHand[mi] = aCard;
        aHand[ai] = mCard;
        return {
          ...state,
          players: {
            ...state.players,
            me: { ...state.players.me, cards: mHand },
            ai: { ...state.players.ai, cards: aHand },
          },
        };
      }
      return state;
    }
    default:
      return state;
  }
}

/** Schedule delayed effects for next round for the given side ('me'|'ai'). */
export function scheduleDelayed(state, event, who = "me") {
  switch (event.type) {
    case "lucky": {
      return { ...state, scheduled: { ...state.scheduled, luckNext: true } };
    }
    case "bonus_turn": {
      return {
        ...state,
        scheduled: { ...state.scheduled, bonusTurnNext: true },
      };
    }
    case "curse": {
      return {
        ...state,
        scheduled: {
          ...state.scheduled,
          curseNext: (state.scheduled.curseNext || 0) + 2,
        },
      };
    }
    default:
      return state;
  }
}

/** convenience: apply an event splitting immediate vs delayed */
export function applyEvent(state, event, who = "me") {
  const delayed = ["lucky", "bonus_turn", "curse"];
  if (delayed.includes(event.type)) return scheduleDelayed(state, event, who);
  return applyImmediate(state, event, who);
}
