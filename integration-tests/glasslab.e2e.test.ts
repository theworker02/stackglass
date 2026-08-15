import { afterEach, describe, expect, it } from "vitest";
import { Stackglass } from "@stackglass/core";
import { cleanup, makeTsProject, write } from "../packages/core/src/test-utils.ts";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) cleanup(root);
});

describe("GlassLab e2e path", () => {
  it("discover → plan → record failure → analyze → timeline", async () => {
    const root = makeTsProject();
    roots.push(root);
    write(
      root,
      "src/auth/token.test.ts",
      `import { describe, it, expect } from "vitest";
describe("tokenExpiry", () => {
  it("adds milliseconds", () => {
    expect(1).toBe(2);
  });
});
`,
    );
    const sg = await Stackglass.open(root, { watch: false });
    await sg.init();
    const discovered = sg.lab.discover();
    expect(discovered.cases.length).toBeGreaterThan(0);
    const plan = sg.lab.plan({ files: ["src/auth/token.ts"] });
    expect(plan.items.length).toBeGreaterThan(0);
    sg.trace.record({
      type: "test.failed",
      relatedFiles: ["src/auth/token.test.ts"],
      result: "fail",
      metadata: { name: "adds milliseconds" },
    });
    const analysis = sg.lab.analyzeFailure({
      testId: "vitest:src/auth/token.test.ts:adds milliseconds",
      name: "adds milliseconds",
      file: "src/auth/token.test.ts",
      message: "expected 1 to be 2",
      expected: "2",
      actual: "1",
      fingerprint: "abc",
    });
    expect(analysis.failure.expected).toBe("2");
    const timeline = sg.timeline({ eventTypes: ["test.failed"] });
    expect(timeline.length).toBeGreaterThan(0);
    await sg.close();
  });
});
