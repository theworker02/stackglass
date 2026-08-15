import { describe, expect, it } from "vitest";
import {
  clusterFailures,
  composeAttention,
  diffSnapshots,
  fileHeat,
  narrate,
  rankSuspiciousCommits,
  replaySession,
} from "./lens.ts";
import type { FailureSummary, ProjectSnapshot, TimelineEvent } from "./protocol.ts";

function event(partial: Partial<TimelineEvent> & { type: TimelineEvent["type"] }): TimelineEvent {
  return {
    id: partial.id ?? "e",
    timestamp: partial.timestamp ?? "2026-08-14T14:21:03.000Z",
    origin: "test",
    relatedFiles: partial.relatedFiles ?? [],
    ...partial,
  };
}

describe("GlassLens", () => {
  it("narrates a dirty tree with unanswered tests", () => {
    const snapshot = {
      generatedAt: "2026-08-14T14:21:03.000Z",
      workspaceRoot: "/tmp/p",
      repository: { available: true, branch: "feature/auth", commitShort: "abc1234", dirty: true },
      changedFiles: [{ path: "src/auth/token.ts", status: "modified" }],
      languages: [],
      packages: [],
      testStatus: { availability: "no_data" },
      buildStatus: { availability: "no_data", status: "not_run" },
      runtimeStatus: { processes: [] },
      coverage: { availability: "no_data" },
      contracts: { availability: "no_data" },
      recentFailures: [],
      attention: [{ severity: "info", code: "dirty-tree", message: "1 changed file(s)." }],
    } as unknown as ProjectSnapshot;
    const narrative = narrate(snapshot, []);
    expect(narrative.headline).toContain("feature/auth");
    expect(narrative.unanswered.some((u) => /tests/i.test(u))).toBe(true);
    expect(narrative.evidence).toContain("git identity");
  });

  it("replays a session from timeline beats", () => {
    const replay = replaySession([
      event({
        type: "file.changed",
        relatedFiles: ["src/a.ts"],
        timestamp: "2026-08-14T14:00:00.000Z",
      }),
      event({
        type: "test.failed",
        relatedFiles: ["src/a.test.ts"],
        timestamp: "2026-08-14T14:01:00.000Z",
      }),
    ]);
    expect(replay.eventCount).toBe(2);
    expect(replay.failuresObserved).toBe(1);
    expect(replay.filesTouched).toContain("src/a.ts");
    expect(replay.beats).toHaveLength(2);
  });

  it("clusters failures by file", () => {
    const failures: FailureSummary[] = [
      {
        id: "1",
        fingerprint: "aaaa1111",
        kind: "test",
        message: "boom",
        file: "src/a.test.ts",
        status: "new",
      },
      {
        id: "2",
        fingerprint: "bbbb2222",
        kind: "test",
        message: "boom2",
        file: "src/a.test.ts",
        status: "new",
      },
    ];
    const clusters = clusterFailures(failures);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.count).toBe(2);
  });

  it("ranks file heat by failures over changes", () => {
    const heat = fileHeat(
      [
        event({ type: "file.changed", relatedFiles: ["src/hot.ts"] }),
        event({ type: "test.failed", relatedFiles: ["src/hot.ts"] }),
      ],
      [
        {
          id: "1",
          fingerprint: "x",
          kind: "test",
          message: "fail",
          file: "src/hot.ts",
          status: "new",
        },
      ],
    );
    expect(heat[0]?.file).toBe("src/hot.ts");
    expect(heat[0]!.score).toBeGreaterThan(5);
  });

  it("diffs snapshots without inventing coverage", () => {
    const diff = diffSnapshots(undefined, undefined);
    expect(diff.availability).toBe("no_data");
    expect(diff.notes.length).toBeGreaterThan(0);
  });

  it("does not assume the newest commit is guilty", () => {
    const ranked = rankSuspiciousCommits(
      [
        {
          sha: "111",
          shortSha: "111",
          author: "a",
          date: "2026-08-14",
          subject: "newest but unrelated",
          files: ["README.md"],
        },
        {
          sha: "222",
          shortSha: "222",
          author: "b",
          date: "2026-08-13",
          subject: "touch token",
          files: ["src/auth/token.ts"],
        },
      ],
      ["src/auth/token.ts"],
    );
    expect(ranked[0]?.sha).toBe("222");
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
  });

  it("composes attention from flakes and docs", () => {
    const items = composeAttention({
      snapshot: {
        attention: [],
      } as unknown as ProjectSnapshot,
      flakes: 2,
      docsMismatches: 1,
      configWarnings: 1,
      clusters: 3,
    });
    expect(items.map((i) => i.code)).toEqual(
      expect.arrayContaining(["possible-flakes", "stale-docs", "config-drift", "failure-clusters"]),
    );
  });
});
