// vitest.config.js
// Standalone test config: Vitest takes this file over vite.config.js, so the
// app's build plugins (React, PWA) stay out of the test run. The current tests
// cover plain JS modules under src/lib, so the default Node environment is enough.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{js,jsx}"],
  },
});
