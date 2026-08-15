# Contributing

## Setup

```bash
git clone https://github.com/theworker02/stackglass.git
cd stackglass
npm install
npm run build
npm test
```

Requires Node.js >= 22.13.

## Architecture

Read [docs/architecture.md](docs/architecture.md). All interfaces go through GlassCore (`@stackglass/core`). The MCP server and CLI must not grow a second project model.

## Coding standards

- TypeScript, ESM, `NodeNext`
- Strict types; no `any`
- Never invent test results, coverage, git data, or runtime processes
- Never log or return secret values
- Conventional commits: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`

## Testing

```bash
npm test
npm run test:coverage
```

Add regression tests under `tests/regressions/` when fixing product bugs. Fixture repositories live in `fixtures/`.

## Adding adapters

Use `defineTestAdapter` from `@stackglass/core`. Implement `detect`, `discover`, and `run`. Add a fixture under `fixtures/` and adapter contract tests.

## MCP development

The public MCP surface is 22 tools. Prefer new arguments or UI/CLI commands over new tools. Every tool needs tests for valid input, invalid arguments, empty/partial results, and secret filtering.

## Documentation

Docs are VitePress in `apps/docs`. Keep README commands accurate. Update CHANGELOG for user-facing changes.

## Pull requests

Use the pull request template. Small, focused changes. Do not commit `.env`, credentials, or `.stackglass/local.json`.

## Release process

1. `npm test` and `npm run build`
2. `npx glass release` against this repository (dogfood)
3. Update CHANGELOG
4. Tag `vX.Y.Z` and push the tag
5. GitHub Actions `release.yml` attaches the Cursor plugin zip from `dist/cursor-plugin`. `docs.yml` deploys GitHub Pages.

The Cursor plugin files belong at the repository root. Do not add `.cursor-plugin/marketplace.json` unless this repo becomes a multi-plugin marketplace.

Stackglass is not an npm package. Do not add `bin`, `files`, `publishConfig`, or registry publish steps. A GitHub release is a deliberate human action.
