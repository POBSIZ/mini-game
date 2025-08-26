// RNG with seedable xorshift32 PRNG
// JSDoc types are provided for clarity when using JS without TS.

/**
 * Create a deterministic RNG from a numeric seed.
 * All randomness in the game should flow through this RNG to ensure replays.
 * @param {number} seed
 */
export function createRng(seed = 123456789) {
  let s = seed >>> 0;
  return {
    /**
     * Return a float in [0, 1).
     * @returns {number}
     */
    next() {
      // xorshift32
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return (s >>> 0) / 0xffffffff;
    },
    /**
     * Roll an integer from 1..max inclusive (default 6 for dice).
     * @param {number} max
     * @returns {number}
     */
    roll(max = 6) {
      return 1 + Math.floor(this.next() * max);
    },
  };
}

/**
 * Shuffle array in-place using Fisher-Yates, driven by provided RNG.
 * @template T
 * @param {T[]} array
 * @param {{ next: () => number }} rng
 * @returns {T[]} The same array, shuffled
 */
export function shuffle(array, rng) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
