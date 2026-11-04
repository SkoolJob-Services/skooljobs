const env = import.meta.env;

/**
 * Settings injected when the container starts (public/env.js, rewritten by
 * 40-runtime-config.sh in the ci-library UI image). They win over the VITE_* build-time values,
 * so one Docker image can be deployed to every environment.
 */
interface RuntimeConfig {
  API_BASE_URL?: string;
  CLIENT_ID?: string;
  TENANT_CODE?: string;
  DEFAULT_COUNTRY_CODE?: string;
  USE_MOCK_API?: string;
}

const runtime: RuntimeConfig =
  (typeof window !== "undefined" && (window as unknown as { __APP_CONFIG__?: RuntimeConfig }).__APP_CONFIG__) || {};

/** Runtime value if set (non-empty), otherwise the build-time value. */
function pick(runtimeValue: string | undefined, buildValue: string | undefined): string | undefined {
  return runtimeValue !== undefined && runtimeValue !== "" ? runtimeValue : buildValue;
}

const TENANT_STORAGE_KEY = "cst.tenantCode";

/**
 * Tenant code for shared apps: ?tenant=CODE in the URL wins (and is remembered
 * for the browser tab), otherwise TENANT_CODE / VITE_TENANT_CODE. Swap this for
 * subdomain parsing if tenants get their own hostnames.
 */
function resolveTenantCode(): string | undefined {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("tenant");
    if (fromUrl) {
      sessionStorage.setItem(TENANT_STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    const remembered = sessionStorage.getItem(TENANT_STORAGE_KEY);
    if (remembered) return remembered;
  } catch {
    // storage unavailable — fall through to config
  }
  return pick(runtime.TENANT_CODE, env.VITE_TENANT_CODE) || undefined;
}

export const config = {
  /** Signup service (login, signup, invites), e.g. /api/signup behind the edge nginx. */
  apiBaseUrl: (pick(runtime.API_BASE_URL, env.VITE_API_BASE_URL) ?? "/api/signup").replace(/\/$/, ""),
  clientId: pick(runtime.CLIENT_ID, env.VITE_CLIENT_ID) ?? "",
  tenantCode: resolveTenantCode(),
  defaultCountryCode: pick(runtime.DEFAULT_COUNTRY_CODE, env.VITE_DEFAULT_COUNTRY_CODE) ?? "+91",
  useMockApi: pick(runtime.USE_MOCK_API, env.VITE_USE_MOCK_API) === "true",
} as const;
