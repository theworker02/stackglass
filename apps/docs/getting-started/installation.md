# Installation

Requires **Node.js 22.13** or later. Stackglass is **not** an npm package. Do not `npm install -g stackglass`, `npm link`, or `npx stackglass`.

## Cursor plugin

Install from [https://cursor.directory/plugins/stackglass](https://cursor.directory/plugins/stackglass).

That listing is the install CTA for the repository. You can also extract `stackglass-cursor-plugin.zip` from [GitHub Release v1.1.0](https://github.com/theworker02/stackglass/releases/tag/v1.1.0) and add the folder as an Open Plugin.

## Clone and build

```bash
git clone https://github.com/theworker02/stackglass.git
cd stackglass
npm install
npm run build
node cli/dist/bin.js --help
```

From another project: `node /path/to/stackglass/cli/dist/bin.js init`.

There is no global `glass` binary from npm. Use `node cli/dist/bin.js` or `node scripts/glass.mjs`.

## Release zips

Download from [v1.1.0](https://github.com/theworker02/stackglass/releases/tag/v1.1.0):

- `stackglass-cli.zip` — `node cli/dist/bin.js help`
- `stackglass-mcp.zip` — `STACKGLASS_ROOT=/your/project node scripts/stackglass-mcp.mjs`
- `stackglass-cursor-plugin.zip` — Cursor Open Plugins layout
- `checksums.txt` — SHA-256 of the zips

Verify hashes before you run an extracted tree. Full artifact instructions: [docs/RELEASE.md](https://github.com/theworker02/stackglass/blob/master/docs/RELEASE.md).

`STACKGLASS_ROOT` is the workspace to observe. If you launch the CLI or MCP from the Stackglass checkout, set it to the user project.
