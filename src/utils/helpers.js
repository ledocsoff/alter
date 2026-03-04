// Shared utility functions

/**
 * Pick a random element from an array.
 * @template T
 * @param {T[]} arr
 * @returns {T}
 */
export const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
