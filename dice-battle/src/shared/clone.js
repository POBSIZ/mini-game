// Small helpers to make immutable updates ergonomic.

/**
 * Shallow clone for objects and arrays.
 * @param {any} o
 */
export const clone = (o) => (Array.isArray(o) ? [...o] : { ...o });
