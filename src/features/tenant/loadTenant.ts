import { isApiError } from "../../api/errors";

/** Waits before the 2nd and 3rd attempt of GET /tenants/current. */
export const TENANT_RETRY_DELAYS_MS = [500, 1500];

/**
 * A failure worth trying again: no response at all (connection dropped, server
 * restarting) or a gateway error. A 4xx (unknown tenant, bad client id) is final.
 */
export function isTransientFailure(error: unknown): boolean {
  if (!isApiError(error)) return false;
  return error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504;
}

/**
 * Calls load, retrying transient failures after each delay. Stops early when
 * isCancelled() turns true (the component unmounted or a manual retry started).
 */
export async function loadWithRetry<T>(
  load: () => Promise<T>,
  isCancelled: () => boolean,
  delays: number[] = TENANT_RETRY_DELAYS_MS,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await load();
    } catch (error) {
      if (attempt >= delays.length || !isTransientFailure(error) || isCancelled()) throw error;
      await sleep(delays[attempt]);
      if (isCancelled()) throw error;
    }
  }
}
