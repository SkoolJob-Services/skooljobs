// Base paths for the OpenAPI-generated clients. The generated operations use
// bare resource paths (e.g. `/jobs`, `/school-profiles`), so each base path is
// the only prefix: `/api/job` + `/jobs` -> `/api/job/jobs`.
//
// Paths are relative so requests go to whatever origin served the app (HTTP
// or HTTPS) and the Edge Nginx routes them. In `npm run dev`, vite.config.js
// proxies the same paths to the local services.
//
// VITE_API_ORIGIN is optional and empty by default; set it only for builds
// that are not served from the Edge Nginx origin (e.g. the Capacitor app).
const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || "").replace(/\/+$/, "");

export const API_BASE_PATHS = {
    schoolProfile: `${API_ORIGIN}/api/school-profile`,
    job: `${API_ORIGIN}/api/job`,
    teacherProfile: `${API_ORIGIN}/api/teacher-profile`,
    application: `${API_ORIGIN}/api/application`,
};

// WebSocket notifications: same host as the page, ws/wss matching http/https.
export const getWebSocketOrigin = () => {
    if (API_ORIGIN) {
        return API_ORIGIN.replace(/^http/, "ws");
    }
    const { protocol, host } = window.location;
    return `${protocol === "https:" ? "wss:" : "ws:"}//${host}`;
};
