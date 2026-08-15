# Cursor Setup

Stackglass integrates with Cursor through the official plugin format:

- MCP server `stackglass-mcp` (22 tools, resources, prompts)
- Rules in `rules/`
- Skills in `skills/`
- Commands and agents in the plugin package

The plugin lives at the repository root (`.cursor-plugin/plugin.json`, `mcp.json`, `rules/`, `skills/`, `agents/`, `commands/`, `hooks/`). Install it from this repo in Cursor, then run `glass init` in the project so the agent has a database and index.

The dashboard is `glass dashboard` (127.0.0.1). Cursor plugins do not expose a custom sidebar API; the local dashboard and MCP resources provide the UI and evidence surface.
