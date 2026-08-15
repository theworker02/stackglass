import { describe, expect, it, afterEach } from "vitest";
import {
  Stackglass,
  redactSecrets,
  fingerprintText,
  isSecretPath,
  analyzeError,
  toPosix,
} from "./index.ts";
import { cleanup, makeTsProject } from "./test-utils.ts";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) cleanup(root);
});

describe("security", () => {
  it("redacts secret values and never returns credentials", () => {
    const text = redactSecrets(
      "DATABASE_URL=postgres://user:pass@localhost/db\nTOKEN=ghp_abcdefghijklmnopqrstuvwxyz",
    );
    expect(text).not.toContain("postgres://");
    expect(text).not.toContain("ghp_");
    expect(text).toContain("[REDACTED]");
  });

  it("treats .env and key files as secret paths", () => {
    expect(isSecretPath(".env")).toBe(true);
    expect(isSecretPath("certs/id_rsa")).toBe(true);
    expect(isSecretPath("src/token.ts")).toBe(false);
  });

  it("creates stable fingerprints", () => {
    const a = fingerprintText(["TypeError", "src/a.ts", "boom 12"]);
    const b = fingerprintText(["TypeError", "src/a.ts", "boom 99"]);
    expect(a).toBe(b);
  });
});

describe("paths", () => {
  it("normalizes windows separators", () => {
    expect(toPosix("src\\auth\\token.ts")).toBe("src/auth/token.ts");
  });
});

describe("error intelligence", () => {
  it("parses TypeScript compiler errors", () => {
    const parsed = analyzeError({
      compilerError:
        "src/auth/token.ts:84:5 - error TS2322: Type 'number' is not assignable to type 'string'.",
    });
    expect(parsed.parser).toBe("typescript");
    expect(parsed.code).toBe("TS2322");
    expect(parsed.file).toContain("token.ts");
    expect(parsed.availability).toBe("available");
  });

  it("parses python tracebacks", () => {
    const parsed = analyzeError({
      stackTrace: `Traceback (most recent call last):\n  File "app.py", line 3, in <module>\n    raise ValueError("nope")\nValueError: nope`,
    });
    expect(parsed.parser).toBe("python");
    expect(parsed.file).toBe("app.py");
  });

  it("returns no_data for empty input", () => {
    expect(analyzeError({}).availability).toBe("no_data");
  });
});

describe("Stackglass workspace", () => {
  it("init is idempotent and indexes the project", async () => {
    const root = makeTsProject();
    roots.push(root);
    const a = await Stackglass.open(root, { watch: false });
    const first = await a.init();
    const second = await a.init();
    expect(first.languages).toContain("TypeScript");
    expect(second.created).toBe(false);
    const snap = await a.snapshot();
    expect(snap.packages.some((p) => p.name === "fixture-app")).toBe(true);
    expect(snap.changedFiles).toBeDefined();
    await a.close();
  });

  it("discovers vitest tests by convention", async () => {
    const root = makeTsProject();
    roots.push(root);
    const sg = await Stackglass.open(root, { watch: false });
    await sg.init();
    const discovery = sg.lab.discover();
    expect(discovery.files.some((f) => f.includes("token.test.ts"))).toBe(true);
    const plan = sg.lab.plan({ files: ["src/auth/token.ts"] });
    expect(plan.items.some((i) => i.target.includes("token.test.ts"))).toBe(true);
    await sg.close();
  });

  it("env usage reports names without values", async () => {
    const root = makeTsProject();
    roots.push(root);
    const sg = await Stackglass.open(root, { watch: false });
    const env = sg.envUsage();
    const db = env.variables.find((v) => v.name === "DATABASE_URL");
    expect(db).toBeDefined();
    expect(JSON.stringify(env)).not.toMatch(/postgres:\/\//);
    await sg.close();
  });

  it("docs check flags missing scripts", async () => {
    const root = makeTsProject();
    roots.push(root);
    const sg = await Stackglass.open(root, { watch: false });
    const docs = sg.docsCheck();
    expect(docs.mismatches.some((m) => m.reference.includes("dev:web"))).toBe(false);
    await sg.close();
  });

  it("records timeline events", async () => {
    const root = makeTsProject();
    roots.push(root);
    const sg = await Stackglass.open(root, { watch: false });
    sg.trace.record({ type: "file.changed", relatedFiles: ["src/auth/token.ts"] });
    const events = sg.timeline({ limit: 10, file: "token.ts" });
    expect(events.some((e) => e.type === "file.changed")).toBe(true);
    await sg.close();
  });

  it("classifies failures as new, recurring, resolved, and regression", async () => {
    const root = makeTsProject();
    roots.push(root);
    const sg = await Stackglass.open(root, { watch: false });
    sg.storage.upsertFailure({
      id: "f1",
      fingerprint: "fp-token",
      kind: "test",
      message: "expected 1",
      file: "src/auth/token.test.ts",
      testId: "token",
      firstSeen: "2026-08-14T10:00:00.000Z",
      lastSeen: "2026-08-14T10:00:00.000Z",
      status: "current",
    });
    expect(sg.storage.listFailures()[0]?.status).toBe("new");
    sg.storage.upsertFailure({
      id: "f1",
      fingerprint: "fp-token",
      kind: "test",
      message: "expected 1",
      file: "src/auth/token.test.ts",
      testId: "token",
      lastSeen: "2026-08-14T11:00:00.000Z",
      status: "current",
    });
    expect(sg.storage.listFailures()[0]?.status).toBe("recurring");
    sg.storage.resolveFailure("fp-token");
    expect(sg.storage.listFailures()[0]?.status).toBe("resolved");
    sg.storage.upsertFailure({
      id: "f1",
      fingerprint: "fp-token",
      kind: "test",
      message: "expected 1 again",
      file: "src/auth/token.test.ts",
      testId: "token",
      lastSeen: "2026-08-14T12:00:00.000Z",
      status: "current",
    });
    expect(sg.storage.listFailures()[0]?.status).toBe("regression");
    await sg.close();
  });

  it("doctor inspects the user project, not the Stackglass source tree", async () => {
    const root = makeTsProject();
    roots.push(root);
    const sg = await Stackglass.open(root, { watch: false });
    await sg.init();
    const report = sg.doctor();
    expect(report.version).toBe("1.1.0");
    const mcp = report.checks.find((c) => c.id === "mcp");
    expect(mcp?.detail).not.toMatch(/not built in this checkout/i);
    const cursor = report.checks.find((c) => c.id === "cursor");
    expect(cursor?.status).toBe("pass");
    await sg.close();
  });

  it("why, session, heat, and clusters connect through GlassCore", async () => {
    const root = makeTsProject();
    roots.push(root);
    const sg = await Stackglass.open(root, { watch: false });
    await sg.init();
    sg.trace.record({ type: "file.changed", relatedFiles: ["src/auth/token.ts"] });
    sg.trace.record({ type: "test.failed", relatedFiles: ["src/auth/token.test.ts"] });
    const narrative = await sg.why();
    expect(narrative.headline.length).toBeGreaterThan(0);
    expect(sg.session().eventCount).toBeGreaterThan(0);
    expect(sg.heat().length).toBeGreaterThan(0);
    expect(Array.isArray(sg.clusters())).toBe(true);
    expect(sg.compareSnapshots().availability).toMatch(/available|no_data/);
    await sg.close();
  });
});
