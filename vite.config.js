// vite.config.js
import process from "node:process";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Dev-only proxy mirroring the Edge Nginx routes, so the relative API paths in
// src/services/apiConfig.js work under `npm run dev`. The prefix is stripped
// because the local services serve bare paths (e.g. localhost:8085/jobs), the
// same targets the services called directly before. Override a target in
// .env.local. The Application API has no known local port, so its proxy is
// only added when DEV_APPLICATION_API_TARGET is set.
const apiProxy = (target, prefix) => ({
  target,
  changeOrigin: true,
  rewrite: (path) => path.replace(prefix, ""),
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "DEV_");
  const proxy = {
    "/api/school-profile": apiProxy(env.DEV_SCHOOL_PROFILE_API_TARGET || "http://localhost:8081", /^\/api\/school-profile/),
    "/api/job": apiProxy(env.DEV_JOB_API_TARGET || "http://localhost:8085", /^\/api\/job/),
    "/api/teacher-profile": apiProxy(env.DEV_TEACHER_PROFILE_API_TARGET || "http://localhost:8086", /^\/api\/teacher-profile/),
    "/ws/notifications": {
      target: env.DEV_NOTIFICATION_WS_TARGET || "ws://localhost:8080",
      ws: true,
      changeOrigin: true,
    },
  };
  if (env.DEV_APPLICATION_API_TARGET) {
    proxy["/api/application"] = apiProxy(env.DEV_APPLICATION_API_TARGET, /^\/api\/application/);
  }

  return {
    server: { proxy },
    plugins: [
      react(),
      VitePWA({
        injectRegister: "script",
        registerType: "autoUpdate",
        includeAssets: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp}"],
        workbox: {
          // The nsfwjs moderation model weights (~3.5MB) are dynamically
          // imported only when a user actually uploads an image - exclude them
          // from service-worker precaching so every visitor doesn't pay that
          // download upfront. The browser's HTTP cache still serves repeat
          // requests since the chunk filename is content-hashed.
          globIgnores: ["**/group1-shard*.js"],
        },
        manifest: {
          name: "Skool Jobs",
          short_name: "Skool Jobs",
          description: "",
          display: "standalone",
          theme_color: "#575A59",
          background_color: "#ffffff",
          icons: [
            {
              src: "/logo192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/logo512.png",
              sizes: "512x512",
              type: "image/png",
            },
          ],
          screenshots: [
            {
              src: "/screenshots/mobile-home.png",
              sizes: "1080x1920",
              type: "image/png",
            },
            {
              src: "/screenshots/desktop-home.png",
              sizes: "1920x1080",
              type: "image/png",
              form_factor: "wide",
            },
          ],
        },
      }),
    ],
  };
});
