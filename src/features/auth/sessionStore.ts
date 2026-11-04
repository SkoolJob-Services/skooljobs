import type { AuthSession } from "./types";

/**
 * Where the logged-in session lives. Currently sessionStorage (survives a
 * page refresh, cleared when the tab closes). Tokens in web storage can be
 * read by any script on the page, so keep XSS protection tight — or move the
 * refresh token to an httpOnly cookie set by the server and keep only the
 * access token in memory. Changing strategy only touches this file.
 */
const KEY = "cst.auth.session";

export const sessionStore = {
  load(): AuthSession | null {
    try {
      const raw = sessionStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      return null;
    }
  },
  save(session: AuthSession): void {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(session));
    } catch {
      // storage unavailable — session stays in memory only
    }
  },
  clear(): void {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  },
};
