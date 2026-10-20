export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  tenantId?: string;
  appId?: string;
  /** Email or phone the user logged in with. */
  identifier: string;
}
