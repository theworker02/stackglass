#!/usr/bin/env node
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const bin = path.join(root, "servers", "mcp", "dist", "bin.js");
if (!existsSync(bin)) {
  console.error(
    "Stackglass MCP is not built. In this clone run: npm install && npm run build",
  );
  process.exit(1);
}
await import(pathToFileURL(bin).href);
