import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Stackglass } from "@stackglass/core";
import { invokeTool, SCHEMAS, type ToolName } from "@stackglass/mcp";
import { dashboardHtml } from "./dashboard-ui.ts";

export async function serveDashboard(
  root: string,
  port = 4780,
): Promise<{ url: string; close: () => Promise<void> }> {
  const glass = await Stackglass.open(root, { watch: true });
  const server = createServer((req, res) => {
    void handle(req, res, glass);
  });
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
      await glass.close();
    },
  };
}

async function handle(req: IncomingMessage, res: ServerResponse, glass: Stackglass): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  try {
    if (url.pathname === "/api/events") {
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      });
      res.write(":\n\n");
      const off = glass.bus.on("event", (event) => {
        res.write(`data: ${JSON.stringify({ type: event.type, at: event.timestamp })}\n\n`);
      });
      req.on("close", () => off());
      return;
    }
    if (url.pathname === "/api/snapshot") return send(res, await glass.snapshot());
    if (url.pathname === "/api/timeline") {
      return send(res, glass.timeline({ limit: Number(url.searchParams.get("limit") ?? 100) }));
    }
    if (url.pathname === "/api/why") return send(res, await glass.why());
    if (url.pathname === "/api/session") return send(res, glass.session());
    if (url.pathname === "/api/heat") return send(res, glass.heat());
    if (url.pathname === "/api/clusters") return send(res, glass.clusters());
    if (url.pathname === "/api/attention") return send(res, await glass.attention());
    if (url.pathname === "/api/compare") return send(res, glass.compareSnapshots());
    if (url.pathname === "/api/tests") return send(res, glass.lab.discover());
    if (url.pathname === "/api/failures") return send(res, glass.storage.listFailures());
    if (url.pathname === "/api/coverage") return send(res, glass.lab.coverage());
    if (url.pathname === "/api/runtime") return send(res, { processes: glass.runtime.list() });
    if (url.pathname === "/api/changes") return send(res, await glass.gitSummary());
    if (url.pathname === "/api/config") return send(res, glass.configAudit());
    if (url.pathname === "/api/docs") return send(res, glass.docsCheck());
    if (url.pathname === "/api/release") return send(res, await glass.release());
    if (url.pathname === "/api/flakes") return send(res, glass.lab.flakes());
    if (url.pathname.startsWith("/api/tool/") && req.method === "POST") {
      const name = url.pathname.slice("/api/tool/".length) as ToolName;
      if (!(name in SCHEMAS)) {
        res.statusCode = 404;
        return send(res, { error: "unknown_tool" });
      }
      const body = await readBody(req);
      const result = await invokeTool(name, body, { glass });
      return send(res, result.structured);
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(dashboardHtml());
      return;
    }
    res.statusCode = 404;
    send(res, { error: "not_found" });
  } catch (error) {
    res.statusCode = 500;
    send(res, { error: error instanceof Error ? error.message : String(error) });
  }
}

function send(res: ServerResponse, body: unknown): void {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}
