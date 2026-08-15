#!/usr/bin/env node
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const bin = path.join(root, "cli", "dist", "bin.js");
if (!existsSync(bin)) {
  console.error("Stackglass is not built. In this clone run: npm install && npm run build");
  process.exit(1);
}
const child = spawn(process.execPath, [bin, ...process.argv.slice(2)], {
  stdio: "inherit",
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
