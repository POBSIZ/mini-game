// Dice system per docs: roll, resolveTendency, resolveSpecial

/** @param {{ roll:(max?:number)=>number }} rng */
export function rollDice(rng) {
  return rng.roll(6);
}

/**
 * @typedef {{ success:boolean, baseScore:number, bonus:any }} TendencyResult
 * @param {'attack'|'defense'|'balance'} tendency
 * @param {number} roll
 * @returns {TendencyResult}
 */
export function resolveTendency(tendency, roll) {
  if (tendency === "attack") {
    return {
      success: roll >= 4,
      baseScore: roll >= 4 ? roll : 1,
      bonus: roll === 6 ? { attackSix: true, plus: 3 } : null,
    };
  }
  if (tendency === "defense") {
    const success = roll >= 2 && roll <= 5;
    return {
      success,
      baseScore: success ? roll : 0,
      bonus: success ? { shield: +1 } : null,
    };
  }
  return { success: true, baseScore: roll, bonus: { energy: +1, gauge: +1 } };
}

/**
 * Resolve random special effects that become domain events.
 * @param {'attack'|'defense'|'balance'} tendency
 * @param {number} roll
 * @param {{ next:()=>number }} rng
 * @returns {Array<[string, any]>}
 */
export function resolveSpecial(tendency, roll, rng) {
  const events = [];
  if (tendency === "attack" && roll === 6) {
    const r = Math.floor(rng.next() * 3);
    events.push(["attack:special", ["⚡", "🔥", "🎯"][r]]);
  }
  if (tendency === "defense" && roll === 2) {
    const r = Math.floor(rng.next() * 2);
    events.push(["defense:special", ["🛡️", "⭐"][r]]);
  }
  return events;
}
