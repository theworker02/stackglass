import { spawnSync } from "node:child_process";
import path from "node:path";

const script = path.resolve(import.meta.dirname, "sync-brand.mjs");
const result = spawnSync(process.execPath, [script], { stdio: "inherit" });
if (result.status) process.exit(result.status);
console.log("ok");
