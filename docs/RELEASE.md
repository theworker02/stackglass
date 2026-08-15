# Stackglass 1.1.0

See what your project is actually doing. Local-first observability and verification for Cursor — not another coding assistant.

- **Cursor plugin:** https://cursor.directory/plugins/stackglass
- **Docs:** https://theworker02.github.io/stackglass/
- **Source:** https://github.com/theworker02/stackglass

This is a **GitHub Release**, not an npm package. Do not `npm install stackglass`, `npm link`, `npm pack`, or `npm publish`. Requires **Node.js >= 22.13.0**. There is no `bin` field and no global `glass` from the registry. Run `node cli/dist/bin.js` from a clone or from `stackglass-cli.zip`.

## 1.1.0 highlights

- **GlassLens** — `glass why`, `glass session`, `glass heat`, `glass clusters`, snapshot compare, and suspicious-commit ranking that does not assume the newest commit is guilty
- Optional modes on the existing **22 MCP tools** (`narrative`, `session`, `heat`, `rank_suspicious`, `files`, `repeat`, `cluster`). Never a 23rd tool.
- Live `glass dashboard` on 127.0.0.1 (Why / Session / Heat / Clusters)
- Watch `autoRun` for related tests
- Cursor plugin flattened to the repository root (`.cursor-plugin/plugin.json`)
- Distribution via GitHub Release zips instead of npm

Full changelog: https://github.com/theworker02/stackglass/blob/master/CHANGELOG.md

# Release artifacts and instructions

Stackglass **1.1.0** is distributed as a **GitHub Release**, not an npm package. Do not `npm install stackglass`, `npm link`, `npm pack`, or `npm publish`.

Requires **Node.js >= 22.13.0**.

- Release page: https://github.com/theworker02/stackglass/releases/tag/v1.1.0
- Cursor plugin listing: https://cursor.directory/plugins/stackglass
- Documentation: https://theworker02.github.io/stackglass/

This file is the in-repo companion to the published GitHub release notes. Maintainers update both when artifact usage changes.

## What each zip is for

| File                           | Audience                             | Contains                                                                                                                                                           | Does not contain                                                           |
| ------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `stackglass-cli.zip`           | Humans and scripts that want the CLI | Built `cli/dist`, `servers/mcp/dist`, `packages/core/dist`, `scripts/glass.mjs`, `scripts/stackglass-mcp.mjs`, production `node_modules`, a private `package.json` | Cursor rules/skills/plugin layout                                          |
| `stackglass-mcp.zip`           | MCP host configuration               | The **same runtime tree** as the CLI zip                                                                                                                           | A different server binary. Start it with `node scripts/stackglass-mcp.mjs` |
| `stackglass-cursor-plugin.zip` | Cursor Open Plugins                  | `.cursor-plugin/plugin.json`, `mcp.json`, `rules/`, `skills/`, `agents/`, `commands/`, `hooks/`, MCP launcher scripts, logo                                        | A full Node workspace. Do not expect `cli/dist` here                       |
| `checksums.txt`                | Everyone                             | SHA-256 lines for the three zips                                                                                                                                   | The zips themselves                                                        |

The CLI and MCP zips are identical on purpose. Naming them separately makes the release page honest about the two jobs people come for: run commands, or speak MCP. If the hashes in `checksums.txt` differ between those two zips, the release is broken — do not use it.

The plugin zip is a different tree. Cursor loads the folder that contains `.cursor-plugin/plugin.json`.

## Verify checksums

Download `checksums.txt` and the zips into one directory.

```bash
# Linux
sha256sum -c checksums.txt

# macOS (if sha256sum is missing)
shasum -a 256 -c checksums.txt
```

Windows PowerShell:

```powershell
Get-FileHash .\stackglass-cli.zip -Algorithm SHA256
Get-FileHash .\stackglass-mcp.zip -Algorithm SHA256
Get-FileHash .\stackglass-cursor-plugin.zip -Algorithm SHA256
Get-Content .\checksums.txt
```

Each computed hash must match the corresponding line. A mismatch means a truncated download or a tampered file. Delete the zip and download again from the official release URL.

`scripts/package-release.mjs` writes `checksums.txt` as:

```text
<hex>  stackglass-cli.zip
<hex>  stackglass-mcp.zip
<hex>  stackglass-cursor-plugin.zip
```

## CLI zip

```bash
unzip stackglass-cli.zip -d stackglass
cd stackglass
node cli/dist/bin.js help
node scripts/glass.mjs init
```

Against another project:

```bash
node /path/to/extracted/stackglass/cli/dist/bin.js init
node /path/to/extracted/stackglass/cli/dist/bin.js status
node /path/to/extracted/stackglass/cli/dist/bin.js why
node /path/to/extracted/stackglass/cli/dist/bin.js dashboard
```

If `node_modules` is missing (or you want a clean install inside the extracted tree):

```bash
npm install --omit=dev --ignore-scripts
```

That command only installs dependencies for the extracted workspace. It does not publish anything and it does not create a global `glass` binary.

Windows:

```powershell
Expand-Archive .\stackglass-cli.zip -DestinationPath .\stackglass
cd .\stackglass
node cli\dist\bin.js help
```

## MCP zip (22 tools)

```bash
unzip stackglass-mcp.zip -d stackglass
cd stackglass
STACKGLASS_ROOT=/path/to/your/project node scripts/stackglass-mcp.mjs
```

Equivalent entry points in the same tree:

```bash
node servers/mcp/dist/bin.js
node cli/dist/bin.js mcp
```

Windows PowerShell:

```powershell
$env:STACKGLASS_ROOT="C:\path\to\your\project"
node scripts\stackglass-mcp.mjs
```

`STACKGLASS_ROOT` is the workspace to observe (the user's project). If you omit it, the server uses the process working directory, which is wrong when you launched it from the extracted Stackglass folder.

The server is local stdio. It does not open a network port. Cursor's plugin `mcp.json` already sets:

```json
{
  "mcpServers": {
    "stackglass": {
      "command": "node",
      "args": ["${PLUGIN_ROOT}/scripts/stackglass-mcp.mjs"],
      "env": {
        "STACKGLASS_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

There are exactly 22 tools. See the [README MCP catalog](../README.md#22-mcp-tools) and the [tool reference](https://theworker02.github.io/stackglass/mcp/tools-reference).

## Cursor plugin zip

Prefer the published listing when you can:

**https://cursor.directory/plugins/stackglass**

To install from the release zip instead:

1. Extract `stackglass-cursor-plugin.zip` to a stable folder you will not delete on reboot.
2. In Cursor, add that folder as an Open Plugin. The folder root must contain `.cursor-plugin/plugin.json`.
3. Confirm MCP server `stackglass` appears.
4. In the project you want to observe, run the CLI `init` from the CLI zip or a source checkout.

Plugin layout after extract:

```text
.cursor-plugin/plugin.json
mcp.json
rules/
skills/
agents/
commands/
hooks/
scripts/session-start.mjs
scripts/stackglass-mcp.mjs
assets/logo.svg
README.md
```

The plugin zip is **not** the CLI. After install you still need a built CLI (source checkout or `stackglass-cli.zip`) to run `init`, `status`, `dashboard`, and GlassLab commands.

Do not add `.cursor-plugin/marketplace.json` unless this repository becomes a multi-plugin marketplace.

## Plugin vs CLI vs MCP

| Job                                                   | Use                                                               |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| Give Cursor rules, skills, and an MCP server          | Plugin listing or `stackglass-cursor-plugin.zip`                  |
| Initialize a workspace, run tests, open the dashboard | `stackglass-cli.zip` or `node cli/dist/bin.js` from a built clone |
| Speak MCP to a host that is not the Cursor plugin     | `stackglass-mcp.zip` or `node scripts/stackglass-mcp.mjs`         |
| Read evidence in a browser on this machine            | `node cli/dist/bin.js dashboard` (127.0.0.1)                      |

All three paths share GlassCore. They must not grow a second project model. New MCP capability is an optional argument, never a 23rd tool.

## Source checkout (maintainers and contributors)

```bash
git clone https://github.com/theworker02/stackglass.git
cd stackglass
npm install
npm run build
node cli/dist/bin.js --help
npm run plugin:build
node scripts/package-release.mjs
```

`package-release.mjs` writes `dist-release/stackglass-cli.zip`, `stackglass-mcp.zip`, `stackglass-cursor-plugin.zip`, and `checksums.txt`. CI does the same on a version tag via `.github/workflows/release.yml`.

## How a GitHub Release is cut

1. `npm test` and `npm run build` on a clean tree.
2. `node cli/dist/bin.js release` against this repository (dogfood). It never publishes.
3. Update [CHANGELOG.md](../CHANGELOG.md).
4. Tag `vX.Y.Z` and push the tag. Do not force-push tags or `master`.
5. GitHub Actions attaches the zips and checksums. `docs.yml` deploys GitHub Pages when `master` updates.
6. Expand the published release body (this file is the source of truth for artifact usage). Example:

```bash
gh release edit v1.1.0 --notes-file docs/RELEASE.md
```

`master` is protected: require a pull request, no force-push.

Stackglass is not an npm package. Do not add `bin`, `files`, `publishConfig`, or registry publish steps.

## Version 1.1.0 highlights

- GlassLens: `why`, `session`, `heat`, `clusters`, snapshot compare, suspicious-commit ranking
- Optional modes on the existing 22 tools (`narrative`, `session`, `heat`, `rank_suspicious`, `files`, `repeat`, `cluster`)
- Live `glass dashboard` as the canonical UI
- Watch `autoRun` for related tests
- Cursor plugin flattened to the repository root
- GitHub Release zips instead of npm distribution

See [CHANGELOG.md](../CHANGELOG.md) for the full 1.1.0 list.
