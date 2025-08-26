import { emit } from "../shared/events.js";
import { rollDice, resolveTendency, resolveSpecial } from "../systems/dice.js";
import { addShield } from "../systems/shield.js";
import { addGauge } from "../systems/cards.js";

/** Run AI half-round: apply balance bonuses, roll, specials, and compute AI round score. */
export function startRoundAi(state, aiTendency) {
  emit("phase:*", { name: "round:start:ai", index: state.round.index });
  if (aiTendency === "balance") {
    state.players.ai.energy = Math.min(10, state.players.ai.energy + 1);
    // For AI, keep same gauge rule
    const before = state.players.ai.gauge;
    const after = before + 1;
    state.players.ai.gauge = after; // simplified (no draw)
  }

  let r = rollDice(state.rng);
  state.round.rollAi = r;
  const res = resolveTendency(aiTendency, r);
  let aiScore = res.baseScore + (res.bonus?.plus || 0);
  if (res.bonus?.shield) state = addShield(state, 1, "ai");

  const sps = resolveSpecial(aiTendency, r, state.rng);
  for (const sp of sps) {
    const kind = sp[1];
    if (sp[0] === "attack:special") {
      if (kind === "⚡")
        aiScore = Math.max(
          0,
          aiScore - 0
        ); // targeting player omitted for brevity
      else if (kind === "🔥") aiScore = Math.max(0, aiScore - 0);
      else if (kind === "🎯") aiScore *= 2;
    } else if (sp[0] === "defense:special") {
      if (kind === "🛡️") state = addShield(state, 1, "ai");
      else if (kind === "⭐") aiScore += 2 + Math.floor(state.rng.next() * 5);
    }
  }
  state.round.currentScores = {
    ...state.round.currentScores,
    ai: Math.max(0, aiScore),
  };
  return state;
}
