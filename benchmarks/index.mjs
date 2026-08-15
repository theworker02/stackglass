import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repo = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const vitest = path.join(repo, "node_modules", "vitest", "vitest.mjs");
const result = spawnSync(process.execPath, [vitest, "run", "tests/performance.test.ts"], {
  cwd: repo,
  stdio: "inherit",
});
process.exit(result.status ?? 1);
