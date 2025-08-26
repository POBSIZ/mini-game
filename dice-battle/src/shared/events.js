// Lightweight event bus used for engine phases and domain events.

const listeners = new Map();

/**
 * Subscribe to event type.
 * @param {string} type
 * @param {(payload:any)=>void} fn
 */
export function on(type, fn) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(fn);
}

/**
 * Unsubscribe from event type.
 * @param {string} type
 * @param {(payload:any)=>void} fn
 */
export function off(type, fn) {
  listeners.get(type)?.delete(fn);
}

/**
 * Emit event to all subscribers.
 * @param {string} type
 * @param {any} payload
 */
export function emit(type, payload) {
  listeners.get(type)?.forEach((fn) => fn(payload));
}
