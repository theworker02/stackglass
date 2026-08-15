import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const dest = path.join(root, "dist", "cursor-plugin");

const brand = spawnSync(process.execPath, [path.join(root, "scripts/sync-brand.mjs")], {
  stdio: "inherit",
});
if (brand.status) process.exit(brand.status);

const files = [
  ".cursor-plugin/plugin.json",
  "mcp.json",
  "rules",
  "skills",
  "agents",
  "commands",
  "hooks",
  "scripts/session-start.mjs",
  "scripts/stackglass-mcp.mjs",
  "assets/logo.svg",
];

for (const rel of files) {
  if (!existsSync(path.join(root, rel))) {
    console.error(`missing plugin path: ${rel}`);
    process.exit(1);
  }
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

for (const rel of files) {
  const out = path.join(dest, rel);
  mkdirSync(path.dirname(out), { recursive: true });
  cpSync(path.join(root, rel), out, { recursive: true });
}

writeFileSync(
  path.join(dest, "README.md"),
  `# Stackglass Cursor plugin

This directory is the Cursor plugin bundle. In the Git repository the same
layout lives at the project root so Cursor Open Plugins can load it:

\`\`\`text
.cursor-plugin/plugin.json
mcp.json
rules/
skills/
agents/
commands/
hooks/hooks.json
scripts/session-start.mjs
scripts/stackglass-mcp.mjs
assets/logo.svg
\`\`\`

Clone this repository, run \`npm install\` and \`npm run build\`, then
\`node cli/dist/bin.js init\` in the target workspace. \`mcp.json\` starts
\`node \${PLUGIN_ROOT}/scripts/stackglass-mcp.mjs\` and sets \`STACKGLASS_ROOT\`
to the current workspace.
`,
);

console.log("plugin staged at dist/cursor-plugin");
