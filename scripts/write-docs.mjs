import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.join(process.cwd(), "apps/docs");

function page(rel, title, body) {
  const abs = path.join(root, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `# ${title}\n\n${body.trim()}\n`, "utf8");
}

page(
  "getting-started/introduction.md",
  "Introduction",
  `Stackglass is a local-first developer observability and verification platform for Cursor.

It is **not** an AI that writes code. Cursor already provides the coding agent. Stackglass gives that agent evidence about project state, tests, failures, history, configuration, contracts, and documentation.

The defining principle: **give coding agents evidence instead of forcing them to guess.**`,
);

page(
  "getting-started/installation.md",
  "Installation",
  `Requires Node.js 22.13 or later. Stackglass is not an npm package.

\`\`\`bash
git clone https://github.com/theworker02/stackglass.git
cd stackglass
npm install
npm run build
node cli/dist/bin.js --help
\`\`\`

From another project: \`node /path/to/stackglass/cli/dist/bin.js init\`.`,
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
  `Stackglass integrates with Cursor through the official plugin format:

- MCP server \`stackglass-mcp\` (22 tools, resources, prompts)
- Rules in \`rules/\`
- Skills in \`skills/\`
- Commands and agents in the plugin package

The plugin lives at the repository root (\`.cursor-plugin/plugin.json\`, \`mcp.json\`, \`rules/\`, \`skills/\`, \`agents/\`, \`commands/\`, \`hooks/\`). Install it from this repo in Cursor, then run \`glass init\` in the project so the agent has a database and index.

The dashboard is \`glass dashboard\` (127.0.0.1). Cursor plugins do not expose a custom sidebar API; the local dashboard and MCP resources provide the UI and evidence surface.`,
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
  `Start the MCP server with \`node scripts/stackglass-mcp.mjs\` after cloning this repository and running \`npm install && npm run build\`.

Set \`STACKGLASS_ROOT\` to the user workspace. Cursor plugin \`mcp.json\` does this automatically.`,
);

page(
  "mcp/tools.md",
  "MCP Tools",
  `Stackglass exposes **exactly 22** canonical tools. Do not add dozens of tiny tools.

See [MCP tool reference](/mcp/tools-reference) for schemas, examples, errors, and security notes for each tool.`,
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
  "`release_readiness` never publishes. It reports git, tests, docs, config, changelog, and version checks.",
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
  "Binary: `glass` (fallback `stackglass`). See the README CLI tree. `glass mcp` starts the MCP server on stdio. `glass doctor bundle` writes a sanitized support archive without source or secrets.",
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
  `Run \`glass doctor\`.

Common states: database not initialized (\`glass init\`), coverage \`no_data\` (no provider artifact), tests \`unavailable\` (no adapter detected), git \`unavailable\` (not a repository).`,
);

const brand = spawnSync(process.execPath, [path.join(process.cwd(), "scripts/sync-brand.mjs")], {
  stdio: "inherit",
});
if (brand.status) process.exit(brand.status);
console.log("docs pages written");
