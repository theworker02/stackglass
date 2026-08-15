import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Stackglass, STACKGLASS_VERSION, MCP_TOOL_NAMES } from "@stackglass/core";
import { SCHEMAS } from "./schemas.ts";
import { TOOL_DESCRIPTIONS, invokeTool, type ToolName } from "./tools.ts";
import { ZodError } from "zod";

export const MCP_RESOURCES = [
  { uri: "stackglass://project", name: "Project snapshot", mimeType: "application/json" },
  { uri: "stackglass://timeline", name: "Activity timeline", mimeType: "application/json" },
  { uri: "stackglass://tests", name: "Discovered tests", mimeType: "application/json" },
  { uri: "stackglass://failures", name: "Current failures", mimeType: "application/json" },
  { uri: "stackglass://coverage", name: "Coverage", mimeType: "application/json" },
  { uri: "stackglass://runtime", name: "Runtime processes", mimeType: "application/json" },
  { uri: "stackglass://changes", name: "Git changes", mimeType: "application/json" },
  { uri: "stackglass://configuration", name: "Configuration audit", mimeType: "application/json" },
  { uri: "stackglass://release", name: "Release readiness", mimeType: "application/json" },
  { uri: "stackglass://session", name: "Session replay", mimeType: "application/json" },
  { uri: "stackglass://attention", name: "Attention", mimeType: "application/json" },
  { uri: "stackglass://clusters", name: "Failure clusters", mimeType: "application/json" },
  { uri: "stackglass://heat", name: "File heat", mimeType: "application/json" },
] as const;

export const MCP_PROMPTS = [
  {
    name: "investigate-failure",
    description: "Investigate a current test or runtime failure using Stackglass evidence.",
  },
  {
    name: "verify-change",
    description: "Verify the current working-tree change with a targeted test plan.",
  },
  {
    name: "find-regression",
    description: "Find when a failure last passed and which changes sit in the suspect range.",
  },
  {
    name: "prepare-release",
    description: "Run release readiness and summarize remaining blockers. Never publish.",
  },
  {
    name: "explain-test-failure",
    description: "Explain a failing test with expected/actual, source, and history.",
  },
  {
    name: "review-current-state",
    description: "Summarize what the project is actually doing right now.",
  },
] as const;

export async function createStackglassMcpServer(root = process.cwd()): Promise<{
  server: McpServer;
  glass: Stackglass;
  close: () => Promise<void>;
}> {
  const glass = await Stackglass.open(root, { watch: false });
  const server = new McpServer({
    name: "stackglass",
    version: STACKGLASS_VERSION,
  });

  for (const name of MCP_TOOL_NAMES) {
    const toolName = name as ToolName;
    const schema = SCHEMAS[toolName];
    server.tool(
      name,
      TOOL_DESCRIPTIONS[toolName],
      schema.shape,
      async (args: Record<string, unknown>) => {
        try {
          const result = await invokeTool(toolName, args, { glass });
          return {
            content: [{ type: "text" as const, text: result.text }],
            structuredContent: result.structured as Record<string, unknown>,
          };
        } catch (error) {
          if (error instanceof ZodError) {
            return {
              isError: true,
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(
                    { error: "invalid_arguments", issues: error.issues },
                    null,
                    2,
                  ),
                },
              ],
            };
          }
          const message = error instanceof Error ? error.message : String(error);
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: "internal_failure", message }),
              },
            ],
          };
        }
      },
    );
  }

  for (const resource of MCP_RESOURCES) {
    server.resource(resource.name, resource.uri, async () => {
      const body = await readResource(glass, resource.uri);
      return {
        contents: [
          { uri: resource.uri, mimeType: resource.mimeType, text: JSON.stringify(body, null, 2) },
        ],
      };
    });
  }

  for (const prompt of MCP_PROMPTS) {
    server.prompt(prompt.name, prompt.description, async () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: promptText(prompt.name),
          },
        },
      ],
    }));
  }

  return {
    server,
    glass,
    close: async () => {
      await glass.close();
    },
  };
}

export async function readResource(glass: Stackglass, uri: string): Promise<unknown> {
  switch (uri) {
    case "stackglass://project":
      return glass.snapshot();
    case "stackglass://timeline":
      return glass.timeline({ limit: 100 });
    case "stackglass://tests":
      return glass.lab.discover();
    case "stackglass://failures":
      return glass.storage.listFailures();
    case "stackglass://coverage":
      return glass.lab.coverage();
    case "stackglass://runtime":
      return { processes: glass.runtime.list() };
    case "stackglass://changes":
      return glass.gitSummary();
    case "stackglass://configuration":
      return glass.configAudit();
    case "stackglass://release":
      return glass.release();
    case "stackglass://session":
      return glass.session();
    case "stackglass://attention":
      return glass.attention();
    case "stackglass://clusters":
      return glass.clusters();
    case "stackglass://heat":
      return glass.heat();
    default:
      return { availability: "unavailable", reason: `Unknown resource ${uri}` };
  }
}

function promptText(name: string): string {
  switch (name) {
    case "investigate-failure":
      return `Use Stackglass tools, not guesses.
1. project_snapshot
2. test_failure_analyze or error_analyze
3. error_trace
4. project_activity_timeline
5. git_change_summary
Form a hypothesis only after evidence. Reproduce before fixing.`;
    case "verify-change":
      return `Verify the current change with evidence:
1. git_change_summary
2. change_impact
3. test_plan
4. test_run (related/changed)
5. docs_check and contract_verify if public surface changed.
Do not claim PASS if tests were not run.`;
    case "find-regression":
      return `Find the regression range:
1. Capture the current failure fingerprint via error_analyze
2. git_history_context for the failing file
3. project_activity_timeline
Do not assume the newest commit is responsible.`;
    case "prepare-release":
      return `Call release_readiness. Summarize blockers and warnings.
Never publish. Publishing requires deliberate user action.`;
    case "explain-test-failure":
      return `Call test_failure_analyze and code_context for the failing file.
Compare expected vs actual, previous successful runs, and correlated failures.`;
    case "review-current-state":
      return `Call project_snapshot with narrative true, project_activity_timeline with session true, runtime_status, and git_change_summary.
Answer: what changed, what broke, what passed, what is running, whether it is releasable.`;
    default:
      return "Use Stackglass MCP tools to gather evidence before answering.";
  }
}

export async function startStdio(
  root = process.env.STACKGLASS_ROOT?.trim() || process.cwd(),
): Promise<void> {
  const { server, close } = await createStackglassMcpServer(root);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  const shutdown = async () => {
    await close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}
