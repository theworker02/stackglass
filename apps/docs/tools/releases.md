# Releases

`release_readiness` / `glass release` never publishes. It reports git, tests, docs, config, changelog, and version checks.

Stackglass itself is distributed as GitHub Release zips, not npm. Current release: [v1.1.0](https://github.com/theworker02/stackglass/releases/tag/v1.1.0).

| Artifact                       | Use                                                        |
| ------------------------------ | ---------------------------------------------------------- |
| `stackglass-cli.zip`           | `node cli/dist/bin.js help`                                |
| `stackglass-mcp.zip`           | `STACKGLASS_ROOT=/project node scripts/stackglass-mcp.mjs` |
| `stackglass-cursor-plugin.zip` | Cursor Open Plugins folder                                 |
| `checksums.txt`                | SHA-256 of the three zips                                  |

Cursor plugin listing: [https://cursor.directory/plugins/stackglass](https://cursor.directory/plugins/stackglass).

Full instructions: [docs/RELEASE.md](https://github.com/theworker02/stackglass/blob/master/docs/RELEASE.md).
