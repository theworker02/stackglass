<p align="center">
  <img src="assets/stackglass-horizontal.svg" alt="Stackglass" width="420"/>
</p>

<h1 align="center">STACKGLASS</h1>

<p align="center"><strong>See what your project is actually doing.</strong></p>

<p align="center">Local-first observability and verification for Cursor. Not another coding assistant.</p>

<p align="center">
  <a href="https://cursor.directory/plugins/stackglass"><img alt="Install Cursor plugin" src="https://img.shields.io/badge/Cursor%20plugin-install-61D6C5?style=for-the-badge"></a>
</p>

<p align="center">
  <strong>Install the Cursor plugin:</strong>
  <a href="https://cursor.directory/plugins/stackglass">https://cursor.directory/plugins/stackglass</a>
</p>

<p align="center">
  <a href="https://github.com/theworker02/stackglass/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/theworker02/stackglass/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/theworker02/stackglass/releases/tag/v1.1.0"><img alt="Release" src="https://img.shields.io/github/v/release/theworker02/stackglass?label=release"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-61D6C5"></a>
  <a href="https://github.com/theworker02/stackglass/actions/workflows/test.yml"><img alt="Tests" src="https://github.com/theworker02/stackglass/actions/workflows/test.yml/badge.svg"></a>
  <a href="https://theworker02.github.io/stackglass/mcp/tools"><img alt="MCP" src="https://img.shields.io/badge/MCP-22%20tools-72A7FF"></a>
  <a href="https://theworker02.github.io/stackglass/"><img alt="Documentation" src="https://img.shields.io/badge/docs-github%20pages-93F1E4"></a>
</p>

Stackglass is the **observability and verification layer for AI-assisted development**.

Cursor writes and reasons about code. Stackglass gives that agent evidence about state, tests, failures, history, configuration, contracts, and documentation — so it does not have to guess.

It is not another coding assistant. It is not an npm package. It does not upload your source. It exposes **exactly 22 MCP tools** and will not invent a 23rd.

| Start here            | URL                                                           |
| --------------------- | ------------------------------------------------------------- |
| **Cursor plugin**     | https://cursor.directory/plugins/stackglass                   |
| Documentation         | https://theworker02.github.io/stackglass/                     |
| GitHub Release v1.1.0 | https://github.com/theworker02/stackglass/releases/tag/v1.1.0 |
| Source                | https://github.com/theworker02/stackglass                     |

## What Stackglass is

A local-first developer platform that lives in the workspace:

```text
Developer flight recorder
+ Testing laboratory (GlassLab)
+ Change inspector
+ Debugging assistant
+ Project status console
+ MCP server (22 tools)
+ Cursor agent toolkit (rules, skills, agents, commands, hooks)
+ GlassLens (narrative, session, heat, clusters)
+ Local dashboard (glass dashboard on 127.0.0.1)
```

Agents constantly struggle with questions like: what changed, what is broken, why, which tests matter, whether a failure is new, whether coverage regressed, and whether the README still describes reality.

Stackglass connects those events. Example:

```text
token.ts edited → typecheck fails → two auth tests fail → contract drifts → README example goes stale
```

Ask Cursor _what happened?_ and Stackglass answers with evidence.

`glass why` turns the same evidence into a narrative. `glass session` replays the timeline. `glass heat` shows which files are actually noisy. Failure clusters group related failures so you do not fix them one-by-one.

## What Stackglass is not

- **Not a coding assistant.** Cursor already writes and edits code. Stackglass observes and verifies.
- **Not an npm package.** There is no `bin` field, no `npm link`, and no `npm publish`. Install from this repository or from a GitHub Release zip.
- **Not a 23rd MCP tool.** New capability is an optional argument or a resource, never another tool name.
- **Not a cloud.** Core functionality does not require an account. Source is not uploaded to a Stackglass service.
- **Not a publisher.** `glass release` / `release_readiness` reports readiness and never ships a release.

## Install the Cursor plugin

The fastest way to use Stackglass inside Cursor is the plugin listing:

**https://cursor.directory/plugins/stackglass**

That page is the install CTA for this repository. After the plugin is available in Cursor:

1. Confirm MCP server `stackglass` is listed. It runs `node scripts/stackglass-mcp.mjs` from the plugin root and sets `STACKGLASS_ROOT` to the current workspace.
2. In the project you want to observe, run the CLI init (from a clone or a release zip — see below).
3. Ask Cursor to inspect project state, related tests, or a failure. The agent should call Stackglass tools before guessing.

The plugin layout lives at the **repository root**, not in a nested marketplace package:

```text
.cursor-plugin/plugin.json
mcp.json
rules/
skills/
agents/
commands/
hooks/
scripts/stackglass-mcp.mjs
assets/logo.svg
```

Cursor's plugin format does not provide a custom editor sidebar API. The UI is the local dashboard (`glass dashboard`) plus MCP resources. Do not add `.cursor-plugin/marketplace.json` unless this repository becomes a multi-plugin marketplace.

You can also load this checkout as a local Open Plugin after `npm install` and `npm run build`.

## Installation from source

Requires **Node.js >= 22.13.0**. Stackglass is **not** published to the npm registry. Do not run `npm install -g stackglass`, `npm link`, or `npx stackglass`.

```bash
git clone https://github.com/theworker02/stackglass.git
cd stackglass
npm install
npm run build
node cli/dist/bin.js --help
```

From another project, point at the built checkout:

```bash
node /path/to/stackglass/cli/dist/bin.js init
node /path/to/stackglass/cli/dist/bin.js status
node /path/to/stackglass/cli/dist/bin.js why
```

There is no global `glass` binary from npm. After a local build you can call the same entry as:

```bash
node cli/dist/bin.js
# or, from this repo's scripts:
node scripts/glass.mjs
```

If a `glass` or `stackglass` command is on your PATH, it must be something you created yourself (alias or wrapper). This project does not install one.

Set `STACKGLASS_ROOT` when the process working directory is the Stackglass checkout but the workspace to observe is elsewhere:

```bash
# macOS / Linux
STACKGLASS_ROOT=/path/to/your/project node /path/to/stackglass/cli/dist/bin.js status

# Windows PowerShell
$env:STACKGLASS_ROOT="C:\path\to\your\project"
node C:\path\to\stackglass\cli\dist\bin.js status
```

Docs: [theworker02.github.io/stackglass](https://theworker02.github.io/stackglass/)

## GitHub Release artifacts (v1.1.0)

Every tagged release attaches four files. Current release: [v1.1.0](https://github.com/theworker02/stackglass/releases/tag/v1.1.0).

| Artifact                       | What it is                                     | How to use it                                                   |
| ------------------------------ | ---------------------------------------------- | --------------------------------------------------------------- |
| `stackglass-cli.zip`           | Built CLI, MCP server, production dependencies | Extract, then `node cli/dist/bin.js help`                       |
| `stackglass-mcp.zip`           | Same runtime as the CLI zip                    | `STACKGLASS_ROOT=/your/project node scripts/stackglass-mcp.mjs` |
| `stackglass-cursor-plugin.zip` | Cursor Open Plugins layout                     | Extract and add that folder as a Cursor plugin                  |
| `checksums.txt`                | SHA-256 of the three zips                      | Verify before you trust an extracted tree                       |

The CLI zip and MCP zip contain the same runnable tree. The split exists so release notes and download UIs can name the job you came for. The plugin zip is different: it is the Open Plugins layout, not a Node workspace you `npm install`.

### Verify checksums

```bash
# download checksums.txt and the zips into the same directory
# Linux / macOS
sha256sum -c checksums.txt

# Windows PowerShell
Get-FileHash .\stackglass-cli.zip -Algorithm SHA256
Get-Content .\checksums.txt
```

Compare the computed hashes to the lines in `checksums.txt`. Do not run a zip whose hash does not match.

### Use the CLI zip

```bash
unzip stackglass-cli.zip -d stackglass
cd stackglass
node cli/dist/bin.js help
node scripts/glass.mjs init
```

If `node_modules` is missing after extract:

```bash
npm install --omit=dev --ignore-scripts
```

That install is local to the extracted tree. It is not `npm publish` and it does not register a global binary.

### Use the MCP zip

```bash
unzip stackglass-mcp.zip -d stackglass
cd stackglass
STACKGLASS_ROOT=/path/to/your/project node scripts/stackglass-mcp.mjs
```

On Windows PowerShell:

```powershell
$env:STACKGLASS_ROOT="C:\path\to\your\project"
node scripts\stackglass-mcp.mjs
```

The server speaks MCP over stdio. Cursor's `mcp.json` already does this when you install the plugin.

### Use the Cursor plugin zip

1. Extract `stackglass-cursor-plugin.zip`.
2. In Cursor, add that extracted folder as a plugin (Open Plugins layout: `.cursor-plugin/plugin.json` at the folder root).
3. Confirm MCP server `stackglass` starts with `node scripts/stackglass-mcp.mjs`.
4. Still prefer the listing at **https://cursor.directory/plugins/stackglass** when you want the published plugin page rather than a manual folder.

Full artifact instructions: [docs/RELEASE.md](docs/RELEASE.md).

## Quick start

```bash
cd your-project
node /path/to/stackglass/cli/dist/bin.js init
node /path/to/stackglass/cli/dist/bin.js status
node /path/to/stackglass/cli/dist/bin.js why
node /path/to/stackglass/cli/dist/bin.js test related
node /path/to/stackglass/cli/dist/bin.js dashboard
```

`init` is idempotent. It detects languages, packages, and test frameworks, creates `.stackglass/`, initializes the local database, and writes a first snapshot.

## Cursor setup

1. Install the plugin from **https://cursor.directory/plugins/stackglass** (or extract `stackglass-cursor-plugin.zip` / load this repo root).
2. Clone this repository (or extract `stackglass-cli.zip`) and, for a source checkout, run `npm install` then `npm run build`.
3. In the project you want to observe: `node /path/to/stackglass/cli/dist/bin.js init`.
4. Confirm MCP server `stackglass` is available. The plugin `mcp.json` runs `node ${PLUGIN_ROOT}/scripts/stackglass-mcp.mjs` and sets `STACKGLASS_ROOT` to `${workspaceFolder}`.
5. Open the local dashboard when you want a UI: `node /path/to/stackglass/cli/dist/bin.js dashboard` (binds 127.0.0.1).

The plugin ships:

- **22 MCP tools** plus resources and prompts
- **Rules** in `rules/` (observe-before-changing, test integrity, no blind snapshot updates, environment safety, release safety)
- **Skills** in `skills/` (Failure Investigator, Regression Hunter, Test Architect, Flake Hunter, Coverage Analyst, Contract Guardian, Runtime Investigator, Configuration Auditor, Documentation Verifier, Release Inspector)
- **Agents** and **commands** for investigate / verify / release flows
- **Hooks** including session start

If MCP does not appear, check that Node 22.13+ is on PATH, that `scripts/stackglass-mcp.mjs` exists in the plugin root, and that `STACKGLASS_ROOT` points at the user workspace rather than the Stackglass checkout.

## CLI catalog

Entry point: `node cli/dist/bin.js` (or `node scripts/glass.mjs` from a release zip). If you have a local alias named `glass` or `stackglass`, the commands are the same.

```text
glass init                 Initialize .stackglass/ in this workspace
glass status               Show current project state
glass why                  Narrative of current state from evidence
glass session              Replay recent timeline as a session
glass heat                 Rank files by events, changes, and failures
glass clusters             Group stored failures by shared files
glass compare              Diff the two most recent snapshots
glass attention            Tests, docs, config, and flake attention items
glass doctor [bundle]      Diagnostics; bundle writes a sanitized archive
glass snapshot             Write a project snapshot
glass timeline             Show recent development events
glass watch                Smart watch; optional autoRun of related tests
glass test [mode]          related | changed | failed | workspace
glass test history         Last stored test run
glass test flakes          Flake candidates (never from a single failure)
glass test repeat [n]      Repeat a run to probe flakes
glass test mutation <file> Isolated mutation testing
glass test coverage        Coverage if a provider produced it
glass test contracts       Observable contract verification
glass error [text]         Analyze an error from stdin or an argument
glass runtime              Stackglass-managed processes only
glass changes              Git change summary
glass config               Configuration audit
glass env                  Environment variable names only
glass docs                 Documentation checker
glass release              Release readiness (never publishes)
glass mcp                  Start the MCP server on stdio
glass adapters             List detected test adapters
glass logs                 Show the Stackglass log file path
glass cache                Manage local cache (clear)
glass dashboard            Serve the local dashboard on 127.0.0.1
glass help                 Show help
```

### Sample `glass status` (documentation only)

The following is a **documentation sample**, not live output from this repository:

```text
STACKGLASS
Branch          feature/auth-refresh
Changes         4 files
Build           not_run
Tests           328 passed / 2 failed
Coverage        84.7%
Runtime         2 processes
Attention       3 item(s)
MCP             local
```

Your actual `glass status` prints values from the current workspace. Unavailable fields say `no_data` / `unavailable` / `not_configured`. Stackglass will not invent coverage percentages or test counts.

## 22 MCP tools

The public MCP surface is **exactly 22 tools**. Resources and prompts are not tools. New intelligence lands as optional arguments on these names.

### Project intelligence

| Tool                        | Purpose                                                       |
| --------------------------- | ------------------------------------------------------------- |
| `project_snapshot`          | Current observable project state. Optional `narrative`.       |
| `project_activity_timeline` | Flight-recorder events. Optional `session`.                   |
| `code_context`              | Source excerpt, symbols, related tests.                       |
| `dependency_trace`          | Imports and dependents.                                       |
| `change_impact`             | Affected files, tests, public surface, risk. Optional `heat`. |

### Version control

| Tool                  | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| `git_change_summary`  | Structured working-tree diff.                          |
| `git_history_context` | Recent commits for a path. Optional `rank_suspicious`. |

### Runtime and debugging

| Tool             | Purpose                                                   |
| ---------------- | --------------------------------------------------------- |
| `runtime_status` | Processes launched or registered through Stackglass only. |
| `runtime_logs`   | Sanitized logs. Never secret values.                      |
| `error_analyze`  | Parse compiler, test, or runtime errors.                  |
| `error_trace`    | Connect an error to source, git, tests, and history.      |

### GlassLab

| Tool                   | Purpose                                                                    |
| ---------------------- | -------------------------------------------------------------------------- |
| `test_discover`        | Frameworks, files, and cases. A framework is available only with evidence. |
| `test_plan`            | Smallest useful verification plan, with a reason per item.                 |
| `test_run`             | Execute a plan or mode. Optional `files`, `repeat`.                        |
| `test_failure_analyze` | Expected/actual, history, correlated failures. Optional `cluster`.         |
| `coverage_inspect`     | Coverage if a provider produced an artifact. Otherwise `no_data`.          |
| `mutation_test`        | Isolated workspace mutants. The working tree is not permanently changed.   |
| `contract_verify`      | Contracts and breaking JSON compare.                                       |

### Integrity

| Tool                | Purpose                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| `config_audit`      | Config drift, package managers, CI Node versions, duplicated lockfiles. |
| `env_usage`         | Environment variable **names and locations only**. Never values.        |
| `docs_check`        | README commands and file references versus the index.                   |
| `release_readiness` | Release report. **Never publishes.**                                    |

Optional modes (same 22 tools):

| Tool                        | Optional args     |
| --------------------------- | ----------------- |
| `project_snapshot`          | `narrative`       |
| `project_activity_timeline` | `session`         |
| `change_impact`             | `heat`            |
| `git_history_context`       | `rank_suspicious` |
| `test_run`                  | `files`, `repeat` |
| `test_failure_analyze`      | `cluster`         |

Resources (not tools): `stackglass://project`, `timeline`, `session`, `attention`, `clusters`, `heat`, `tests`, `failures`, `coverage`, `runtime`, `changes`, `configuration`, `release`.

Start the server from a built checkout or release zip:

```bash
node scripts/stackglass-mcp.mjs
# or
node servers/mcp/dist/bin.js
# or
node cli/dist/bin.js mcp
```

Full schemas: [MCP documentation](https://theworker02.github.io/stackglass/mcp/tools-reference).

## GlassLab

GlassLab is not `npm test` with a coat of paint. It discovers frameworks, selects related tests with reasons, parses failures, stores history, and will not invent coverage.

```bash
node cli/dist/bin.js test related
node cli/dist/bin.js test changed
node cli/dist/bin.js test failed
node cli/dist/bin.js test flakes
node cli/dist/bin.js test repeat 5
node cli/dist/bin.js test mutation src/auth/token.ts
node cli/dist/bin.js test coverage
node cli/dist/bin.js test contracts
```

Repeat a run with `test repeat 5` to probe flakes. A mixed pass/fail across repeats is a candidate flake. A single failure is never labeled a flake.

Built-in adapters: Vitest, Jest, Node Test Runner, Playwright, Cypress, pytest, unittest, cargo test, go test, .NET test, JUnit. Extend with `defineTestAdapter` in `@stackglass/core` (workspace package name only — not on the npm registry).

Dogfood: this repository runs its own tests through the same adapters and CLI.

## GlassLens

GlassLens turns stored evidence into something an agent (or a human) can read:

- `why` — narrative of current state; unanswered items stay unanswered
- `session` — compressed timeline beats
- `heat` — files scored by events, changes, and failures
- `clusters` — failures grouped by shared files
- `compare` — diff of the two most recent snapshots
- Suspicious-commit ranking that does **not** assume the newest commit is guilty

## Local dashboard

`node cli/dist/bin.js dashboard` serves a live UI on 127.0.0.1 with Why, Session, Heat, Clusters, GlassLab, failures, coverage, runtime, configuration, documentation, and release views. It reads the same GlassCore data as the CLI and MCP server.

## Failure investigation

User: _Why did the authentication tests suddenly start failing?_

Stackglass can provide the agent:

```text
current failures (new / recurring / regression / flake)
failure clusters
timeline + session replay
file heat
recent Git changes
suspicious commits ranked by overlapping files
related source
previous passing run
dependency relationships
```

The agent forms a grounded diagnosis instead of editing at random.

```text
14:21:03  file.changed       src/auth/token.ts
14:21:11  typecheck.failed
14:21:31  typecheck.passed
14:21:44  test.failed        token expiration
```

`glass session` compresses that into beats. `glass heat` scores files by events, changes, and failures.

## Privacy

Local-first. No account for core functionality. Source is not uploaded to a Stackglass service. Telemetry is off by default.

Generated data lives in `.stackglass/` and is rebuildable. Human configuration is `config.json`. Machine-local files (`local.json`, cache, sqlite) are gitignored.

## Security

See [SECURITY.md](SECURITY.md). Secrets are redacted from MCP, logs, timeline metadata, and doctor bundles.

- Do not ask Stackglass for `.env` contents. It will not return secret values.
- `env_usage` reports names and locations only.
- Sensitive path patterns include `.env`, `*.pem`, `*.key`, `credentials*`, `secrets*`, and `id_rsa*`.
- `glass doctor bundle` excludes source code and secret values by default.
- Mutation testing copies the project into a temporary workspace and deletes it afterward.

## Architecture

See [docs/architecture.md](docs/architecture.md). MCP, CLI, dashboard, and plugin share GlassCore. They do not maintain a second model of the project.

```text
Cursor
  → Plugin (MCP + rules + skills + commands + hooks)
  → GlassCore (Index / Trace / Watch / Lens / Lab)
  → Adapters (tests, build, runtime, errors)
  → Repository / processes
```

Internal package names (`@stackglass/core`, and so on) exist so this checkout can build. They are not npm packages.

## Troubleshooting

Run `node cli/dist/bin.js doctor` in the **user workspace**, not only in the Stackglass checkout.

| Symptom                             | Likely cause                  | What to do                                                                |
| ----------------------------------- | ----------------------------- | ------------------------------------------------------------------------- |
| `database not initialized`          | No `.stackglass/` yet         | `node …/cli/dist/bin.js init`                                             |
| Coverage `no_data`                  | No provider artifact          | Run the framework's coverage reporter first                               |
| Tests `unavailable`                 | No adapter evidence           | Confirm a known framework config or manifest exists                       |
| Git `unavailable`                   | Directory is not a repository | Run inside a git checkout                                                 |
| MCP missing in Cursor               | Plugin path or Node version   | Reinstall from https://cursor.directory/plugins/stackglass; Node >= 22.13 |
| MCP observes the wrong tree         | `STACKGLASS_ROOT` unset       | Point it at the user workspace                                            |
| `glass` not found                   | Not an npm binary             | Use `node cli/dist/bin.js`                                                |
| Doctor looks at the Stackglass repo | Wrong cwd                     | Run doctor from the project you care about                                |
| Secrets in output                   | Should not happen             | File a private advisory; do not paste secrets into issues                 |

More: [docs site troubleshooting](https://theworker02.github.io/stackglass/reference/troubleshooting) and [docs/RELEASE.md](docs/RELEASE.md).

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
npm run docs:build
```

Docs site is VitePress in `apps/docs`. GitHub Pages publishes to https://theworker02.github.io/stackglass/ with `DOCS_BASE=/stackglass/`.

The landing page (`apps/docs/index.md` plus `.vitepress/theme`) is hand-crafted. `scripts/write-docs.mjs` must not overwrite `index.md`.

## Roadmap

See [ROADMAP.md](ROADMAP.md). Later work deepens adapters and coverage providers rather than adding unbounded MCP tools.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [docs/RELEASE.md](docs/RELEASE.md).

## License

[MIT](LICENSE)
