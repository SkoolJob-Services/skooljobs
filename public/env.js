// Runtime settings. In Docker this file is rewritten at container start from
// environment variables (40-runtime-config.sh in the ci-library UI image). Empty values
// fall back to the VITE_* settings used at build time, so local `npm run dev` is unaffected.
window.__APP_CONFIG__ = {};
