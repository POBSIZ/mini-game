import { emit } from "../shared/events.js";
import { rollDice, resolveTendency, resolveSpecial } from "../systems/dice.js";
import { drawEvent, applyEvent } from "../systems/events.js";
import { addGauge, useCard } from "../systems/cards.js";
import { gainEnergy } from "../systems/energy.js";
import { consumeShield, addShield } from "../systems/shield.js";

/**
 * Run a single round for the player only (demo scope).
 * Applies scheduled effects, dice roll, specials, and event draw.
 * @param {any} state
 * @param {'attack'|'defense'|'balance'} tendency
 */
export function startRound(state, tendency) {
  emit("phase:*", { name: "round:start", index: state.round.index });

  // Pre-round bonuses
  if (tendency === "balance") {
    state.players.me.energy = Math.min(10, state.players.me.energy + 1);
    state = addGauge(state, 1);
  }
  // Round start base energy gain: 2-3 (3 if last round lost), else 2
  const lostLast = state.stats.lastWinner && state.stats.lastWinner !== "me";
  state = gainEnergy(state, lostLast ? 3 : 2);

  // Scheduled delayed effects
  if (state.scheduled.curseNext > 0) {
    state.round.tempScore = Math.max(
      0,
      state.round.tempScore - state.scheduled.curseNext
    );
    state.scheduled.curseNext = 0;
  }

  // Roll (consider lucky reroll choose higher)
  let r1 = rollDice(state.rng);
  if (state.scheduled.luckNext) {
    const r2 = rollDice(state.rng);
    r1 = Math.max(r1, r2);
    state.scheduled.luckNext = false;
  }
  state.round.tendency = tendency;
  state.round.roll = r1;
  state.round.rollMe = r1;
  // Stats: track counts and consecutive sixes
  state.stats.rollCounts[r1] = (state.stats.rollCounts[r1] || 0) + 1;
  state.stats.consecSix = r1 === 6 ? state.stats.consecSix + 1 : 0;

  const res = resolveTendency(tendency, r1);
  let roundScore = res.baseScore + (res.bonus?.plus || 0);
  if (res.bonus?.shield) {
    state.players.me.shields = Math.min(2, state.players.me.shields + 1);
  }

  const specials = resolveSpecial(tendency, r1, state.rng);
  // Apply specials with minimal rules: attack -2/ -3 or double; defense gains are handled above
  for (const sp of specials) {
    const kind = sp[1];
    if (sp[0] === "attack:special") {
      if (kind === "⚡") {
        const res = consumeShield(state, "attack-die", "me");
        state = res.state;
        if (!res.blocked) roundScore = Math.max(0, roundScore - 2);
      } else if (kind === "🔥") {
        const res = consumeShield(state, "flame-die-now", "me");
        state = res.state;
        if (!res.blocked) roundScore = Math.max(0, roundScore - 3);
        // next round -1 cannot be blocked
        state.scheduled.curseNext += 1;
      } else if (kind === "🎯") {
        roundScore *= 2;
      }
    } else if (sp[0] === "defense:special") {
      if (kind === "🛡️") {
        state = addShield(state, 1, "me");
      } else if (kind === "⭐") {
        const bonus = 2 + Math.floor(state.rng.next() * 5); // 2..6
        roundScore += bonus;
      }
    }
  }

  // Apply boost card multiplier if active
  if (state.round.boostActive) {
    roundScore *= 2;
  }

  // Bonus turn handling
  if (state.scheduled.bonusTurnNext) {
    const rB = rollDice(state.rng);
    const resB = resolveTendency(tendency, rB);
    let add = resB.baseScore + (resB.bonus?.plus || 0);
    if (resB.bonus?.shield) {
      state.players.me.shields = Math.min(2, state.players.me.shields + 1);
    }
    const spB = resolveSpecial(tendency, rB, state.rng);
    for (const sp of spB) {
      const kind = sp[1];
      if (sp[0] === "attack:special") {
        if (kind === "⚡") {
          if (state.players.me.shields > 0) state.players.me.shields -= 1;
          else add = Math.max(0, add - 2);
        } else if (kind === "🔥") {
          if (state.players.me.shields > 0) state.players.me.shields -= 1;
          else add = Math.max(0, add - 3);
          state.scheduled.curseNext += 1;
        } else if (kind === "🎯") add *= 2;
      } else if (sp[0] === "defense:special") {
        if (kind === "🛡️")
          state.players.me.shields = Math.min(2, state.players.me.shields + 1);
        else if (kind === "⭐") add += 2 + Math.floor(state.rng.next() * 5);
      }
    }
    if (state.round.boostActive) add *= 2;
    roundScore += add;
    state.log.push(["bonus:roll", { value: rB }], ...spB);
    state.scheduled.bonusTurnNext = false;
  }

  // Gauge triggers
  if ((state.stats.rollCounts[r1] || 0) >= 2) {
    state = addGauge(state, 1);
  }
  if (state.stats.consecSix >= 2) {
    // instant card, gauge unchanged
    state = { ...state };
    // Draw directly
    // reuse card draw by addingGauge(5) pattern? Instead, call addGauge with +5 to grant exactly one card, then revert gauge
    const before = state.players.me.gauge;
    state = addGauge(state, 5);
    state.players.me.gauge = before; // no gauge change
    state.stats.consecSix = 0;
  }

  // Round score 15+ grants +1 gauge
  if (roundScore >= 15) state = addGauge(state, 1);

  // Store computed score to be finalized later
  state.round.currentScore = Math.max(0, roundScore);
  state.round.currentScores = {
    ...state.round.currentScores,
    me: state.round.currentScore,
  };
  return state;
}

export function finalizeRound(state) {
  // Initialize tempScore from currentScore before events
  state.round.tempScore = state.round.currentScore ?? 0;
  // Apply event draw (both players) after card/shield effects
  const evMe = drawEvent(state, state.rng);
  state = applyEvent(state, evMe, "me");
  const evAi = drawEvent(state, state.rng);
  state = applyEvent(state, evAi, "ai");

  state.round.tempScore = Math.max(
    0,
    (state.round.tempScore || 0) + (state.round.scoreBoost || 0)
  );
  state.players.me.total = Math.max(
    1,
    state.players.me.total + state.round.tempScore
  );
  // Accumulate AI round score as well (after applying its score boost above)
  const aiRoundAccum = Math.max(0, state.round.currentScores?.ai || 0);
  state.players.ai.total = Math.max(1, state.players.ai.total + aiRoundAccum);
  // Apply AI score boost to its round score (tracked only for comparison)
  const aiBoost = state.round.scoreBoostAi || 0;
  if (aiBoost && state.round.currentScores) {
    state.round.currentScores.ai += aiBoost;
  }
  // Determine round winner and award energy + streaks
  const meRound = state.round.currentScores?.me ?? state.round.tempScore;
  const aiRound = state.round.currentScores?.ai ?? 0;
  let winner = null;
  if (meRound > aiRound) winner = "me";
  else if (aiRound > meRound) winner = "ai";
  state.stats.lastWinner = winner;
  if (winner === "me") {
    state.players.me.energy = Math.min(10, state.players.me.energy + 1);
    state.stats.winStreakMe += 1;
    state.stats.lossStreakMe = 0;
    state.stats.winStreakAi = 0;
    state.stats.lossStreakAi += 1;
  } else if (winner === "ai") {
    state.players.ai.energy = Math.min(10, state.players.ai.energy + 1);
    state.stats.winStreakAi += 1;
    state.stats.lossStreakAi = 0;
    state.stats.winStreakMe = 0;
    state.stats.lossStreakMe += 1;
  } else {
    state.stats.winStreakMe = 0;
    state.stats.winStreakAi = 0;
  }
  if (state.stats.lossStreakMe === 2) {
    state.players.me.gauge += 1;
    state.stats.lossStreakMe = 0;
  }
  if (state.stats.winStreakMe === 3) {
    state.players.me.gauge += 1;
    state.stats.winStreakMe = 0;
  }
  // Scoring breakdown log
  state.log.push([
    "score:final",
    { round: state.round.tempScore, total: state.players.me.total },
  ]);
  emit("phase:*", { name: "round:end", index: state.round.index });

  // Prepare next round
  state.log.push([
    "round",
    { index: state.round.index, roll: state.round.roll },
  ]);
  state.round.index += 1;
  state.round.tempScore = 0;
  state.round.roll = null;
  state.round.rollMe = null;
  state.round.rollAi = null;
  state.round.tendency = null;
  state.round.scoreBoost = 0;
  state.round.scoreBoostAi = 0;
  state.round.boostActive = false;
  state.round.currentScore = 0;
  state.round.currentScores = { me: 0, ai: 0 };
  return state;
}

export function runRound(state, tendency) {
  state = startRound(state, tendency);
  state = finalizeRound(state);
  return state;
}
