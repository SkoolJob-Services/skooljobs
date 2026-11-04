/**
 * X-Session-Id handling — isolated here on purpose.
 *
 * The contract requires X-Session-Id on /signup/complete and
 * /auth/login/otp/verify, but the calls that start those flows
 * (/signup/session, /auth/login/otp, /invites/accept) don't document
 * returning one. Until the backend confirms the mechanism, this app:
 *
 *   1. generates a session id on the client when a flow starts,
 *   2. sends it as X-Session-Id on the starting call as well, and
 *   3. prefers an X-Session-Id response header if the server returns one.
 *
 * When the backend team confirms the real mechanism, change only this file.
 * Note: a response header is readable in the browser only if the server lists
 * it in Access-Control-Expose-Headers (or the app is served same-origin).
 */

export const SESSION_HEADER = "X-Session-Id";

export function newFlowSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `sess_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `sess_${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
}

export function resolveSessionId(responseHeaders: Headers, sentSessionId: string): string {
  return responseHeaders.get(SESSION_HEADER) ?? sentSessionId;
}
