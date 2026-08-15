import { createHash, randomUUID } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { AttentionItem, ProjectSnapshot, SnapshotRecord } from "./protocol.ts";
import type { GlassIndex } from "./index-engine.ts";
import type { GlassStorage } from "./storage.ts";
import type { RuntimeManager } from "./runtime.ts";
import { gitIdentity, gitChangeSummary } from "./git.ts";
import { stackglassDir } from "./paths.ts";

export async function createSnapshot(input: {
  root: string;
  index: GlassIndex;
  storage: GlassStorage;
  runtime: RuntimeManager;
}): Promise<{ snapshot: ProjectSnapshot; record: SnapshotRecord }> {
  const [git, changes] = await Promise.all([gitIdentity(input.root), gitChangeSummary(input.root)]);
  const index = input.index.get();
  const lastTest = input.storage.latestTestRun();
  const coverage = input.storage.latestCoverage("workspace") as
    { availability?: string; lines?: { pct?: number } } | undefined;
  const failures = input.storage.listFailures();
  const attention: AttentionItem[] = [];
  if (lastTest && lastTest.summary.failed > 0) {
    attention.push({
      severity: "error",
      code: "failing-tests",
      message: `${lastTest.summary.failed} failing test(s).`,
    });
  }
  if (git.dirty) {
    attention.push({
      severity: "info",
      code: "dirty-tree",
      message: `${changes.files.length} changed file(s) in the working tree.`,
    });
  }

  const snapshot: ProjectSnapshot = {
    generatedAt: new Date().toISOString(),
    workspaceRoot: input.root,
    repository: git,
    changedFiles: changes.files,
    languages: index.languages,
    packages: index.packages,
    testStatus: lastTest
      ? {
          availability: "available",
          total: lastTest.summary.total,
          passed: lastTest.summary.passed,
          failed: lastTest.summary.failed,
          skipped: lastTest.summary.skipped,
          lastRunAt: lastTest.finishedAt,
        }
      : { availability: "no_data" },
    buildStatus: inferBuildStatus(input.storage),
    runtimeStatus: { processes: input.runtime.list() },
    coverage: coverage
      ? {
          availability:
            (coverage.availability as ProjectSnapshot["coverage"]["availability"]) ?? "available",
          lines: coverage.lines?.pct,
        }
      : { availability: "no_data" },
    contracts: { availability: "no_data" },
    recentFailures: failures.slice(0, 20),
    attention,
  };

  const record: SnapshotRecord = {
    id: randomUUID(),
    createdAt: snapshot.generatedAt,
    branch: git.branch,
    commit: git.commit,
    changedFiles: changes.files.map((f) => f.path),
    dependencyFingerprint: fingerprintJson(index.dependencies),
    testStatus: snapshot.testStatus,
    buildStatus: snapshot.buildStatus,
    coverageSummary: {
      lines: snapshot.coverage.lines,
      availability: snapshot.coverage.availability,
    },
    runtimeProcessCount: snapshot.runtimeStatus.processes.length,
    configFingerprint: fingerprintJson(index.configuration),
    documentationFingerprint: fingerprintJson(index.documentation),
  };
  input.storage.saveSnapshot(record);
  const file = path.join(stackglassDir(input.root), "snapshots", `${record.id}.json`);
  writeFileSync(file, `${JSON.stringify({ snapshot, record }, null, 2)}\n`, "utf8");
  return { snapshot, record };
}

function inferBuildStatus(storage: GlassStorage): ProjectSnapshot["buildStatus"] {
  const events = storage.queryEvents({
    types: ["build.passed", "build.failed", "typecheck.passed", "typecheck.failed"],
    limit: 30,
  });
  const latest = events[0];
  if (!latest) return { availability: "no_data", status: "not_run" };
  const failed = latest.type.endsWith(".failed");
  return {
    availability: "available",
    status: failed ? "fail" : "pass",
  };
}

function fingerprintJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

export function writeProjectManifest(
  root: string,
  data: {
    initializedAt: string;
    languages: string[];
    frameworks: string[];
    packageManager?: string;
  },
): void {
  writeFileSync(
    path.join(stackglassDir(root), "project.json"),
    `${JSON.stringify({ version: 1, ...data }, null, 2)}\n`,
    "utf8",
  );
}

export function hasProjectManifest(root: string): boolean {
  return existsSync(path.join(stackglassDir(root), "project.json"));
}
