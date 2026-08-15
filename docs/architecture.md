# Architecture

```text
Cursor
   │
   ▼
Stackglass Plugin (MCP + rules + skills + commands + hooks)
   │
   ├──── glass dashboard (live Why / Session / Heat / Clusters / GlassLab)
   ├──── Timeline
   └──── Failure Center
   │
   ▼
GlassCore
   │
   ├──── GlassIndex
   ├──── GlassTrace
   ├──── GlassWatch (optional autoRun → related tests)
   ├──── GlassLens (narrative, session, heat, clusters, compare)
   └──── GlassLab
   │
   ▼
Adapters
   │
   ├──── Tests
   ├──── Build
   ├──── Runtime
   └──── Errors
   │
   ▼
Repository / Processes
```

The MCP server (`stackglass-mcp`) and the CLI (`glass`) access the same GlassCore runtime. They do not maintain a separate model of the project. New intelligence lands as optional arguments on the 22 tools, CLI commands, dashboard APIs, or MCP resources — never a 23rd tool.

## Packages

| Package                 | Role                                    |
| ----------------------- | --------------------------------------- |
| `@stackglass/core`      | Runtime, index, lab, lens, git, storage |
| `@stackglass/mcp`       | 22 MCP tools, resources, prompts        |
| `@stackglass/cli`       | `glass` / `stackglass` + live dashboard |
| `@stackglass/ui`        | Design tokens                           |
| `@stackglass/docs`      | VitePress site                          |
| `@stackglass/dashboard` | Static dashboard preview shell          |

The Cursor plugin is not a workspace package. It lives at the repository root in the layout Cursor Open Plugins expect: `.cursor-plugin/plugin.json`, `mcp.json`, `rules/`, `skills/`, `agents/`, `commands/`, and `hooks/`.

`apps/playground` is a pointer at `examples/auth-api`, not a workspace package.

Internal names (`@stackglass/core`, and so on) exist so this checkout can build. They are not npm packages.

## Data

Generated data lives in `.stackglass/` and is rebuildable. Human configuration is `config.json`. Machine-local files (`local.json`, cache, sqlite) are gitignored.

## Privacy

Local-first. No account. Source is not uploaded to a Stackglass service.
