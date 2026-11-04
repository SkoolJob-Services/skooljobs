import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSnackbar } from "@cloudstrytech/ui-components";
import { authApi, configureAuthBridge, type LoginResponse } from "../../api";
import { clearLegacyUser, toLegacyUser, writeLegacyUser } from "./legacyUser";
import { roleFromToken, ROLE_HOME, subjectFromToken, type AppRole } from "./roles";
import { sessionStore } from "./sessionStore";
import type { AuthSession } from "./types";

interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  /** App role worked out from the access token (see roles.ts). */
  role: AppRole;
  /** Raw role codes found in the token. */
  roleCodes: string[];
  /** Home page of the user's area (e.g. /teacher/dashboard). */
  homePath: string;
  /** Stable key for per-user data: token subject, else tenant + login identifier. */
  userKey: string | null;
  /** Store the session returned by /auth/login/otp/verify. */
  signIn(response: LoginResponse, identifier: string): void;
  /** Call /auth/logout and clear the session (cleared even if the call fails). */
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Keep the existing pages' localStorage "currentUser" in step with the session (see legacyUser.ts). */
function syncLegacyUser(session: AuthSession): void {
  const { role, roleCodes } = roleFromToken(session.accessToken);
  writeLegacyUser(toLegacyUser(session, role, roleCodes));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const restored = sessionStore.load();
    if (restored) syncLegacyUser(restored);
    return restored;
  });
  const sessionRef = useRef(session);
  sessionRef.current = session;
  // Keep the snackbar API in a ref so callbacks stay stable across renders.
  const snackbar = useSnackbar();
  const snackbarRef = useRef(snackbar);
  snackbarRef.current = snackbar;
  const signingOutRef = useRef(false);

  const clearSession = useCallback(() => {
    sessionStore.clear();
    clearLegacyUser();
    setSession(null);
  }, []);

  useEffect(() => {
    configureAuthBridge({
      getAccessToken: () => sessionRef.current?.accessToken ?? null,
      onUnauthorized: () => {
        if (!sessionRef.current || signingOutRef.current) return;
        clearSession();
        snackbarRef.current.show({ message: "Your session has ended. Please log in again.", type: "warning" });
      },
    });
  }, [clearSession]);

  const signIn = useCallback((response: LoginResponse, identifier: string) => {
    const next: AuthSession = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      sessionId: response.sessionId,
      tenantId: response.tenantId,
      appId: response.appId,
      identifier,
    };
    sessionStore.save(next);
    // Written before the state update so the dashboard sees it on its first render.
    syncLegacyUser(next);
    setSession(next);
  }, []);

  const signOut = useCallback(async () => {
    signingOutRef.current = true;
    try {
      await authApi.logout();
    } catch {
      // Server-side logout failed or the token already expired — still end the local session.
    } finally {
      signingOutRef.current = false;
      clearSession();
      snackbarRef.current.show({ message: "You've been logged out.", type: "info" });
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(() => {
    const { role, roleCodes } = roleFromToken(session?.accessToken);
    const userKey = session
      ? (subjectFromToken(session.accessToken) ?? `${session.tenantId ?? "tenant"}:${session.identifier}`)
      : null;
    return {
      session,
      isAuthenticated: session !== null,
      role,
      roleCodes,
      homePath: ROLE_HOME[role],
      userKey,
      signIn,
      signOut,
    };
  }, [session, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
