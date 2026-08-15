#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "dist-release");
const staging = path.join(out, "staging");
const version = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version;

const required = [
  "cli/dist/bin.js",
  "servers/mcp/dist/bin.js",
  "packages/core/dist/index.js",
  "scripts/glass.mjs",
  "scripts/stackglass-mcp.mjs",
  "dist/cursor-plugin/.cursor-plugin/plugin.json",
  "LICENSE",
];

for (const rel of required) {
  if (!existsSync(path.join(root, rel))) {
    console.error(`missing release input: ${rel} (run npm run build && npm run plugin:build)`);
    process.exit(1);
  }
}

rmSync(out, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });

function copyTree(rel) {
  const from = path.join(root, rel);
  const to = path.join(staging, rel);
  mkdirSync(path.dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
}

copyTree("cli/dist");
copyTree("cli/package.json");
copyTree("packages/core/dist");
copyTree("packages/core/package.json");
copyTree("servers/mcp/dist");
copyTree("servers/mcp/package.json");
copyTree("scripts/glass.mjs");
copyTree("scripts/stackglass-mcp.mjs");
copyTree("LICENSE");

writeFileSync(
  path.join(staging, "package.json"),
  `${JSON.stringify(
    {
      name: "stackglass",
      version,
      private: true,
      description: "Stackglass CLI and MCP runtime from a GitHub Release. Not an npm package.",
      license: "MIT",
      type: "module",
      engines: { node: ">=22.13.0" },
      workspaces: ["packages/core", "cli", "servers/mcp"],
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  path.join(staging, "README.md"),
  `# Stackglass ${version}

This zip is a GitHub Release runtime. It is **not** an npm package. Do not \`npm publish\`, \`npm pack\`, or \`npm link\`.

Requires **Node.js >= 22.13.0**.

## CLI

From this extracted directory:

\`\`\`bash
node cli/dist/bin.js help
node scripts/glass.mjs status
\`\`\`

Against another project:

\`\`\`bash
node /path/to/stackglass/cli/dist/bin.js init
node /path/to/stackglass/cli/dist/bin.js why
\`\`\`

If \`node_modules\` is missing (or you want a clean install):

\`\`\`bash
npm install --omit=dev --ignore-scripts
\`\`\`

## MCP server (22 tools)

\`\`\`bash
node scripts/stackglass-mcp.mjs
node servers/mcp/dist/bin.js
\`\`\`

Point the server at the workspace to observe:

\`\`\`bash
set STACKGLASS_ROOT=C:\\path\\to\\your\\project
node scripts/stackglass-mcp.mjs
\`\`\`

On macOS/Linux: \`STACKGLASS_ROOT=/path/to/your/project node scripts/stackglass-mcp.mjs\`

## Cursor plugin

Use \`stackglass-cursor-plugin.zip\` from the same GitHub Release. That zip is the Open Plugins layout (\`.cursor-plugin/plugin.json\`, \`mcp.json\`, rules, skills, agents, commands, hooks).

Docs: https://theworker02.github.io/stackglass/
`,
);

execFileSync("npm", ["install", "--omit=dev", "--ignore-scripts", "--no-fund", "--no-audit"], {
  cwd: staging,
  stdio: "inherit",
  shell: process.platform === "win32",
});

function zipDirectory(sourceDir, zipPath) {
  rmSync(zipPath, { force: true });
  execFileSync("tar", ["-a", "-c", "-f", zipPath, "-C", sourceDir, "."], { stdio: "inherit" });
}

const cliZip = path.join(out, "stackglass-cli.zip");
const mcpZip = path.join(out, "stackglass-mcp.zip");
const pluginZip = path.join(out, "stackglass-cursor-plugin.zip");

zipDirectory(staging, cliZip);
zipDirectory(staging, mcpZip);
zipDirectory(path.join(root, "dist", "cursor-plugin"), pluginZip);

const checksumLines = [];
for (const file of ["stackglass-cli.zip", "stackglass-mcp.zip", "stackglass-cursor-plugin.zip"]) {
  const bytes = readFileSync(path.join(out, file));
  checksumLines.push(`${createHash("sha256").update(bytes).digest("hex")}  ${file}`);
}
writeFileSync(path.join(out, "checksums.txt"), `${checksumLines.join("\n")}\n`);

rmSync(staging, { recursive: true, force: true });

const artifacts = readdirSync(out).filter((name) => statSync(path.join(out, name)).isFile());
console.log(`release artifacts in dist-release: ${artifacts.join(", ")}`);
