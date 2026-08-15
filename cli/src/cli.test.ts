import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCli, parseArgs, type CliIo } from "./index.ts";
import { dashboardHtml } from "./dashboard-ui.ts";
import { cleanup, makeTsProject } from "../../packages/core/src/test-utils.ts";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) cleanup(root);
});

function capture(): { io: CliIo; out: string[] } {
  const out: string[] = [];
  return {
    out,
    io: {
      stdout: (text) => {
        out.push(text);
      },
      stderr: (text) => {
        out.push(text);
      },
    },
  };
}

describe("CLI parse", () => {
  it("parses command and flags", () => {
    const parsed = parseArgs(["node", "glass", "timeline", "--limit", "5", "--file", "a.ts"]);
    expect(parsed.rest[0]).toBe("timeline");
    expect(parsed.flags.limit).toBe("5");
    expect(parsed.flags.file).toBe("a.ts");
  });
});

describe("bin entry", () => {
  it("CLI and MCP bins start with a node shebang", () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const cliBin = readFileSync(path.join(here, "bin.ts"), "utf8");
    const mcpBin = readFileSync(path.join(here, "../../servers/mcp/src/bin.ts"), "utf8");
    expect(cliBin.startsWith("#!/usr/bin/env node")).toBe(true);
    expect(mcpBin.startsWith("#!/usr/bin/env node")).toBe(true);
  });
});

describe("CLI commands", () => {
  it("glass help exits 0", async () => {
    const { io } = capture();
    const code = await runCli(["node", "glass", "help"], process.cwd(), io);
    expect(code).toBe(0);
  });

  it("glass init + status + doctor + snapshot + timeline + config + docs + release", async () => {
    const root = makeTsProject();
    roots.push(root);
    const { io } = capture();
    expect(await runCli(["node", "glass", "init"], root, io)).toBe(0);
    expect(await runCli(["node", "glass", "status"], root, io)).toBe(0);
    expect(await runCli(["node", "glass", "doctor"], root, io)).toBe(0);
    expect(await runCli(["node", "glass", "snapshot"], root, io)).toBe(0);
    expect(await runCli(["node", "glass", "timeline"], root, io)).toBe(0);
    expect(await runCli(["node", "glass", "config"], root, io)).toBe(0);
    expect(await runCli(["node", "glass", "docs"], root, io)).toBe(0);
    const release = await runCli(["node", "glass", "release"], root, io);
    expect([0, 1]).toContain(release);
  });

  it("glass why session heat clusters attention compare", async () => {
    const root = makeTsProject();
    roots.push(root);
    const { io, out } = capture();
    expect(await runCli(["node", "glass", "init"], root, io)).toBe(0);
    expect(await runCli(["node", "glass", "why"], root, io)).toBe(0);
    expect(await runCli(["node", "glass", "session"], root, io)).toBe(0);
    expect(await runCli(["node", "glass", "heat"], root, io)).toBe(0);
    expect(await runCli(["node", "glass", "clusters"], root, io)).toBe(0);
    expect(await runCli(["node", "glass", "attention"], root, io)).toBe(0);
    expect(await runCli(["node", "glass", "compare"], root, io)).toBe(0);
    expect(out.join("")).toMatch(/STACKGLASS|Unanswered|No heat|Nothing|availability/i);
  });

  it("dashboard HTML includes a real mark symbol", () => {
    expect(dashboardHtml()).toContain('id="mark"');
    expect(dashboardHtml()).toContain("STACKGLASS");
    expect(dashboardHtml()).toContain("url(#sg-s)");
  });
});
