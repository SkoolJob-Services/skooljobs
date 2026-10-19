// vitest.config.js
// Standalone test config: Vitest takes this file over vite.config.js, so the
// app's build plugins (React, PWA) stay out of the test run. The tests cover
// plain modules (src/lib, src/features/**/…), so the default Node environment is enough.
// `npm test` runs them once; `npm run test:ci` also writes a JUnit report for Jenkins.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{js,jsx,ts,tsx}"],
  },
});
