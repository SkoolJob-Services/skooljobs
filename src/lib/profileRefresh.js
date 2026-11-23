import { config } from "../config/env";

/**
 * Re-reading data after a save. The services answer 202 and store the change a moment later,
 * so a read straight away can still return the old copy.
 *
 * Preferred: the service sends a notification over the notification WebSocket once the change
 * is stored (teacher-profile: UPDATE_TEACHER_PROFILE); the screen then reads once
 * (refreshAfterSave). Fallback when no socket is open or no notification comes: wait
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

// ---- "profile updated" notifications -------------------------------------------------------

let notificationsOpen = () => false;
let lastUpdateAt = 0;
const waiters = new Set();

/** The notification socket's state (TeacherLayout sets it): no socket, no waiting for it. */
export function setNotificationStatus(isOpen) {
  notificationsOpen = typeof isOpen === "function" ? isOpen : () => false;
}

/**
 * A "profile updated" notification arrived. Wakes the screens waiting for it after a save and
 * returns how many were waiting (0 = an update nobody here asked for, e.g. by an admin).
 */
export function signalProfileUpdated() {
  lastUpdateAt = Date.now();
  const count = waiters.size;
  waiters.forEach((wake) => wake(true));
  waiters.clear();
  return count;
}

/** True once a notification arrives after `since`; false after `timeoutMs` or with no socket. */
function waitForProfileUpdate(since, timeoutMs) {
  if (lastUpdateAt >= since) return Promise.resolve(true);
  if (!notificationsOpen()) return Promise.resolve(false);
  return new Promise((resolve) => {
    let timer;
    const wake = (value) => {
      clearTimeout(timer);
      waiters.delete(wake);
      resolve(value);
    };
    timer = setTimeout(() => wake(false), timeoutMs);
    waiters.add(wake);
  });
}

/** Timestamp to take just before sending a save (pass it to refreshAfterSave as `since`). */
export const saveStartedAt = () => Date.now();

/**
 * After a save: wait for the "profile updated" notification (at most delay × attempts), then
 * read once. When no notification comes (or the change isn't there yet), fall back to
 * refreshUntil. Pass `since` = Date.now() taken just before sending the save. Resolves like
 * refreshUntil.
 */
export async function refreshAfterSave(load, isDone = () => true, { since = Date.now(), policy = PROFILE_REFRESH } = {}) {
  const notified = await waitForProfileUpdate(since, policy.delayMs * policy.attempts);
  if (notified) {
    try {
      const result = await load();
      if (isDone(result)) return { result, done: true };
    } catch (error) {
      console.warn("Read after the update notification failed:", error);
    }
  }
  return refreshUntil(load, isDone, policy);
}
