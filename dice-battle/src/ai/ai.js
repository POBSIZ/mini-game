import { AI_PARAMS } from "./params.js";
import { decideTendency, decidePreCards, decidePostCards } from "./selector.js";
import { useCard } from "../systems/cards.js";

/**
 * Create an AI controller with provided difficulty.
 * @param {'Easy'|'Normal'|'Hard'} difficulty
 */
export function createAI(difficulty = "Normal") {
  const params = AI_PARAMS[difficulty] || AI_PARAMS.Normal;
  return {
    difficulty,
    params,
    chooseTendency(state) {
      return decideTendency(state, params);
    },
    decidePreRollCard(state) {
      const acts = decidePreCards(state, params);
      let s = state;
      for (const t of acts) s = useCard(s, t);
      return s;
    },
    decidePostRollCard(state) {
      const acts = decidePostCards(state, params);
      let s = state;
      for (const t of acts) s = useCard(s, t);
      return s;
    },
  };
}
