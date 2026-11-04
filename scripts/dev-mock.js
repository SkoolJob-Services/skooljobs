// `npm run dev:mock`: starts Vite with the in-browser mock API (OTP is always 123456).
// Sets the env vars from Node instead of `VAR=value vite` so it also works in
// Windows cmd.exe. process.env wins over the .env files, so .env.development.local
// still loads for everything else.
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// vite's package "exports" hide bin/, so point at the file directly.
const viteBin = join(__dirname, "../node_modules/vite/bin/vite.js");

const child = spawn(process.execPath, [viteBin, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, VITE_USE_MOCK_API: "true", VITE_CLIENT_ID: "local-dev" },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
