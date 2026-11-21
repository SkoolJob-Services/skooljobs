/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Only for builds not served behind the edge nginx (e.g. the Capacitor app). */
  readonly VITE_API_ORIGIN?: string;
  readonly VITE_CLIENT_ID?: string;
  readonly VITE_TENANT_CODE?: string;
  readonly VITE_DEFAULT_COUNTRY_CODE?: string;
  readonly VITE_USE_MOCK_API?: string;
  /** Wait before re-reading the profile after a save (ms). Default 2500. */
  readonly VITE_PROFILE_REFRESH_DELAY_MS?: string;
  /** How many times the profile is re-read after a save before giving up. Default 3. */
  readonly VITE_PROFILE_REFRESH_ATTEMPTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
