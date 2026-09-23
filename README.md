<p align="center">
  <img src="assets/stackglass-horizontal.svg" alt="Stackglass" width="420"/>
</p>

<h1 align="center">STACKGLASS</h1>

<p align="center"><strong>See what your project is actually doing.</strong></p>

<p align="center">Developer observability and verification for Cursor.</p>

<p align="center">
  <a href="https://github.com/theworker02/stackglass/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/theworker02/stackglass/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/theworker02/stackglass/releases"><img alt="Release" src="https://img.shields.io/github/v/release/theworker02/stackglass?label=release"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Proprietary%20(source--available)-61D6C5"></a>
  <a href="https://github.com/theworker02/stackglass/actions/workflows/test.yml"><img alt="Tests" src="https://github.com/theworker02/stackglass/actions/workflows/test.yml/badge.svg"></a>
  <a href="apps/docs/mcp/tools.md"><img alt="MCP" src="https://img.shields.io/badge/MCP-22%20tools-72A7FF"></a>
  <a href="https://theworker02.github.io/stackglass/"><img alt="Documentation" src="https://img.shields.io/badge/docs-github%20pages-93F1E4"></a>
</p>

Stackglass is the **observability and verification layer for AI-assisted development**.

Cursor writes and reasons about code. Stackglass gives that agent evidence about state, tests, failures, history, configuration, contracts, and documentation Ã¢â‚¬â€ so it does not have to guess.

It is not another coding assistant.

## What is Stackglass?

A local-first developer platform:

```text
Developer flight recorder
+ Testing laboratory (GlassLab)
+ Change inspector
+ Debugging assistant
+ Project status console
+ MCP server
+ Cursor agent toolkit
+ GlassLens (narrative, session, heat, clusters)
```

## Why Stackglass?

Agents constantly struggle with questions like: what changed, what is broken, why, which tests matter, whether a failure is new, whether coverage regressed, and whether the README still describes reality.

Stackglass connects those events. Example:

```text
token.ts edited Ã¢â€ â€™ typecheck fails Ã¢â€ â€™ two auth tests fail Ã¢â€ â€™ contract drifts Ã¢â€ â€™ README example goes stale
```

Ask Cursor _what happened?_ and Stackglass answers with evidence.

`glass why` turns the same evidence into a narrative. `glass session` replays the timeline. `glass heat` shows which files are actually noisy. Failure clusters group related failures so you do not fix them one-by-one.

## Features

- **GlassCore** workspace runtime, config, process execution, permissions, logging
- **GlassIndex** files, packages, tests, imports, public exports
- **GlassTrace** development timeline
- **GlassWatch** classified file events; optional `watch.autoRun` related tests
- **GlassLab** discovery, plans, runs, flakes, coverage, mutation, contracts
- **GlassLens** narrative, session replay, heat, clusters, snapshot compare, suspicious commits
- **22 MCP tools** plus resources and prompts (new capability is optional args, never a 23rd tool)
- **CLI** `glass` / `stackglass`
- **Cursor plugin** rules, skills, agents, commands, hooks
- **Local dashboard** `glass dashboard` with live Why / Session / Heat / Clusters views

## GlassLab

GlassLab is not `npm test` with a coat of paint. It discovers frameworks, selects related tests with reasons, parses failures, stores history, and will not invent coverage.

Repeat a run with `glass test repeat 5` to probe flakes. A mixed pass/fail across repeats is a candidate flake. A single failure is never labeled a flake.

Dogfood: this repository runs its own tests through the same adapters and CLI.

## 22 MCP Tools

Project intelligence: `project_snapshot`, `project_activity_timeline`, `code_context`, `dependency_trace`, `change_impact`

Version control: `git_change_summary`, `git_history_context`

Runtime & debugging: `runtime_status`, `runtime_logs`, `error_analyze`, `error_trace`

GlassLab: `test_discover`, `test_plan`, `test_run`, `test_failure_analyze`, `coverage_inspect`, `mutation_test`, `contract_verify`

Integrity: `config_audit`, `env_usage`, `docs_check`, `release_readiness`

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

Full schemas: [MCP documentation](https://theworker02.github.io/stackglass/mcp/tools-reference).

## Architecture

See [docs/architecture.md](docs/architecture.md). MCP, CLI, dashboard, and plugin share GlassCore.

## Installation

Requires Node.js 22.13+. Stackglass is not an npm package. Download `stackglass-cli.zip` from [GitHub Releases](https://github.com/theworker02/stackglass/releases) or clone and build:

```bash
git clone https://github.com/theworker02/stackglass.git
cd stackglass
npm install
npm run build
node cli/dist/bin.js --help
```

From another project, point at the extracted release or built checkout:

```bash
node /path/to/stackglass/cli/dist/bin.js init
```

Docs: [theworker02.github.io/stackglass](https://theworker02.github.io/stackglass/)

## Quick Start

```bash
cd your-project
glass init
glass status
glass why
glass test related
glass dashboard
```

## Cursor Setup

1. Clone this repository and run `npm install` then `npm run build`
2. `node /path/to/stackglass/cli/dist/bin.js init` in the project
3. Install this repository as a Cursor plugin (layout is at the repo root: `.cursor-plugin/plugin.json`, `mcp.json`, `rules/`, `skills/`, `agents/`, `commands/`, `hooks/`)
4. Confirm MCP server `stackglass` is available in Cursor (`node` runs `scripts/stackglass-mcp.mjs` from the plugin root; `STACKGLASS_ROOT` = workspace)

The plugin UI is the local dashboard (`glass dashboard`) plus MCP resources. Cursor's plugin format does not provide a custom editor sidebar API; Stackglass keeps the capability in CLI/MCP rather than inventing one.

## Testing

```bash
glass test related
glass test changed
glass test failed
glass test flakes
glass test repeat 5
glass test mutation src/auth/token.ts
glass test coverage
glass test contracts
```

## Failure Investigation

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

The agent forms a grounded diagnosis instead of editing at random. Newest commit is not assumed guilty.

## Timeline

```text
14:21:03  file.changed       src/auth/token.ts
14:21:11  typecheck.failed
14:21:31  typecheck.passed
14:21:44  test.failed        token expiration
```

`glass session` compresses that into beats. `glass heat` scores files by events, changes, and failures.

## Runtime

`runtime_status` and `runtime_logs` cover processes launched or registered through Stackglass only.

## Configuration

`glass config` audits package managers, CI Node versions, ports, and duplicated lockfiles.

## Documentation Verification

If README says `pnpm dev:web` and that script is gone, `docs_check` reports a documentation mismatch.

## Release Verification

`glass release` / `release_readiness` never publishes. Publishing requires deliberate user action.

## CLI

```text
glass init | status | why | session | heat | clusters | compare | attention
glass doctor | snapshot | timeline | watch
glass test | test related | test changed | test failed | test history
glass test flakes | test repeat | test mutation | test coverage | test contracts
glass error | runtime | changes | config | env | docs | release
glass mcp | adapters | logs | cache | dashboard
```

If `glass` is unavailable, use `stackglass`.

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

Your actual `glass status` prints values from the current workspace. Unavailable fields say `no_data` / `unavailable` / `not_configured`.

## Rules

Fifteen Cursor rules ship in `rules/`, including observe-before-changing, test integrity, no blind snapshot updates, environment safety, and release safety.

## Skills

Failure Investigator, Regression Hunter, Test Architect, Flake Hunter, Coverage Analyst, Contract Guardian, Runtime Investigator, Configuration Auditor, Documentation Verifier, Release Inspector.

## Adapters

`defineTestAdapter` in `@stackglass/core`. Built-in: Vitest, Jest, Node Test Runner, Playwright, Cypress, pytest, unittest, cargo test, go test, .NET test, JUnit.

## Privacy

Local-first. No account for core functionality. Source is not uploaded to a Stackglass service. Telemetry is off by default.

## Security

See [SECURITY.md](SECURITY.md). Secrets are redacted from MCP, logs, timeline metadata, and doctor bundles.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

## Roadmap

See [ROADMAP.md](ROADMAP.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

**Source-available proprietary** â€” evaluation under [LICENSE](./LICENSE); commercial / production use via [COMMERCIAL.md](./COMMERCIAL.md). See [LICENSE_TRANSITION_NOTICE.md](./LICENSE_TRANSITION_NOTICE.md) and [NOTICE](./NOTICE).

---

## License & acquisition

This project is **proprietary**. Production use, redistribution, and commercial deployment require a written commercial license or completed acquisition. See [LICENSE](./LICENSE) and [ACQUISITION.md](./ACQUISITION.md). Contact [@theworker02](https://github.com/theworker02).

## Acquisition diligence

Buyer-facing diligence materials live in [docs/acquisition/](./docs/acquisition/). Commercial licensing contact path: [COMMERCIAL.md](./COMMERCIAL.md).
