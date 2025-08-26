import { createRng, shuffle } from "../shared/rng.js";

/**
 * Create initial game state with deterministic seed.
 * @param {{ rounds?: number, mode?: 'quick'|'normal'|'extended' }} config
 * @param {number} seed
 */
export function createInitialState(
  config = { rounds: 8, mode: "normal" },
  seed = 123456
) {
  const rng = createRng(seed);
  const rounds = config?.rounds ?? 8;
  const base = {
    config: { rounds, mode: config?.mode ?? "normal" },
    round: {
      index: 1,
      tendency: null,
      usedCards: [],
      roll: null,
      tempScore: 0,
      rollMe: null,
      rollAi: null,
      currentScores: { me: 0, ai: 0 },
      scoreBoostMe: 0,
      scoreBoostAi: 0,
    },
    players: {
      me: { total: 1, energy: 0, shields: 0, gauge: 0, cards: [] },
      ai: { total: 1, energy: 0, shields: 0, gauge: 0, cards: [] },
    },
    decks: {
      cards: { draw: [], discard: [] },
      events: { draw: [], discard: [] },
    },
    scheduled: { luckNext: false, curseNext: 0, bonusTurnNext: false },
    stats: { consecSix: 0, rollCounts: {}, lastWinner: null, winStreakMe: 0, lossStreakMe: 0, winStreakAi: 0, lossStreakAi: 0 },
    log: [],
    rng,
  };

  // Build card deck by distribution: attack 7, defense 7, boost 3, steal 2, reset 1
  const cardDist = [
    ...Array(7).fill("attack"),
    ...Array(7).fill("defense"),
    ...Array(3).fill("boost"),
    ...Array(2).fill("steal"),
    "reset",
  ].map((type, i) => ({ id: `C${i + 1}`, type }));
  base.decks.cards.draw = shuffle(cardDist, rng);

  // Build event deck: 8 none, 4 positive, 4 negative, 4 neutral (labels)
  const eventDist = [
    ...Array(8).fill("none"),
    ...Array(4).fill("positive"),
    ...Array(4).fill("negative"),
    ...Array(4).fill("neutral"),
  ].map((kind, i) => ({ id: `E${i + 1}`, kind }));
  base.decks.events.draw = shuffle(eventDist, rng);

  base.log.push(["phase:init", { seed, rounds }]);
  return base;
}
