# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Documentation site landing with glass/stacked-pane theme, Cursor plugin CTA, and sections for the 22 tools, GlassLab, GlassLens, dashboard, privacy, and install
- In-repo [docs/RELEASE.md](docs/RELEASE.md) covering each GitHub Release zip, checksums, and plugin vs CLI vs MCP
- README install CTA for the Cursor plugin at https://cursor.directory/plugins/stackglass

### Changed

- README, getting-started docs, troubleshooting, and published v1.1.0 release notes expanded with source install, `STACKGLASS_ROOT`, and artifact usage
- `scripts/write-docs.mjs` refuses to overwrite the hand-crafted `apps/docs/index.md`

### Fixed

### Deprecated

### Removed

### Security

## [1.1.0] - 2026-08-14

### Added

- **GlassLens** project narrative (`glass why`), session replay (`glass session`), file heat, failure clusters, snapshot compare, and suspicious-commit ranking that does not assume the newest commit is guilty
- MCP optional modes on the existing 22 tools: `project_snapshot.narrative`, `project_activity_timeline.session`, `change_impact.heat`, `git_history_context.rank_suspicious`, `test_run.files` / `test_run.repeat`, `test_failure_analyze.cluster`
- MCP resources `stackglass://session`, `stackglass://attention`, `stackglass://clusters`, `stackglass://heat`
- CLI: `why`, `session`, `heat`, `clusters`, `compare`, `attention`, `test repeat`
- Dashboard: live Why / Session / Heat / Clusters views, SSE `/api/events`, real mark logo
- Watch `autoRun` runs related tests for classified source/test changes
- Snapshot attention now includes flakes, docs mismatches, config warnings, and cluster hints
- Build status inferred from stored typecheck/build timeline events

### Changed

- Mark and wordmark redesigned as stacked glass panes with a geometric S (SVG is the source of truth)
- Live `glass dashboard` is the canonical UI; static `apps/dashboard` remains a preview shell
- Workspace packages are private. Stackglass is installed from GitHub, not the npm registry
- Documentation deploys to GitHub Pages at https://theworker02.github.io/stackglass/
- `apps/playground` is no longer an npm workspace package (demo lives in `examples/auth-api`)
- Cursor plugin uses the single-plugin Open Plugins layout at the repository root (`.cursor-plugin/plugin.json`) instead of a nested `apps/cursor-plugin` marketplace source
- Removed npm package distribution (`bin` fields and `npm link`). CLI and MCP run from the built checkout via `node cli/dist/bin.js` and `node scripts/stackglass-mcp.mjs`
- GitHub Releases attach a runnable CLI/MCP zip, the Cursor plugin zip, and SHA-256 checksums

### Fixed

- `glass doctor` inspects the user workspace (MCP config, PATH, Cursor rules) instead of looking for the Stackglass source tree
- Failure classification: new / recurring / regression / flake / resolved instead of always `current`
- Windows `npx` adapter spawn no longer uses `shell: true` (DEP0190)
- Dashboard logo `<use href="#mark">` now has a real symbol
- Related test runs can target classified watch files, not only the git working tree
- `glass` / `stackglass-mcp` binaries start the CLI and MCP server (they previously only re-exported libraries)
- MCP honors `STACKGLASS_ROOT` so Cursor can point the server at the user workspace
- Docs and plugin logos now sync from the same mark as `assets/`
- Track the coverage fixture so CI reads the real `coverage-summary.json` instead of `no_data`

### Security

- Env usage, logs, MCP, and doctor bundles still never return secret values

## [1.0.0] - 2026-08-14

### Added

- GlassCore runtime with workspace detection, configuration, event bus, process execution, and SQLite history
- GlassIndex, GlassTrace timeline, GlassWatch, and project snapshots
- GlassLab test discovery, planning, execution, failure analysis, coverage inspect, flake detection, isolated mutation testing, and contract comparison
- `stackglass-mcp` with 22 canonical tools, resources, and prompts
- `glass` / `stackglass` CLI including `init`, `status`, `doctor`, `dashboard`
- Cursor plugin with rules, skills, agents, commands, hooks, and MCP
- Secret redaction for env values, logs, MCP output, and diagnostics
- Documentation site, fixtures, and CI workflows

[Unreleased]: https://github.com/theworker02/stackglass/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/theworker02/stackglass/releases/tag/v1.1.0
[1.0.0]: https://github.com/theworker02/stackglass/releases/tag/v1.0.0
