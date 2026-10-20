import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi, type TenantInfoResponse } from "../../api";
import { errorMessage } from "../../lib/errorMessages";

type TenantStatus = "loading" | "ready" | "error";

interface TenantContextValue {
  status: TenantStatus;
  tenant: TenantInfoResponse | null;
  error: string | null;
  /** Self-signup is offered only when the tenant's policy allows it. */
  signupAllowed: boolean;
  /** Signup types a user may choose from (tenant.selfSignupTypes). */
  signupTypes: string[];
  retry(): void;
}

export const TenantContext = createContext<TenantContextValue | null>(null);

/** Policies that allow self-signup. Adjust when the backend documents the full list. */
const OPEN_POLICIES = ["OPEN"];

export function TenantProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<TenantStatus>("loading");
  const [tenant, setTenant] = useState<TenantInfoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    authApi
      .getCurrentTenant()
      .then((result) => {
        if (cancelled) return;
        setTenant(result);
        setError(null);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(errorMessage(err, "tenant"));
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const value = useMemo<TenantContextValue>(() => {
    const policy = tenant?.signupPolicy?.toUpperCase();
    return {
      status,
      tenant,
      error,
      signupAllowed: policy === undefined || OPEN_POLICIES.includes(policy),
      signupTypes: tenant?.selfSignupTypes ?? [],
      retry,
    };
  }, [status, tenant, error, retry]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used inside <TenantProvider>");
  return ctx;
}
