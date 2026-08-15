# CLI

There is no npm `bin`. The entry point is `node cli/dist/bin.js` (or `node scripts/glass.mjs` from a release zip). If you create a local alias named `glass` or `stackglass`, the command tree is the same.

See the [README CLI catalog](https://github.com/theworker02/stackglass#cli-catalog). `glass mcp` starts the MCP server on stdio. `glass doctor bundle` writes a sanitized support archive without source or secrets. `glass dashboard` binds 127.0.0.1.

Release zips: [v1.1.0](https://github.com/theworker02/stackglass/releases/tag/v1.1.0). Artifact usage: [docs/RELEASE.md](https://github.com/theworker02/stackglass/blob/master/docs/RELEASE.md).
