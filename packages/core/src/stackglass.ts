import { existsSync, readFileSync, cpSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureProjectLayout, loadConfig, writeConfig, type StackglassConfig } from "./config.ts";
import { Logger } from "./logging.ts";
import { EventBus, type CoreEvents } from "./events.ts";
import { GlassStorage } from "./storage.ts";
import { GlassIndex } from "./index-engine.ts";
import { GlassTrace } from "./trace.ts";
import { GlassWatch } from "./watch.ts";
import { GlassLab } from "./lab.ts";
import { RuntimeManager } from "./runtime.ts";
import { CancellationToken } from "./cancel.ts";
import { gitIdentity, gitChangeSummary, gitHistoryContext } from "./git.ts";
import { analyzeError } from "./errors-intel.ts";
import { auditConfig, docsCheck, envUsage, releaseReadiness } from "./integrity.ts";
import { createSnapshot, writeProjectManifest } from "./snapshot.ts";
import { doctor, writeDoctorBundle } from "./doctor.ts";
import { stackglassDir, relativeTo, toPosix } from "./paths.ts";
import { readTextIfSafe } from "./fs-scan.ts";
import { TEST_ADAPTERS } from "./adapters.ts";
import {
  composeAttention,
  diffSnapshots,
  fileHeat,
  narrate,
  rankSuspiciousCommits,
  replaySession,
} from "./lens.ts";
import type {
  ChangeImpact,
  CodeContext,
  CodeContextRequest,
  DependencyTrace,
  ErrorAnalyzeRequest,
  ErrorTrace,
  FileHeatEntry,
  GitChangeSummary,
  GitHistoryContext,
  ProjectNarrative,
  ProjectSnapshot,
  RelatedTest,
  SessionReplay,
  SnapshotDiff,
  SuspiciousCommit,
  TimelineQuery,
} from "./protocol.ts";

const RULE_FILES = [
  "01-observe-before-changing.mdc",
  "02-investigate-failures.mdc",
  "03-test-selection.mdc",
  "04-test-integrity.mdc",
  "05-no-blind-snapshot-updates.mdc",
  "06-validate-changes.mdc",
  "07-config-awareness.mdc",
  "08-environment-safety.mdc",
  "09-runtime-awareness.mdc",
  "10-git-awareness.mdc",
  "11-documentation-consistency.mdc",
  "12-contract-safety.mdc",
  "13-regression-awareness.mdc",
  "14-scope-control.mdc",
  "15-release-safety.mdc",
];

export interface OpenOptions {
  watch?: boolean;
  log?: Logger;
}

export class Stackglass {
  readonly root: string;
  readonly config: StackglassConfig;
  readonly log: Logger;
  readonly bus: EventBus<CoreEvents>;
  readonly storage: GlassStorage;
  readonly index: GlassIndex;
  readonly trace: GlassTrace;
  readonly watch: GlassWatch;
  readonly lab: GlassLab;
  readonly runtime: RuntimeManager;
  readonly token = new CancellationToken();

  private constructor(root: string, config: StackglassConfig, log: Logger) {
    this.root = root;
    this.config = config;
    this.log = log;
    this.bus = new EventBus();
    this.storage = new GlassStorage(root);
    this.index = new GlassIndex(root, config);
    this.trace = new GlassTrace(this.storage, this.bus);
    this.watch = new GlassWatch(root, config, this.trace, this.index);
    this.lab = new GlassLab(root, config, this.index, this.trace, this.storage);
    this.runtime = new RuntimeManager(root, this.trace);
  }

  static async open(workspaceRoot: string, options: OpenOptions = {}): Promise<Stackglass> {
    const root = path.resolve(workspaceRoot);
    ensureProjectLayout(root);
    const config = loadConfig(root);
    const log = options.log ?? new Logger(config.logging.level);
    const sg = new Stackglass(root, config, log);
    sg.index.build();
    sg.storage.applyRetention(config);
    if (options.watch ?? config.watch.enabled) {
      if (config.watch.autoRun) {
        sg.watch.onChange = (changes) => {
          const files = changes
            .filter((c) => c.kind === "source" || c.kind === "test")
            .map((c) => c.path);
          if (files.length === 0) return;
          sg.trace.record({ type: "watch.autorun", relatedFiles: files });
          void sg.lab.run({ mode: "related", files });
        };
      }
      sg.watch.start();
    }
    return sg;
  }

  async init(): Promise<{
    created: boolean;
    languages: string[];
    frameworks: string[];
    packageManager?: string;
    summary: string[];
  }> {
    const existed = existsSync(path.join(stackglassDir(this.root), "project.json"));
    ensureProjectLayout(this.root);
    writeConfig(this.root, this.config);
    const index = this.index.build();
    const frameworks = this.lab.detectFrameworks().map((f) => f.name);
    const packageManager = index.packages[0]?.manager;
    writeProjectManifest(this.root, {
      initializedAt: new Date().toISOString(),
      languages: index.languages.map((l) => l.language),
      frameworks,
      packageManager,
    });
    this.installCursorRules();
    await this.snapshot();
    this.trace.record({ type: "snapshot.created", metadata: { reason: "init" } });
    const summary = [
      `Workspace: ${this.root}`,
      `Languages: ${index.languages.map((l) => l.language).join(", ") || "none detected"}`,
      `Packages: ${index.packages.map((p) => p.name).join(", ") || "none"}`,
      `Test frameworks: ${frameworks.join(", ") || "none"}`,
      `Package manager: ${packageManager ?? "n/a"}`,
      existed ? "Reinitialized existing .stackglass/ (idempotent)." : "Created .stackglass/.",
    ];
    return {
      created: !existed,
      languages: index.languages.map((l) => l.language),
      frameworks,
      packageManager,
      summary,
    };
  }

  installCursorRules(): void {
    const dest = path.join(this.root, ".cursor", "rules");
    mkdirSync(dest, { recursive: true });
    const sourceDir = resolveBundled("rules");
    for (const name of RULE_FILES) {
      const from = path.join(sourceDir, name);
      const to = path.join(dest, name);
      if (existsSync(from) && !existsSync(to)) {
        cpSync(from, to);
      }
    }
  }

  async snapshot(): Promise<ProjectSnapshot> {
    const { snapshot } = await createSnapshot({
      root: this.root,
      index: this.index,
      storage: this.storage,
      runtime: this.runtime,
    });
    snapshot.attention = composeAttention({
      snapshot,
      flakes: this.lab.flakes().tests.length,
      docsMismatches: this.docsCheck().mismatches.length,
      configWarnings: this.configAudit().findings.filter((f) => f.severity !== "info").length,
      clusters: this.lab.clusters().length,
    });
    return snapshot;
  }

  async why(): Promise<ProjectNarrative> {
    const snapshot = await this.snapshot();
    return narrate(snapshot, this.timeline({ limit: 80 }));
  }

  session(limit = 200): SessionReplay {
    return replaySession(this.timeline({ limit }));
  }

  heat(): FileHeatEntry[] {
    return fileHeat(this.timeline({ limit: 400 }), this.storage.listFailures());
  }

  clusters() {
    return this.lab.clusters();
  }

  compareSnapshots(beforeId?: string, afterId?: string): SnapshotDiff {
    const listed = this.storage.listSnapshots(8);
    const after = afterId ? this.storage.snapshotById(afterId) : listed[0];
    const before = beforeId ? this.storage.snapshotById(beforeId) : listed[1];
    return diffSnapshots(before, after);
  }

  async attention() {
    return (await this.snapshot()).attention;
  }

  async rankSuspicious(failingFiles?: string[]): Promise<SuspiciousCommit[]> {
    const files =
      failingFiles ??
      this.storage
        .listFailures()
        .map((f) => f.file)
        .filter((f): f is string => Boolean(f));
    const history = await gitHistoryContext(this.root, { file: files[0] });
    return rankSuspiciousCommits(history.commits, files);
  }

  timeline(query: TimelineQuery = {}) {
    return this.trace.query(query);
  }

  async gitSummary(): Promise<GitChangeSummary> {
    return gitChangeSummary(this.root);
  }

  async gitHistory(target: {
    file?: string;
    directory?: string;
    query?: string;
    rankSuspicious?: boolean;
  }): Promise<GitHistoryContext> {
    const history = await gitHistoryContext(this.root, target);
    if (!target.rankSuspicious) return history;
    const failing = this.storage
      .listFailures()
      .map((f) => f.file)
      .filter((f): f is string => Boolean(f));
    history.suspiciousCommits = rankSuspiciousCommits(history.commits, failing);
    history.notes.push(
      "Commits are ranked by overlapping files with current failures. Newest is not assumed guilty.",
    );
    return history;
  }

  codeContext(request: CodeContextRequest): CodeContext {
    const file = request.file;
    if (!file) {
      if (request.symbol) {
        const hits = this.index.get().symbols.filter((s) => s.name === request.symbol);
        const first = hits[0];
        if (first)
          return this.codeContext({ file: first.file, line: first.line, symbol: request.symbol });
      }
      return { availability: "no_data", notes: ["Provide a file, symbol, error, or test."] };
    }
    const text = readTextIfSafe(this.root, file);
    if (text === undefined) {
      return {
        availability: existsSync(path.join(this.root, file)) ? "unavailable" : "no_data",
        file,
        notes: ["File unreadable or treated as secret."],
      };
    }
    const lines = text.split(/\r?\n/);
    const line = request.line ?? 1;
    const start = Math.max(1, line - 20);
    const end = Math.min(lines.length, line + 20);
    const excerpt = lines.slice(start - 1, end).join("\n");
    const symbols = this.index.get().symbols.filter((s) => s.file === file);
    const relatedTests: RelatedTest[] = this.index.relatedTests(file).map((r) => ({
      id: r.file,
      file: r.file,
      name: path.posix.basename(r.file),
      confidence: r.confidence,
      reason: r.reason,
    }));
    const imports = this.index
      .get()
      .imports.filter((i) => i.file === file)
      .map((i) => i.specifier);
    const exports = symbols.filter((s) => s.exported).map((s) => s.name);
    return {
      availability: "available",
      file,
      language: this.index.file(file)?.language,
      excerpt,
      startLine: start,
      endLine: end,
      symbols,
      relatedTests,
      imports,
      exports,
      notes: [],
    };
  }

  dependencyTrace(request: {
    file?: string;
    symbol?: string;
    package?: string;
    direction?: "dependencies" | "dependents" | "both";
  }): DependencyTrace {
    const index = this.index.get();
    const target = request.file ?? request.symbol ?? request.package ?? ".";
    const direction = request.direction ?? "both";
    const dependencies = [];
    const dependents = [];
    if (request.file) {
      for (const imp of index.imports.filter((i) => i.file === request.file)) {
        dependencies.push({
          from: request.file,
          to: imp.specifier,
          kind: imp.kind === "relative" ? ("import" as const) : ("package" as const),
          confidence: "high" as const,
        });
      }
      for (const imp of index.imports) {
        if (imp.kind !== "relative") continue;
        const resolved = toPosix(
          path.posix.normalize(path.posix.join(path.posix.dirname(imp.file), imp.specifier)),
        );
        const withoutExt: string = request.file.replace(/\.(tsx?|jsx?|mts|cts|mjs|cjs)$/i, "");
        if (resolved === withoutExt || resolved === request.file) {
          dependents.push({
            from: imp.file,
            to: request.file,
            kind: "import" as const,
            confidence: "high" as const,
          });
        }
      }
    }
    if (request.package) {
      for (const dep of index.dependencies.filter((d) => d.package === request.package)) {
        dependencies.push({
          from: dep.package,
          to: dep.name,
          kind: "package" as const,
          confidence: "high" as const,
        });
      }
    }
    return {
      target,
      dependencies: direction === "dependents" ? [] : dependencies,
      dependents: direction === "dependencies" ? [] : dependents,
    };
  }

  async changeImpact(files?: string[], options?: { heat?: boolean }): Promise<ChangeImpact> {
    const changes = files?.length
      ? files.map((path) => ({ path }))
      : (await gitChangeSummary(this.root)).files;
    const affectedFiles = changes.map((f) => f.path);
    const index = this.index.get();
    const affectedPackages = index.packages
      .filter((p) => {
        const dir = path.posix.dirname(p.path);
        return affectedFiles.some((f) => dir === "." || f.startsWith(`${dir}/`));
      })
      .map((p) => p.name);
    const relatedTests: RelatedTest[] = [];
    for (const file of affectedFiles) {
      for (const rel of this.index.relatedTests(file)) {
        if (!relatedTests.some((t) => t.file === rel.file)) {
          relatedTests.push({
            id: rel.file,
            file: rel.file,
            name: path.posix.basename(rel.file),
            confidence: rel.confidence,
            reason: rel.reason,
          });
        }
      }
    }
    const publicSurfaceChanges = index.publicExports
      .filter((e) => e.file && affectedFiles.includes(e.file))
      .map((e) => ({
        kind: "export" as const,
        name: `${e.package}:${e.name}`,
        change: "Package export map file changed.",
        breaking: false,
      }));
    const configImpact = affectedFiles.filter(
      (f) => this.index.file(f)?.kind === "config" || this.index.file(f)?.kind === "manifest",
    );
    const documentationImpact = affectedFiles.filter((f) => this.index.file(f)?.kind === "docs");
    const risk = affectedFiles.some((f) => /auth|token|migration|schema/i.test(f))
      ? "high"
      : affectedFiles.length > 20
        ? "moderate"
        : "low";
    return {
      scope: files?.length ? "specified" : "working-tree",
      affectedFiles,
      affectedPackages,
      relatedTests,
      publicSurfaceChanges,
      configImpact,
      documentationImpact,
      risk,
      confidence: relatedTests.some((t) => t.confidence === "high") ? "high" : "moderate",
      notes: affectedFiles.length === 0 ? ["No changes detected."] : [],
      heat: options?.heat ? this.heat() : undefined,
    };
  }

  errorAnalyze(request: ErrorAnalyzeRequest) {
    return analyzeError(request);
  }

  async errorTrace(request: ErrorAnalyzeRequest): Promise<ErrorTrace> {
    const error = analyzeError(request);
    const source = error.file
      ? this.codeContext({ file: relativeMaybe(this.root, error.file), line: error.line })
      : undefined;
    const deps = error.file
      ? this.dependencyTrace({ file: relativeMaybe(this.root, error.file) })
      : { target: "unknown", dependencies: [], dependents: [] };
    const changes = await gitChangeSummary(this.root);
    const previous = this.storage.findFailureByFingerprint(error.fingerprint);
    const relatedTests: RelatedTest[] = error.file
      ? this.index.relatedTests(relativeMaybe(this.root, error.file)).map((r) => ({
          id: r.file,
          file: r.file,
          name: path.posix.basename(r.file),
          confidence: r.confidence,
          reason: r.reason,
        }))
      : [];
    const possibleRegression = Boolean(previous && previous.status === "resolved");
    return {
      error,
      source,
      dependencies: [...deps.dependencies, ...deps.dependents],
      recentChanges: changes.files.filter((f) =>
        error.file ? f.path.includes(path.posix.basename(error.file)) : false,
      ),
      relatedTests,
      previousOccurrences: previous ? [previous] : [],
      possibleRegression,
      notes: possibleRegression
        ? [`Possible regression. Last seen ${previous?.lastSeen ?? "unknown"}.`]
        : [],
    };
  }

  configAudit() {
    return auditConfig(this.root, this.index);
  }

  envUsage() {
    return envUsage(this.root, this.index);
  }

  docsCheck() {
    return docsCheck(this.root, this.index);
  }

  async release() {
    const [git, changes] = await Promise.all([gitIdentity(this.root), gitChangeSummary(this.root)]);
    const pkg = (() => {
      try {
        return JSON.parse(readFileSync(path.join(this.root, "package.json"), "utf8")) as {
          version?: string;
        };
      } catch {
        return undefined;
      }
    })();
    return releaseReadiness({
      git,
      changes,
      lastTest: this.storage.latestTestRun(),
      docs: this.docsCheck(),
      config: this.configAudit(),
      changelogExists: existsSync(path.join(this.root, "CHANGELOG.md")),
      version: pkg?.version,
    });
  }

  doctor() {
    return doctor(this.root);
  }

  doctorBundle() {
    return writeDoctorBundle(this.root, this.doctor());
  }

  adapters() {
    return TEST_ADAPTERS.map((a) => a.detect(this.root));
  }

  async close(): Promise<void> {
    this.token.cancel();
    await this.watch.stop();
    this.storage.close();
    this.bus.removeAll();
  }
}

function relativeMaybe(root: string, file: string): string {
  if (path.isAbsolute(file)) return relativeTo(root, file);
  return toPosix(file);
}

function resolveBundled(subdir: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "..", "..", "..", subdir),
    path.resolve(here, "..", "..", subdir),
    path.resolve(process.cwd(), subdir),
  ];
  return candidates.find((c) => existsSync(c)) ?? candidates[0]!;
}
