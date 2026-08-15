import type {
  AttentionItem,
  FailureCluster,
  FailureSummary,
  FileHeatEntry,
  GitCommitSummary,
  ProjectNarrative,
  ProjectSnapshot,
  SessionReplay,
  SnapshotDiff,
  SnapshotRecord,
  SuspiciousCommit,
  TimelineEvent,
} from "./protocol.ts";

export function narrate(snapshot: ProjectSnapshot, timeline: TimelineEvent[]): ProjectNarrative {
  const paragraphs: string[] = [];
  const evidence: string[] = [];
  const unanswered: string[] = [];
  const branch = snapshot.repository.branch ?? "unknown branch";
  const changed = snapshot.changedFiles.length;
  const headline = `${branch}: ${changed} working-tree change(s), tests ${fmtTests(snapshot)}, build ${snapshot.buildStatus.status}.`;

  if (snapshot.repository.available) {
    paragraphs.push(
      `Git is on ${branch}${snapshot.repository.commitShort ? ` @ ${snapshot.repository.commitShort}` : ""}${snapshot.repository.dirty ? " with a dirty working tree" : " (clean)"}.`,
    );
    evidence.push("git identity");
  } else {
    unanswered.push("Not a git repository — change history is unavailable.");
  }

  if (snapshot.testStatus.availability === "available") {
    paragraphs.push(
      `Last GlassLab run: ${snapshot.testStatus.passed ?? 0} passed, ${snapshot.testStatus.failed ?? 0} failed, ${snapshot.testStatus.skipped ?? 0} skipped.`,
    );
    evidence.push("stored test run");
  } else {
    unanswered.push("Tests have not been run through Stackglass in this workspace.");
  }

  if (snapshot.buildStatus.availability === "no_data") {
    unanswered.push("No Stackglass-managed build or typecheck result is stored.");
  }

  const fails = timeline.filter((e) => e.type.endsWith(".failed") || e.type.endsWith(".crashed"));
  if (fails.length) {
    paragraphs.push(
      `Timeline shows ${fails.length} failure-class event(s); most recent is ${fails[0]?.type} at ${fails[0]?.timestamp.slice(11, 19)}.`,
    );
    evidence.push("timeline");
  }

  if (snapshot.attention.length) {
    paragraphs.push(`Attention: ${snapshot.attention.map((a) => a.message).join(" ")}`);
  }

  if (snapshot.coverage.availability !== "available") {
    unanswered.push("Coverage is unavailable because no provider artifact was found.");
  }

  return { headline, paragraphs, evidence, unanswered };
}

export function replaySession(events: TimelineEvent[]): SessionReplay {
  const ordered = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const files = [...new Set(ordered.flatMap((e) => e.relatedFiles))];
  const testsObserved = ordered.filter((e) => e.type.startsWith("test.")).length;
  const failuresObserved = ordered.filter(
    (e) => e.type.endsWith(".failed") || e.type.endsWith(".crashed"),
  ).length;
  const beats = ordered.slice(-40).map((e) => ({
    at: e.timestamp.slice(11, 19),
    type: e.type,
    detail: e.relatedFiles[0] ?? e.result ?? "",
  }));
  const summary =
    ordered.length === 0
      ? "No recorded session events."
      : `Touched ${files.length} file(s), observed ${testsObserved} test event(s), ${failuresObserved} failure-class event(s).`;
  return {
    startedAt: ordered[0]?.timestamp,
    endedAt: ordered.at(-1)?.timestamp,
    eventCount: ordered.length,
    filesTouched: files.slice(0, 50),
    testsObserved,
    failuresObserved,
    summary,
    beats,
  };
}

export function clusterFailures(failures: FailureSummary[]): FailureCluster[] {
  const groups = new Map<string, FailureSummary[]>();
  for (const failure of failures) {
    const key = failure.file ?? failure.fingerprint.slice(0, 8);
    const list = groups.get(key) ?? [];
    list.push(failure);
    groups.set(key, list);
  }
  return [...groups.entries()].map(([key, items]) => {
    const files = [...new Set(items.map((f) => f.file).filter((f): f is string => Boolean(f)))];
    return {
      id: key,
      label: files[0] ? `Failures in ${files[0]}` : `Fingerprint cluster ${key}`,
      count: items.length,
      failures: items,
      sharedFiles: files,
    };
  });
}

export function fileHeat(events: TimelineEvent[], failures: FailureSummary[]): FileHeatEntry[] {
  const map = new Map<string, FileHeatEntry>();
  const bump = (file: string, field: "events" | "failures" | "changes") => {
    const cur = map.get(file) ?? { file, events: 0, failures: 0, changes: 0, score: 0 };
    cur[field] += 1;
    map.set(file, cur);
  };
  for (const event of events) {
    for (const file of event.relatedFiles) {
      bump(file, "events");
      if (event.type === "file.changed" || event.type === "file.created") bump(file, "changes");
      if (event.type.endsWith(".failed")) bump(file, "failures");
    }
  }
  for (const failure of failures) {
    if (failure.file) bump(failure.file, "failures");
  }
  return [...map.values()]
    .map((entry) => ({
      ...entry,
      score: entry.failures * 5 + entry.changes * 2 + entry.events,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);
}

export function diffSnapshots(before?: SnapshotRecord, after?: SnapshotRecord): SnapshotDiff {
  if (!before || !after) {
    return {
      availability: "no_data",
      notes: ["Need two stored snapshots to compare."],
      filesAdded: [],
      filesRemoved: [],
    };
  }
  const beforeSet = new Set(before.changedFiles);
  const afterSet = new Set(after.changedFiles);
  const filesAdded = after.changedFiles.filter((f) => !beforeSet.has(f));
  const filesRemoved = before.changedFiles.filter((f) => !afterSet.has(f));
  const testDelta =
    before.testStatus.availability === "available" && after.testStatus.availability === "available"
      ? {
          passed: (after.testStatus.passed ?? 0) - (before.testStatus.passed ?? 0),
          failed: (after.testStatus.failed ?? 0) - (before.testStatus.failed ?? 0),
        }
      : undefined;
  const coverageDelta =
    before.coverageSummary?.lines !== undefined && after.coverageSummary?.lines !== undefined
      ? after.coverageSummary.lines - before.coverageSummary.lines
      : undefined;
  return {
    availability: "available",
    beforeId: before.id,
    afterId: after.id,
    filesAdded,
    filesRemoved,
    testDelta,
    coverageDelta,
    notes: [],
  };
}

export function rankSuspiciousCommits(
  commits: GitCommitSummary[],
  failingFiles: string[],
): SuspiciousCommit[] {
  const names = failingFiles.map((f) => f.split("/").pop() ?? f);
  return commits
    .map((commit) => {
      const overlappingFiles = commit.files.filter(
        (file) =>
          failingFiles.some((f) => file.endsWith(f) || f.endsWith(file)) ||
          names.some((n) => file.endsWith(n)),
      );
      const score = overlappingFiles.length * 3 + (commit.files.length > 20 ? 1 : 0);
      return {
        sha: commit.sha,
        shortSha: commit.shortSha,
        subject: commit.subject,
        score,
        overlappingFiles,
        reason:
          overlappingFiles.length > 0
            ? `Touches ${overlappingFiles.length} file(s) related to the current failure.`
            : "No overlapping files with the current failure set.",
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function composeAttention(input: {
  snapshot: ProjectSnapshot;
  flakes: number;
  docsMismatches: number;
  configWarnings: number;
  clusters: number;
}): AttentionItem[] {
  const items = [...input.snapshot.attention];
  if (input.flakes) {
    items.push({
      severity: "warning",
      code: "possible-flakes",
      message: `${input.flakes} possible flaky test(s). Never labeled from a single failure.`,
    });
  }
  if (input.docsMismatches) {
    items.push({
      severity: "warning",
      code: "stale-docs",
      message: `${input.docsMismatches} documentation mismatch(es).`,
    });
  }
  if (input.configWarnings) {
    items.push({
      severity: "warning",
      code: "config-drift",
      message: `${input.configWarnings} configuration warning(s).`,
    });
  }
  if (input.clusters > 1) {
    items.push({
      severity: "info",
      code: "failure-clusters",
      message: `${input.clusters} failure cluster(s) — inspect shared files before fixing one-by-one.`,
    });
  }
  return items;
}

function fmtTests(snapshot: ProjectSnapshot): string {
  if (snapshot.testStatus.availability !== "available") return snapshot.testStatus.availability;
  return `${snapshot.testStatus.passed ?? 0}/${snapshot.testStatus.total ?? 0}`;
}
