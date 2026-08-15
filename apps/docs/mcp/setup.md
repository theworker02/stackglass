# MCP Setup

The Cursor plugin at [https://cursor.directory/plugins/stackglass](https://cursor.directory/plugins/stackglass) starts the server for you.

To run it yourself, clone this repository, `npm install && npm run build`, then:

```bash
STACKGLASS_ROOT=/path/to/your/project node scripts/stackglass-mcp.mjs
```

Equivalent: `node servers/mcp/dist/bin.js` or `node cli/dist/bin.js mcp`.

From a GitHub Release, extract `stackglass-mcp.zip` (same tree as `stackglass-cli.zip`) and use the same command. Set `STACKGLASS_ROOT` to the user workspace. Cursor plugin `mcp.json` does this automatically.

The public surface is **exactly 22 tools**. See [Tools](/mcp/tools) and [tool reference](/mcp/tools-reference).
