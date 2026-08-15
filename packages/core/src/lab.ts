import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { CancellationToken } from "./cancel.ts";
import type { StackglassConfig } from "./config.ts";
import type { GlassIndex } from "./index-engine.ts";
import type { GlassTrace } from "./trace.ts";
import type { GlassStorage } from "./storage.ts";
import { TEST_ADAPTERS, type TestAdapter } from "./adapters.ts";
import { fingerprintText } from "./security.ts";
import { gitChangeSummary } from "./git.ts";
import { analyzeError } from "./errors-intel.ts";
import type {
  Confidence,
  ContractChange,
  ContractCheck,
  ContractVerifyResult,
  CoverageReport,
  ChangedCodeCoverage,
  CoverageMetric,
  FileCoverage,
  FlakeCandidate,
  FlakeReport,
  MutationRequest,
  MutationResult,
  Mutant,
  RelatedTest,
  TestCase,
  TestDiscovery,
  TestFailure,
  TestFailureAnalysis,
  TestPlan,
  TestPlanItem,
  TestRunMode,
  TestRunRequest,
  TestRunResult,
  TestStatus,
  FailureCluster,
  FlakeRepeatResult,
} from "./protocol.ts";
import { clusterFailures } from "./lens.ts";

export class GlassLab {
  constructor(
    private readonly root: string,
    private readonly config: StackglassConfig,
    private readonly index: GlassIndex,
    private readonly trace: GlassTrace,
    private readonly storage: GlassStorage,
    private readonly adapters: TestAdapter[] = TEST_ADAPTERS,
  ) {}

  detectFrameworks(): TestDiscovery["frameworks"] {
    return this.adapters.map((a) => a.detect(this.root)).filter((f) => f.available);
  }

  discover(): TestDiscovery {
    const index = this.index.get();
    const frameworks = this.detectFrameworks();
    const available = this.adapters.filter((a) => a.detect(this.root).available);
    const cases: TestCase[] = [];
    for (const adapter of available) {
      cases.push(
        ...adapter.discover(
          this.root,
          index.files.map((f) => f.relativePath),
        ),
      );
    }
    const files = [...new Set(cases.map((c) => c.file))];
    const suites = [...new Set(cases.map((c) => c.suite).filter((s): s is string => Boolean(s)))];
    const packages = [...new Set(index.packages.map((p) => p.name))];
    return { frameworks, suites, files, cases, packages };
  }

  plan(input: { files?: string[]; task?: string; mode?: TestRunMode }): TestPlan {
    const changed = input.files ?? [];
    const items: TestPlanItem[] = [];
    const notes: string[] = [];
    const discovery = this.discover();
    const related = new Map<string, RelatedTest>();

    if (changed.length === 0 && input.mode === "workspace") {
      items.push({
        order: 1,
        kind: "test",
        target: "workspace",
        reason: "Full workspace verification requested.",
      });
      return { mode: "workspace", items, notes };
    }

    for (const file of changed) {
      for (const rel of this.index.relatedTests(file)) {
        if (!related.has(rel.file)) {
          related.set(rel.file, {
            id: rel.file,
            file: rel.file,
            name: path.posix.basename(rel.file),
            confidence: rel.confidence,
            reason: rel.reason,
          });
        }
      }
    }

    let order = 1;
    for (const rel of related.values()) {
      items.push({
        order: order++,
        kind: "test",
        target: rel.file,
        reason: rel.reason,
      });
    }

    const index = this.index.get();
    if (
      index.scripts.typecheck ||
      index.scripts["type-check"] ||
      existsSync(path.join(this.root, "tsconfig.json"))
    ) {
      items.push({
        order: order++,
        kind: "typecheck",
        target: "typecheck",
        reason: "TypeScript project detected; typecheck is a cheap contract on the public types.",
      });
    }

    const contractFiles = changed.filter((f) =>
      /openapi|swagger|\.graphql|schema|routes|api\//i.test(f),
    );
    if (contractFiles.length) {
      items.push({
        order: order++,
        kind: "contract",
        target: "contracts",
        reason: "Changed files appear to participate in a public API or schema.",
      });
    }

    if (items.length === 0) {
      const anyTest = discovery.files[0];
      if (anyTest) {
        items.push({
          order: 1,
          kind: "test",
          target: anyTest,
          reason:
            "No direct related tests found; selected the first discovered test file as a smoke check.",
        });
        notes.push(
          "Related-test confidence is low because no naming, import, or coverage link was found.",
        );
      } else {
        notes.push("No tests discovered in this workspace.");
      }
    }

    return { mode: input.mode ?? "related", items, notes };
  }

  async run(request: TestRunRequest, token?: CancellationToken): Promise<TestRunResult> {
    const mode = request.mode ?? "workspace";
    const frameworks = this.detectFrameworks();
    if (frameworks.length === 0) {
      this.trace.record({ type: "test.started", result: "unavailable" });
      return {
        id: randomUUID(),
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        mode,
        status: "unavailable",
        summary: { total: 0, passed: 0, failed: 0, skipped: 0, durationMs: 0 },
        cases: [],
        failures: [],
        outputExcerpt: "No test framework configured.",
      };
    }

    let files: string[] | undefined;
    if (request.files?.length && (mode === "related" || mode === "changed")) {
      const plan = this.plan({ files: request.files, mode });
      files = plan.items.filter((i) => i.kind === "test").map((i) => i.target);
    } else if (request.files?.length) {
      files = request.files;
    } else if (mode === "single" && request.target) {
      files = [request.target];
    }
    if (!request.files?.length && mode === "package" && request.target)
      files = this.discover().files.filter((f) => f.includes(request.target!));
    if (!request.files?.length && (mode === "changed" || mode === "related")) {
      const changes = await gitChangeSummary(this.root);
      const plan = this.plan({ files: changes.files.map((f) => f.path), mode });
      files = plan.items.filter((i) => i.kind === "test").map((i) => i.target);
    }
    if (mode === "failed") {
      const last = this.storage.latestTestRun();
      files = last?.failures.map((f) => f.file);
    }
    if (mode === "last") {
      const last = this.storage.latestTestRun();
      files = last?.cases.map((c) => c.file);
    }
    if (request.plan) {
      files = request.plan.items.filter((i) => i.kind === "test").map((i) => i.target);
    }

    const adapter = this.adapters.find((a) => a.detect(this.root).available);
    if (!adapter) {
      return {
        id: randomUUID(),
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        mode,
        status: "unavailable",
        summary: { total: 0, passed: 0, failed: 0, skipped: 0, durationMs: 0 },
        cases: [],
        failures: [],
      };
    }

    this.trace.record({
      type: "test.started",
      relatedFiles: files ?? [],
      metadata: { mode, adapter: adapter.id },
    });
    const started = Date.now();
    const result = await adapter.run({
      root: this.root,
      files,
      timeoutMs: request.timeoutMs ?? this.config.lab.defaultTimeoutMs,
      token,
    });
    result.mode = mode;
    this.storage.saveTestRun(result);
    const type =
      result.status === "pass"
        ? "test.passed"
        : result.status === "fail"
          ? "test.failed"
          : "test.failed";
    this.trace.record({
      type,
      relatedFiles: files ?? [],
      result: result.status,
      durationMs: Date.now() - started,
      metadata: { summary: result.summary },
    });
    for (const failure of result.failures) {
      this.storage.upsertFailure({
        id: randomUUID(),
        fingerprint: failure.fingerprint,
        kind: "test",
        message: failure.message,
        file: failure.file,
        testId: failure.testId,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        status: "current",
      });
    }
    return result;
  }

  async repeat(request: TestRunRequest, token?: CancellationToken): Promise<FlakeRepeatResult> {
    const requested = Math.min(Math.max(request.repeat ?? 3, 1), this.config.lab.flakeRepeatLimit);
    const target = request.target ?? request.files?.[0] ?? request.mode ?? "workspace";
    let passed = 0;
    let failed = 0;
    let ran = 0;
    let stoppedEarly = false;
    const notes: string[] = [];
    for (let i = 0; i < requested; i++) {
      if (token?.isCancelled) {
        stoppedEarly = true;
        notes.push("Cancelled before completing all repeats.");
        break;
      }
      const result = await this.run({ ...request, repeat: undefined }, token);
      ran += 1;
      if (result.status === "pass") passed += 1;
      else failed += 1;
      if (result.status === "unavailable") {
        stoppedEarly = true;
        notes.push(result.outputExcerpt ?? "Adapter unavailable.");
        break;
      }
    }
    if (passed > 0 && failed > 0) {
      notes.push(
        "Mixed pass/fail across repeats. Candidate flake — never labeled from a single run.",
      );
    } else if (failed === 0 && ran > 0) {
      notes.push("All repeats passed.");
    } else if (passed === 0 && failed > 0) {
      notes.push("All repeats failed. Treat as a consistent failure, not a flake.");
    }
    return { target, requested, ran, passed, failed, stoppedEarly, notes };
  }

  clusters(): FailureCluster[] {
    return clusterFailures(this.storage.listFailures());
  }

  analyzeFailure(failure: TestFailure, options?: { cluster?: boolean }): TestFailureAnalysis {
    const history = this.storage.testHistory(failure.testId);
    const previousPass = history.flatMap((run) =>
      run.cases
        .filter((c) => c.id === failure.testId && c.status === "pass")
        .map((c) => ({
          id: run.id,
          at: run.finishedAt,
          status: c.status as TestStatus,
          durationMs: c.duration,
          commit: undefined,
        })),
    )[0];
    const last = this.storage.latestTestRun();
    const correlated = (last?.failures ?? []).filter(
      (f) => f.testId !== failure.testId && f.file === failure.file,
    );
    const stored = this.storage.findFailureByFingerprint(failure.fingerprint);
    const analyzed = analyzeError({ testFailure: failure.stack ?? failure.message });
    const possibleCauses: string[] = [];
    if (failure.expected && failure.actual) {
      possibleCauses.push("Assertion expected/actual mismatch.");
    }
    if (analyzed.file)
      possibleCauses.push(`Parser located source at ${analyzed.file}:${analyzed.line ?? "?"}.`);
    const recent = this.trace.query({ file: failure.file, limit: 10 });
    if (recent.some((e) => e.type === "file.changed")) {
      possibleCauses.push("The test file or a related source file changed recently.");
    }
    return {
      failure,
      expected: failure.expected,
      actual: failure.actual,
      stack: failure.stack,
      recentChange: undefined,
      previousSuccessfulRun: previousPass,
      correlatedFailures: correlated,
      firstSeen: stored?.firstSeen,
      lastSeen: stored?.lastSeen,
      previouslyResolved: Boolean(stored?.status === "resolved"),
      similarFailures: stored ? [stored] : [],
      possibleCauses,
      clusters: options?.cluster
        ? clusterFailures(
            this.storage
              .listFailures()
              .filter((f) => f.file === failure.file || f.fingerprint === failure.fingerprint),
          )
        : undefined,
    };
  }

  flakes(): FlakeReport {
    const latest = this.storage.latestTestRun();
    if (!latest) return { tests: [] };
    const candidates: FlakeCandidate[] = [];
    const byId = new Map<string, TestStatus[]>();
    const allRuns: TestRunResult[] = [];
    try {
      const more = this.storage.db
        .prepare(`SELECT payload FROM test_runs ORDER BY started_at DESC LIMIT 30`)
        .all() as Array<{ payload: string }>;
      for (const row of more) {
        allRuns.push(JSON.parse(row.payload) as TestRunResult);
      }
    } catch {
      allRuns.push(latest);
    }
    for (const run of allRuns) {
      for (const testCase of run.cases) {
        const list = byId.get(testCase.id) ?? [];
        if (testCase.status) list.push(testCase.status);
        byId.set(testCase.id, list);
      }
    }
    for (const [testId, statuses] of byId) {
      const unique = new Set(statuses.filter((s) => s === "pass" || s === "fail"));
      if (unique.has("pass") && unique.has("fail") && statuses.length >= 3) {
        const passes = statuses.filter((s) => s === "pass").length;
        const fails = statuses.filter((s) => s === "fail").length;
        const confidence: Confidence =
          statuses.length >= 8 ? "high" : statuses.length >= 5 ? "moderate" : "low";
        const sample = latest.cases.find((c) => c.id === testId);
        candidates.push({
          testId,
          name: sample?.name ?? testId,
          file: sample?.file ?? "",
          confidence,
          passRate: passes / (passes + fails),
          samples: statuses.length,
          notes: [
            "Alternating pass/fail observed across stored runs.",
            "A test is never labeled flaky from a single failure.",
          ],
        });
      }
    }
    return { tests: candidates };
  }

  coverage(scope: CoverageReport["scope"] = "workspace", target?: string): CoverageReport {
    const candidates = [
      path.join(this.root, "coverage", "coverage-summary.json"),
      path.join(this.root, "coverage", "coverage-final.json"),
      path.join(this.root, "coverage.json"),
    ];
    const found = candidates.find((p) => existsSync(p));
    if (!found) {
      return {
        availability: "no_data",
        scope,
        target,
        files: [],
      };
    }
    try {
      const json = JSON.parse(readFileSync(found, "utf8")) as Record<string, unknown>;
      const files: FileCoverage[] = [];
      const total = (json.total ?? json) as Record<string, unknown>;
      const metric = (key: string): CoverageMetric | undefined => {
        const m = total[key] as { covered?: number; total?: number; pct?: number } | undefined;
        if (!m || typeof m.pct !== "number") return undefined;
        return { covered: m.covered ?? 0, total: m.total ?? 0, pct: m.pct };
      };
      for (const [file, value] of Object.entries(json)) {
        if (file === "total" || typeof value !== "object" || !value) continue;
        const rec = value as Record<string, { covered?: number; total?: number; pct?: number }>;
        if (!rec.lines && !rec.statements) continue;
        files.push({
          file,
          lines: rec.lines
            ? {
                covered: rec.lines.covered ?? 0,
                total: rec.lines.total ?? 0,
                pct: rec.lines.pct ?? 0,
              }
            : undefined,
          branches: rec.branches
            ? {
                covered: rec.branches.covered ?? 0,
                total: rec.branches.total ?? 0,
                pct: rec.branches.pct ?? 0,
              }
            : undefined,
          functions: rec.functions
            ? {
                covered: rec.functions.covered ?? 0,
                total: rec.functions.total ?? 0,
                pct: rec.functions.pct ?? 0,
              }
            : undefined,
          statements: rec.statements
            ? {
                covered: rec.statements.covered ?? 0,
                total: rec.statements.total ?? 0,
                pct: rec.statements.pct ?? 0,
              }
            : undefined,
        });
      }
      const previous = this.storage.latestCoverage("workspace") as CoverageReport | undefined;
      const report: CoverageReport = {
        availability: "available",
        scope,
        target,
        lines: metric("lines"),
        branches: metric("branches"),
        functions: metric("functions"),
        statements: metric("statements"),
        files:
          scope === "file" && target
            ? files.filter((f) => f.file.replaceAll("\\", "/").endsWith(target))
            : files,
        baseline: previous?.lines
          ? {
              source: "previous stored coverage",
              at: previous.baseline?.at ?? "previous",
              linesPct: previous.lines.pct,
            }
          : undefined,
      };
      this.storage.saveCoverage(randomUUID(), new Date().toISOString(), "workspace", report);
      return report;
    } catch {
      return { availability: "unavailable", scope, target, files: [] };
    }
  }

  async changedCodeCoverage(): Promise<ChangedCodeCoverage[]> {
    const coverage = this.coverage("changed");
    if (coverage.availability !== "available") return [];
    const changes = await gitChangeSummary(this.root);
    const out: ChangedCodeCoverage[] = [];
    for (const file of changes.files) {
      const rec = coverage.files.find((f) => f.file.replaceAll("\\", "/").endsWith(file.path));
      if (!rec?.lines) continue;
      out.push({
        file: file.path,
        changedLines: file.insertions ?? 0,
        coveredChangedLines: Math.round(((rec.lines.pct ?? 0) / 100) * (file.insertions ?? 0)),
        pct: rec.lines.pct,
        uncoveredLines: [],
      });
    }
    return out;
  }

  async mutate(request: MutationRequest, token?: CancellationToken): Promise<MutationResult> {
    const target = request.target;
    const abs = path.join(this.root, target);
    if (!existsSync(abs)) {
      return {
        availability: "unavailable",
        target,
        workspace: "",
        generated: 0,
        killed: 0,
        survived: 0,
        timedOut: 0,
        invalid: 0,
        mutants: [],
        notes: ["Target file does not exist."],
      };
    }
    const original = readFileSync(abs, "utf8");
    const mutants = generateMutants(
      target,
      original,
      request.maxMutants ?? this.config.lab.mutationMaxMutants,
    );
    if (mutants.length === 0) {
      return {
        availability: "available",
        target,
        workspace: "",
        generated: 0,
        killed: 0,
        survived: 0,
        timedOut: 0,
        invalid: 0,
        mutants: [],
        notes: ["No supported mutation sites found in the target."],
      };
    }
    const tmp = mkdtempSync(path.join(tmpdir(), "stackglass-mut-"));
    try {
      cpSync(this.root, tmp, {
        recursive: true,
        filter: (src) =>
          !src.includes(`${path.sep}node_modules${path.sep}`) &&
          !src.includes(`${path.sep}.git${path.sep}`) &&
          !src.includes(`${path.sep}.stackglass${path.sep}`),
      });
      const isolated = new GlassLab(
        tmp,
        this.config,
        this.index,
        this.trace,
        this.storage,
        this.adapters,
      );
      void isolated;
      const results: Mutant[] = [];
      for (const mutant of mutants) {
        token?.throwIfCancelled();
        const clonePath = path.join(tmp, mutant.file);
        const mutated = applyMutant(original, mutant);
        writeFileSync(clonePath, mutated, "utf8");
        const related = this.plan({ files: [target], mode: "related" });
        const testFiles = related.items.filter((i) => i.kind === "test").map((i) => i.target);
        const adapter = this.adapters.find((a) => a.detect(tmp).available);
        if (!adapter) {
          mutant.status = "invalid";
          results.push(mutant);
          continue;
        }
        try {
          const run = await adapter.run({
            root: tmp,
            files: testFiles.length ? testFiles : undefined,
            timeoutMs: Math.min(request.timeoutMs ?? 30_000, 60_000),
            token,
          });
          if (run.status === "fail") {
            mutant.status = "killed";
            mutant.killingTest = run.failures[0]?.name;
          } else if (run.status === "error") {
            mutant.status = "timed_out";
          } else {
            mutant.status = "survived";
          }
        } catch {
          mutant.status = "invalid";
        }
        writeFileSync(clonePath, original, "utf8");
        results.push(mutant);
      }
      return {
        availability: "available",
        target,
        workspace: tmp,
        generated: results.length,
        killed: results.filter((m) => m.status === "killed").length,
        survived: results.filter((m) => m.status === "survived").length,
        timedOut: results.filter((m) => m.status === "timed_out").length,
        invalid: results.filter((m) => m.status === "invalid").length,
        mutants: results,
        notes: [
          "Mutations were applied in an isolated temporary workspace. The working tree was not modified.",
        ],
      };
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }

  verifyContracts(): ContractVerifyResult {
    const index = this.index.get();
    const checks: ContractCheck[] = [];
    const breaking: ContractChange[] = [];
    const compatible: ContractChange[] = [];

    const openapi = index.files.find((f) => /openapi|swagger/i.test(f.relativePath));
    if (openapi) {
      checks.push({
        kind: "openapi",
        name: openapi.relativePath,
        status: "not_configured",
        details: "Schema file present; runtime comparison requires a stored baseline.",
      });
    }
    const graphql = index.files.find(
      (f) => f.relativePath.endsWith(".graphql") || f.relativePath.endsWith(".gql"),
    );
    if (graphql) {
      checks.push({ kind: "graphql", name: graphql.relativePath, status: "not_configured" });
    }
    for (const exp of index.publicExports) {
      checks.push({
        kind: "package-exports",
        name: `${exp.package}:${exp.name}`,
        status: "pass",
        details: "Export map entry present in package.json.",
      });
    }
    const snapshots = index.files.filter(
      (f) => f.relativePath.includes("__snapshots__") || f.relativePath.endsWith(".snap"),
    );
    if (snapshots.length) {
      checks.push({
        kind: "snapshot",
        name: `${snapshots.length} snapshot files`,
        status: "not_configured",
        details: "Snapshot files detected. Stackglass will not auto-accept snapshot updates.",
      });
    }
    if (checks.length === 0) {
      return {
        availability: "not_configured",
        contracts: [],
        breaking,
        compatible,
      };
    }
    return { availability: "available", contracts: checks, breaking, compatible };
  }

  compareContracts(before: unknown, after: unknown, pathPrefix = "$"): ContractChange[] {
    if (typeof before !== "object" || typeof after !== "object" || !before || !after) {
      if (before !== after) {
        return [
          {
            kind: "type-changed",
            path: pathPrefix,
            breaking: true,
            before: String(before),
            after: String(after),
          },
        ];
      }
      return [];
    }
    const changes: ContractChange[] = [];
    const b = before as Record<string, unknown>;
    const a = after as Record<string, unknown>;
    for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
      const p = `${pathPrefix}.${key}`;
      if (!(key in a)) {
        changes.push({
          kind: "property-removed",
          path: p,
          breaking: true,
          before: JSON.stringify(b[key]),
        });
      } else if (!(key in b)) {
        changes.push({
          kind: "property-added",
          path: p,
          breaking: false,
          after: JSON.stringify(a[key]),
        });
      } else if (JSON.stringify(b[key]) !== JSON.stringify(a[key])) {
        changes.push(...this.compareContracts(b[key], a[key], p));
      }
    }
    return changes;
  }

  gaps(): Array<{ message: string; confidence: Confidence; related?: string }> {
    const index = this.index.get();
    const discovery = this.discover();
    const out: Array<{ message: string; confidence: Confidence; related?: string }> = [];
    for (const symbol of index.symbols.filter((s) => s.exported)) {
      const related = this.index.relatedTests(symbol.file);
      if (related.length === 0) {
        out.push({
          message: `Public ${symbol.kind} ${symbol.name} in ${symbol.file} has no related test by naming or imports.`,
          confidence: "low",
          related: symbol.file,
        });
      }
    }
    for (const pkg of index.packages) {
      const dir = path.posix.dirname(pkg.path);
      const hasTests = discovery.files.some(
        (f) => f.startsWith(dir === "." ? "" : `${dir}/`) || f.startsWith(dir),
      );
      if (!hasTests && discovery.files.length > 0) {
        out.push({
          message: `Package ${pkg.name} may not have tests.`,
          confidence: "moderate",
          related: pkg.path,
        });
      }
    }
    return out.slice(0, 50);
  }
}

function generateMutants(file: string, source: string, max: number): Mutant[] {
  const mutants: Mutant[] = [];
  const operators: Array<{ re: RegExp; replacement: (m: string) => string; op: string }> = [
    { re: /\btrue\b/g, replacement: () => "false", op: "boolean-inversion" },
    { re: /\bfalse\b/g, replacement: () => "true", op: "boolean-inversion" },
    { re: /===/g, replacement: () => "!==", op: "comparison-boundary" },
    { re: /!==/g, replacement: () => "===", op: "comparison-boundary" },
    { re: />=/g, replacement: () => ">", op: "comparison-boundary" },
    { re: /<=/g, replacement: () => "<", op: "comparison-boundary" },
    { re: /(?<![<>!=])>(?!=)/g, replacement: () => ">=", op: "comparison-boundary" },
    { re: /(?<![<>!=])<(?!=)/g, replacement: () => "<=", op: "comparison-boundary" },
    {
      re: /\breturn\s+([^;]+);/g,
      replacement: () => "return undefined;",
      op: "return-value-substitution",
    },
  ];
  for (const op of operators) {
    op.re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = op.re.exec(source))) {
      if (mutants.length >= max) return mutants;
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      const original = match[0];
      mutants.push({
        id: fingerprintText([file, String(line), op.op, original]),
        file,
        line,
        operator: op.op,
        original,
        replacement: op.replacement(original),
        status: "invalid",
      });
    }
  }
  return mutants;
}

function applyMutant(source: string, mutant: Mutant): string {
  const lines = source.split(/\r?\n/);
  const idx = mutant.line - 1;
  const line = lines[idx];
  if (line === undefined) return source;
  lines[idx] = line.replace(mutant.original, mutant.replacement);
  return lines.join("\n");
}
