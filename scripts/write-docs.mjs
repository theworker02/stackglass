import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.join(process.cwd(), "apps/docs");

// Hand-crafted landing lives in apps/docs/index.md plus .vitepress/theme.
// Never write index.md from this generator — docs:build must keep the custom home.
const HAND_CRAFTED = new Set(["index.md"]);

function page(rel, title, body) {
  if (HAND_CRAFTED.has(rel) || rel === "index.md") {
    throw new Error(`refusing to overwrite hand-crafted page: ${rel}`);
  }
  const abs = path.join(root, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `# ${title}\n\n${body.trim()}\n`, "utf8");
}

page(
  "getting-started/introduction.md",
  "Introduction",
  `Stackglass is a local-first developer observability and verification platform for Cursor.

It is **not** an AI that writes code. Cursor already provides the coding agent. Stackglass gives that agent evidence about project state, tests, failures, history, configuration, contracts, and documentation.

The defining principle: **give coding agents evidence instead of forcing them to guess.**

Install the Cursor plugin: [https://cursor.directory/plugins/stackglass](https://cursor.directory/plugins/stackglass)

## What it is

A flight recorder, testing laboratory (GlassLab), change inspector, MCP server with **exactly 22 tools**, Cursor plugin, GlassLens, and a local dashboard. Version **1.1.0**.

## What it is not

Not a coding assistant. Not an npm package (\`bin\`, \`npm link\`, and \`npm publish\` are not part of this project). Not a 23rd MCP tool. Not a cloud that uploads source. \`release_readiness\` never publishes.

Missing data is reported as \`no_data\`, \`unavailable\`, or \`not_configured\`. Stackglass will not invent coverage or test results.`,
);

page(
  "getting-started/installation.md",
  "Installation",
  `Requires **Node.js 22.13** or later. Stackglass is **not** an npm package. Do not \`npm install -g stackglass\`, \`npm link\`, or \`npx stackglass\`.

## Cursor plugin

Install from [https://cursor.directory/plugins/stackglass](https://cursor.directory/plugins/stackglass).

That listing is the install CTA for the repository. You can also extract \`stackglass-cursor-plugin.zip\` from [GitHub Release v1.1.0](https://github.com/theworker02/stackglass/releases/tag/v1.1.0) and add the folder as an Open Plugin.

## Clone and build

\`\`\`bash
git clone https://github.com/theworker02/stackglass.git
cd stackglass
npm install
npm run build
node cli/dist/bin.js --help
\`\`\`

From another project: \`node /path/to/stackglass/cli/dist/bin.js init\`.

There is no global \`glass\` binary from npm. Use \`node cli/dist/bin.js\` or \`node scripts/glass.mjs\`.

## Release zips

Download from [v1.1.0](https://github.com/theworker02/stackglass/releases/tag/v1.1.0):

- \`stackglass-cli.zip\` — \`node cli/dist/bin.js help\`
- \`stackglass-mcp.zip\` — \`STACKGLASS_ROOT=/your/project node scripts/stackglass-mcp.mjs\`
- \`stackglass-cursor-plugin.zip\` — Cursor Open Plugins layout
- \`checksums.txt\` — SHA-256 of the zips

Verify hashes before you run an extracted tree. Full artifact instructions: [docs/RELEASE.md](https://github.com/theworker02/stackglass/blob/master/docs/RELEASE.md).

\`STACKGLASS_ROOT\` is the workspace to observe. If you launch the CLI or MCP from the Stackglass checkout, set it to the user project.`,
);

page(
  "getting-started/quick-start.md",
  "Quick Start",
  `\`\`\`bash
cd your-project
glass init
glass status
glass test related
glass dashboard
\`\`\`

\`glass init\` is idempotent. It detects languages, packages, test frameworks, creates \`.stackglass/\`, initializes the local database, and writes a first snapshot.`,
);

page(
  "getting-started/cursor-setup.md",
  "Cursor Setup",
  `Install the plugin from [https://cursor.directory/plugins/stackglass](https://cursor.directory/plugins/stackglass).

Stackglass integrates with Cursor through the official Open Plugins layout at the **repository root**:

- MCP server \`stackglass\` — \`node scripts/stackglass-mcp.mjs\`, 22 tools, resources, prompts
- Rules in \`rules/\`
- Skills in \`skills/\`
- Agents in \`agents/\`
- Commands in \`commands/\`
- Hooks in \`hooks/\`
- \`mcp.json\` sets \`STACKGLASS_ROOT\` to the current workspace

\`\`\`text
.cursor-plugin/plugin.json
mcp.json
rules/
skills/
agents/
commands/
hooks/
scripts/stackglass-mcp.mjs
\`\`\`

After the plugin is available:

1. Clone this repository (or extract \`stackglass-cli.zip\`) and, for a source checkout, run \`npm install\` then \`npm run build\`.
2. In the project you want to observe: \`node /path/to/stackglass/cli/dist/bin.js init\`.
3. Confirm MCP server \`stackglass\` is listed in Cursor.
4. Open the UI with \`node /path/to/stackglass/cli/dist/bin.js dashboard\` (127.0.0.1).

Cursor plugins do not expose a custom sidebar API. The local dashboard and MCP resources are the evidence surface. Do not add \`.cursor-plugin/marketplace.json\` unless this repository becomes a multi-plugin marketplace.`,
);

page(
  "concepts/project-state.md",
  "Project State",
  `\`project_snapshot\` returns git identity, changed files, languages, packages, last known test/build status, runtime processes, coverage availability, and attention items.

Values come from the repository and Stackglass storage. Missing data is reported as \`no_data\`, \`unavailable\`, or \`not_configured\`.`,
);

page(
  "concepts/timeline.md",
  "Timeline",
  `GlassTrace records development events such as \`file.changed\`, \`test.failed\`, and \`typecheck.passed\`.

Query with \`project_activity_timeline\` or \`glass timeline\`. Retention is configurable in \`.stackglass/config.json\`.`,
);

page(
  "concepts/snapshots.md",
  "Snapshots",
  `A snapshot captures branch, commit, changed files, dependency fingerprint, test/build status, coverage summary, runtime count, and documentation fingerprint.

Secret values are never stored. Snapshots live under \`.stackglass/snapshots/\`.`,
);

page(
  "concepts/failures.md",
  "Failures",
  `Failures are fingerprinted from error type, source location, normalized message, and stack signature.

The Failure Center groups current, new, recurring, possible regressions, possible flakes, and resolved failures. Use \`error_trace\` to connect a failure to source and recent changes.`,
);

page(
  "concepts/test-relationships.md",
  "Test Relationships",
  `GlassLab maps source files to tests using imports, naming, package structure, and coverage when available.

Each relationship has a confidence of low, moderate, or high. These are recommendations, not absolute truth.`,
);

page(
  "glasslab/overview.md",
  "GlassLab",
  `GlassLab is Stackglass's testing laboratory. It does not merely wrap \`npm test\`.

It discovers frameworks, plans the cheapest useful verification, runs isolated targets, parses failures, stores history, and optionally inspects coverage, flakes, mutations, and contracts.`,
);

page(
  "glasslab/discovery.md",
  "Discovery",
  `Adapters detect Vitest, Jest, Node Test Runner, Playwright, Cypress, pytest, unittest, cargo test, go test, .NET test, and JUnit.

\`test_discover\` returns frameworks, suites, files, and cases. A framework is only marked available when its config or manifest evidence exists.`,
);

page(
  "glasslab/test-plans.md",
  "Test Plans",
  `\`test_plan\` selects related tests for a change and includes a reason for each item.

Example: a change to \`src/payments/refund.ts\` may select the unit test (direct module), an integration test (transaction flow), and a contract test (public endpoint).`,
);

page(
  "glasslab/test-runs.md",
  "Test Runs",
  `Modes: \`single\`, \`related\`, \`changed\`, \`package\`, \`workspace\`, \`failed\`, \`last\`.

Results are stored in SQLite. Status values are pass, fail, error, cancelled, or unavailable. Stackglass will not report PASS when the runner did not run.`,
);

page(
  "glasslab/coverage.md",
  "Coverage",
  `Coverage is read from framework artifacts such as \`coverage/coverage-summary.json\`.

If no provider data exists, Stackglass returns \`no_data\`. It never invents percentages. Changed-code coverage uses the Git diff plus available file coverage.`,
);

page(
  "glasslab/flake-detection.md",
  "Flake Detection",
  `A test is a flake candidate only when it both passes and fails across multiple stored runs (at least three samples).

Confidence: low / moderate / high. Never from a single failure. CLI: \`glass test flakes\`.`,
);

page(
  "glasslab/mutation-testing.md",
  "Mutation Testing",
  `\`mutation_test\` copies the project into a temporary workspace, applies boolean/comparison/return mutations, and runs related tests.

The working tree is never mutated permanently. Surviving mutants indicate weak tests.`,
);

page(
  "glasslab/contracts.md",
  "Contracts",
  `Contracts are treated separately from unit tests: OpenAPI, GraphQL, JSON schema, package exports, CLI, snapshots, database models.

\`contract_verify\` can compare two JSON documents and flag breaking field removal versus compatible additions.`,
);

page(
  "glasslab/snapshots.md",
  "Test Snapshots",
  `Snapshot files (\`__snapshots__\`, \`*.snap\`) are detected. Stackglass does not auto-accept snapshot updates when tests fail.`,
);

page(
  "glasslab/benchmarks.md",
  "Benchmarks",
  `Benchmark adapters record duration, throughput, or memory only when a framework exposes them.

Normal unit-test duration is not treated as a scientific benchmark.`,
);

page(
  "glasslab/history.md",
  "History",
  `Stored test runs support last status, pass rate, duration, last failure, and last passing commit when enough samples exist.

Insufficient history is not presented as a confident statistic.`,
);

page(
  "mcp/setup.md",
  "MCP Setup",
  `The Cursor plugin at [https://cursor.directory/plugins/stackglass](https://cursor.directory/plugins/stackglass) starts the server for you.

To run it yourself, clone this repository, \`npm install && npm run build\`, then:

\`\`\`bash
STACKGLASS_ROOT=/path/to/your/project node scripts/stackglass-mcp.mjs
\`\`\`

Equivalent: \`node servers/mcp/dist/bin.js\` or \`node cli/dist/bin.js mcp\`.

From a GitHub Release, extract \`stackglass-mcp.zip\` (same tree as \`stackglass-cli.zip\`) and use the same command. Set \`STACKGLASS_ROOT\` to the user workspace. Cursor plugin \`mcp.json\` does this automatically.

The public surface is **exactly 22 tools**. See [Tools](/mcp/tools) and [tool reference](/mcp/tools-reference).`,
);

page(
  "mcp/tools.md",
  "MCP Tools",
  `Stackglass exposes **exactly 22** canonical tools. Do not add dozens of tiny tools. New capability is an optional argument or an MCP resource, never a 23rd tool.

See [MCP tool reference](/mcp/tools-reference) for schemas, examples, errors, and security notes for each tool.

Install the Cursor plugin: [https://cursor.directory/plugins/stackglass](https://cursor.directory/plugins/stackglass).`,
);

const tools = [
  ["project_snapshot", "Current observable project state.", "{}"],
  [
    "project_activity_timeline",
    "Flight-recorder events.",
    '{ "limit": 50, "file": "src/auth/token.ts" }',
  ],
  [
    "code_context",
    "Source excerpt, symbols, related tests.",
    '{ "file": "src/auth/token.ts", "line": 84 }',
  ],
  [
    "dependency_trace",
    "Imports and dependents.",
    '{ "file": "src/auth/token.ts", "direction": "both" }',
  ],
  ["change_impact", "Affected files, tests, public surface, risk.", "{}"],
  ["git_change_summary", "Structured working-tree diff.", "{}"],
  ["git_history_context", "Recent commits for a path.", '{ "file": "src/auth/token.ts" }'],
  ["runtime_status", "Stackglass-managed processes only.", "{}"],
  ["runtime_logs", "Sanitized logs.", '{ "tail": 100, "level": "error" }'],
  [
    "error_analyze",
    "Parse compiler/test/runtime errors.",
    '{ "compiler_error": "error TS2322: ..." }',
  ],
  [
    "error_trace",
    "Connect an error to source, git, tests, history.",
    '{ "test_failure": "AssertionError: ..." }',
  ],
  ["test_discover", "Frameworks, files, cases.", "{}"],
  ["test_plan", "Smallest useful verification plan.", '{ "files": ["src/auth/token.ts"] }'],
  ["test_run", "Execute a plan or mode.", '{ "mode": "related" }'],
  [
    "test_failure_analyze",
    "Expected/actual, history, correlated failures.",
    '{ "name": "token expiration" }',
  ],
  ["coverage_inspect", "Coverage if a provider produced it.", '{ "scope": "changed" }'],
  ["mutation_test", "Isolated mutation testing.", '{ "target": "src/auth/token.ts" }'],
  [
    "contract_verify",
    "Contracts and breaking JSON compare.",
    '{ "before": {"id": 1}, "after": {} }',
  ],
  ["config_audit", "Config drift and conflicts.", "{}"],
  ["env_usage", "Env var names only, never values.", "{}"],
  ["docs_check", "README vs scripts and files.", "{}"],
  ["release_readiness", "Release report. Never publishes.", "{}"],
];

let ref = `Each tool returns JSON. Extra properties are rejected. Missing projects still return structured availability fields rather than fake data.

Permissions: local filesystem of the workspace only. Secrets are redacted.

`;
for (const [name, purpose, example] of tools) {
  ref += `## ${name}

**Purpose:** ${purpose}

**Example arguments:**

\`\`\`json
${example}
\`\`\`

**Errors:** invalid arguments return \`invalid_arguments\` with Zod issues. Internal failures return \`internal_failure\`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. \`env_usage\` never returns values.

`;
}
page("mcp/tools-reference.md", "MCP tool reference", ref);

page(
  "mcp/resources.md",
  "MCP Resources",
  `Resources are not counted toward the 22 tools:

- stackglass://project
- stackglass://timeline
- stackglass://tests
- stackglass://failures
- stackglass://coverage
- stackglass://runtime
- stackglass://changes
- stackglass://configuration
- stackglass://release
- stackglass://session
- stackglass://attention
- stackglass://clusters
- stackglass://heat`,
);

page(
  "mcp/prompts.md",
  "MCP Prompts",
  `Reusable prompts: investigate-failure, verify-change, find-regression, prepare-release, explain-test-failure, review-current-state.

They instruct the agent to call Stackglass tools before answering.`,
);

page(
  "mcp/security.md",
  "MCP Security",
  `Local stdio server. No account. No source upload.

Do not request \`.env\` contents. Stackglass will not index secret files or return secret values through tools, resources, logs, or diagnostics.`,
);

page(
  "tools/runtime.md",
  "Runtime",
  "Only processes started or registered through Stackglass appear in `runtime_status` with management. Others are unknown.",
);
page(
  "tools/configuration.md",
  "Configuration",
  "`config_audit` groups package managers, build, tests, lint, formatting, typecheck, environment, runtime, CI, and Stackglass.",
);
page(
  "tools/documentation.md",
  "Documentation",
  "`docs_check` verifies README commands, file references, and package names against the index.",
);
page(
  "tools/git.md",
  "Git",
  "`git_change_summary` and `git_history_context` wrap the git CLI. Unavailable when the directory is not a repository.",
);
page(
  "tools/releases.md",
  "Releases",
  `\`release_readiness\` / \`glass release\` never publishes. It reports git, tests, docs, config, changelog, and version checks.

Stackglass itself is distributed as GitHub Release zips, not npm. Current release: [v1.1.0](https://github.com/theworker02/stackglass/releases/tag/v1.1.0).

| Artifact | Use |
| --- | --- |
| \`stackglass-cli.zip\` | \`node cli/dist/bin.js help\` |
| \`stackglass-mcp.zip\` | \`STACKGLASS_ROOT=/project node scripts/stackglass-mcp.mjs\` |
| \`stackglass-cursor-plugin.zip\` | Cursor Open Plugins folder |
| \`checksums.txt\` | SHA-256 of the three zips |

Cursor plugin listing: [https://cursor.directory/plugins/stackglass](https://cursor.directory/plugins/stackglass).

Full instructions: [docs/RELEASE.md](https://github.com/theworker02/stackglass/blob/master/docs/RELEASE.md).`,
);

page(
  "extending/adapter-sdk.md",
  "Adapter SDK",
  `\`\`\`ts
import { defineTestAdapter } from "@stackglass/core";

export const adapter = defineTestAdapter({
  id: "ava",
  name: "AVA",
  detect(root) { /* ... */ },
  discover(root, files) { /* ... */ },
  async run(options) { /* ... */ },
});
\`\`\``,
);
page(
  "extending/test-adapters.md",
  "Test Adapters",
  "Implement `detect`, `discover`, and `run`. Normalize to `TestCase` and `TestRunResult`.",
);
page(
  "extending/error-adapters.md",
  "Error Adapters",
  "Implement `detect` and `parse` to return `AnalyzedError` with a stable fingerprint.",
);
page(
  "extending/contract-adapters.md",
  "Contract Adapters",
  "Compare structured contracts and mark breaking vs compatible changes.",
);

page(
  "reference/cli.md",
  "CLI",
  `There is no npm \`bin\`. The entry point is \`node cli/dist/bin.js\` (or \`node scripts/glass.mjs\` from a release zip). If you create a local alias named \`glass\` or \`stackglass\`, the command tree is the same.

See the [README CLI catalog](https://github.com/theworker02/stackglass#cli-catalog). \`glass mcp\` starts the MCP server on stdio. \`glass doctor bundle\` writes a sanitized support archive without source or secrets. \`glass dashboard\` binds 127.0.0.1.

Release zips: [v1.1.0](https://github.com/theworker02/stackglass/releases/tag/v1.1.0). Artifact usage: [docs/RELEASE.md](https://github.com/theworker02/stackglass/blob/master/docs/RELEASE.md).`,
);
page(
  "reference/configuration.md",
  "Configuration",
  'Human-authored config is `.stackglass/config.json`. `local.json` is gitignored. History retention example: `{ "history": { "retentionDays": 30, "maxEvents": 50000 } }`.',
);
page(
  "reference/events.md",
  "Events",
  "Event types include file.changed, test.failed, build.passed, runtime.crashed, coverage.changed, config.changed, and more. Each event has timestamp, origin, related files, result, duration, and sanitized metadata.",
);
page(
  "reference/architecture.md",
  "Architecture",
  `See the repository file [docs/architecture.md](https://github.com/theworker02/stackglass/blob/master/docs/architecture.md).

Cursor → Plugin (rules/skills/MCP) → GlassCore → Index/Trace/Watch/History/Diff → Adapters → Repository.

The MCP server and CLI use the same core.`,
);
page(
  "reference/troubleshooting.md",
  "Troubleshooting",
  `Run \`node cli/dist/bin.js doctor\` in the **user workspace**.

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| Database not initialized | No \`.stackglass/\` | \`node …/cli/dist/bin.js init\` |
| Coverage \`no_data\` | No provider artifact | Run the framework coverage reporter first |
| Tests \`unavailable\` | No adapter evidence | Confirm a known framework config exists |
| Git \`unavailable\` | Not a repository | Run inside a git checkout |
| MCP missing in Cursor | Plugin path or Node version | Reinstall from [cursor.directory/plugins/stackglass](https://cursor.directory/plugins/stackglass); Node >= 22.13 |
| MCP observes the wrong tree | \`STACKGLASS_ROOT\` unset | Point it at the user workspace |
| \`glass\` not found | Not an npm binary | Use \`node cli/dist/bin.js\` |

Secrets must never appear in MCP, logs, or doctor bundles. Report redaction failures privately via GitHub Security Advisories.`,
);

const brand = spawnSync(process.execPath, [path.join(process.cwd(), "scripts/sync-brand.mjs")], {
  stdio: "inherit",
});
if (brand.status) process.exit(brand.status);

const prettier = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["prettier", "--write", "apps/docs/**/*.md"],
  { stdio: "inherit", shell: process.platform === "win32" },
);
if (prettier.status) process.exit(prettier.status);

console.log("docs pages written");
