import { config } from "../config/env";

/**
 * Re-reading data after a save. The services answer 202 and store the change a moment later,
 * so a read straight away can still return the old copy. Instead of reading often, wait
 * VITE_PROFILE_REFRESH_DELAY_MS (default 2500 ms) before each read and stop as soon as the
 * change shows, after at most VITE_PROFILE_REFRESH_ATTEMPTS reads (default 3).
 */
export const PROFILE_REFRESH = {
  delayMs: config.profileRefreshDelayMs,
  attempts: config.profileRefreshAttempts,
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calls `load()` after the delay; repeats while `isDone(result)` is false, up to the attempt
 * limit. A failed read counts as an attempt. Resolves with { result, done }: the last result
 * read (undefined if every read failed) and whether `isDone` was met.
 */
export async function refreshUntil(load, isDone = () => true, policy = PROFILE_REFRESH) {
  let result;
  for (let attempt = 1; attempt <= policy.attempts; attempt += 1) {
    await wait(policy.delayMs);
    try {
      result = await load();
      if (isDone(result)) return { result, done: true };
    } catch (error) {
      console.warn(`Refresh read ${attempt} of ${policy.attempts} failed:`, error);
    }
  }
  return { result, done: false };
}
