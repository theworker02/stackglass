import { afterEach, describe, expect, it } from "vitest";
import { Stackglass, MCP_TOOL_NAMES } from "@stackglass/core";
import { invokeTool } from "./tools.ts";
import { SCHEMAS, toolNames } from "./schemas.ts";
import { cleanup, makeTsProject } from "../../../packages/core/src/test-utils.ts";
import { ZodError } from "zod";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) cleanup(root);
});

describe("MCP canonical tools", () => {
  it("exposes exactly 22 tools", () => {
    expect(MCP_TOOL_NAMES).toHaveLength(22);
    expect(toolNames).toHaveLength(22);
    expect(Object.keys(SCHEMAS)).toHaveLength(22);
  });

  it.each(MCP_TOOL_NAMES)("%s valid request serializes", async (name) => {
    const root = makeTsProject();
    roots.push(root);
    const glass = await Stackglass.open(root, { watch: false });
    await glass.init();
    const args = name === "mutation_test" ? { target: "src/auth/token.ts", max_mutants: 2 } : {};
    const result = await invokeTool(name, args, { glass });
    expect(result.text).toBeTypeOf("string");
    JSON.parse(result.text);
    expect(result.structured).toBeDefined();
    await glass.close();
  });

  it.each(MCP_TOOL_NAMES)("%s rejects extra arguments", (name) => {
    expect(() => SCHEMAS[name].parse({ not_a_real_field: true })).toThrow(ZodError);
  });

  it("error_analyze invalid empty still returns structured no_data", async () => {
    const root = makeTsProject();
    roots.push(root);
    const glass = await Stackglass.open(root, { watch: false });
    const result = await invokeTool("error_analyze", {}, { glass });
    const parsed = result.structured as { availability: string };
    expect(parsed.availability).toBe("no_data");
    await glass.close();
  });

  it("filters secrets from error payloads", async () => {
    const root = makeTsProject();
    roots.push(root);
    const glass = await Stackglass.open(root, { watch: false });
    const result = await invokeTool(
      "error_analyze",
      { stack_trace: "Error: postgres://user:hunter2@localhost:5432/db" },
      { glass },
    );
    expect(result.text).not.toContain("hunter2");
    expect(result.text).toContain("[REDACTED]");
    await glass.close();
  });

  it("env_usage never includes values", async () => {
    const root = makeTsProject();
    roots.push(root);
    const glass = await Stackglass.open(root, { watch: false });
    const result = await invokeTool("env_usage", {}, { glass });
    expect(result.text).not.toMatch(/=postgres/);
    await glass.close();
  });

  it("optional narrative and session stay on the same 22 tools", async () => {
    const root = makeTsProject();
    roots.push(root);
    const glass = await Stackglass.open(root, { watch: false });
    await glass.init();
    const snap = await invokeTool("project_snapshot", { narrative: true }, { glass });
    const snapBody = snap.structured as { narrative?: { headline: string } };
    expect(snapBody.narrative?.headline).toBeTypeOf("string");
    const timeline = await invokeTool(
      "project_activity_timeline",
      { session: true, limit: 10 },
      { glass },
    );
    const tl = timeline.structured as { session?: { summary: string }; events?: unknown[] };
    expect(tl.session?.summary).toBeTypeOf("string");
    expect(MCP_TOOL_NAMES).toHaveLength(22);
    await glass.close();
  });

  it("contract_verify detects breaking field removal", async () => {
    const root = makeTsProject();
    roots.push(root);
    const glass = await Stackglass.open(root, { watch: false });
    const result = await invokeTool(
      "contract_verify",
      { before: { id: 1, name: "a" }, after: { id: 1 } },
      { glass },
    );
    const structured = result.structured as { breaking: Array<{ kind: string }> };
    expect(structured.breaking.some((c) => c.kind === "property-removed")).toBe(true);
    await glass.close();
  });
});
