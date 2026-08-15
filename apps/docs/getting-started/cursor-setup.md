# Cursor Setup

Install the plugin from [https://cursor.directory/plugins/stackglass](https://cursor.directory/plugins/stackglass).

Stackglass integrates with Cursor through the official Open Plugins layout at the **repository root**:

- MCP server `stackglass` — `node scripts/stackglass-mcp.mjs`, 22 tools, resources, prompts
- Rules in `rules/`
- Skills in `skills/`
- Agents in `agents/`
- Commands in `commands/`
- Hooks in `hooks/`
- `mcp.json` sets `STACKGLASS_ROOT` to the current workspace

```text
.cursor-plugin/plugin.json
mcp.json
rules/
skills/
agents/
commands/
hooks/
scripts/stackglass-mcp.mjs
```

After the plugin is available:

1. Clone this repository (or extract `stackglass-cli.zip`) and, for a source checkout, run `npm install` then `npm run build`.
2. In the project you want to observe: `node /path/to/stackglass/cli/dist/bin.js init`.
3. Confirm MCP server `stackglass` is listed in Cursor.
4. Open the UI with `node /path/to/stackglass/cli/dist/bin.js dashboard` (127.0.0.1).

Cursor plugins do not expose a custom sidebar API. The local dashboard and MCP resources are the evidence surface. Do not add `.cursor-plugin/marketplace.json` unless this repository becomes a multi-plugin marketplace.
