import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { StackglassConfig } from "./config.ts";
import type { TimelineEvent, TestRunResult, FailureSummary, SnapshotRecord } from "./protocol.ts";
import { stackglassDir } from "./paths.ts";
import { sanitizeMetadata } from "./security.ts";

export class GlassStorage {
  readonly db: DatabaseSync;

  constructor(root: string) {
    const dir = stackglassDir(root);
    mkdirSync(dir, { recursive: true });
    this.db = new DatabaseSync(path.join(dir, "stackglass.db"));
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        type TEXT NOT NULL,
        origin TEXT NOT NULL,
        related_files TEXT NOT NULL DEFAULT '[]',
        related_process TEXT,
        result TEXT,
        duration_ms INTEGER,
        metadata TEXT NOT NULL DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_events_ts ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

      CREATE TABLE IF NOT EXISTS test_runs (
        id TEXT PRIMARY KEY,
        started_at TEXT NOT NULL,
        finished_at TEXT NOT NULL,
        mode TEXT NOT NULL,
        status TEXT NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_test_runs_started ON test_runs(started_at);

      CREATE TABLE IF NOT EXISTS test_cases (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        file TEXT NOT NULL,
        framework TEXT NOT NULL,
        last_status TEXT,
        last_run_at TEXT,
        last_pass_commit TEXT,
        payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_test_cases_file ON test_cases(file);

      CREATE TABLE IF NOT EXISTS failures (
        id TEXT PRIMARY KEY,
        fingerprint TEXT NOT NULL,
        kind TEXT NOT NULL,
        message TEXT NOT NULL,
        file TEXT,
        line INTEGER,
        test_id TEXT,
        first_seen TEXT NOT NULL,
        last_seen TEXT NOT NULL,
        resolved_at TEXT,
        payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_failures_fp ON failures(fingerprint);

      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        payload TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS coverage (
        id TEXT PRIMARY KEY,
        at TEXT NOT NULL,
        scope TEXT NOT NULL,
        payload TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS commands (
        id TEXT PRIMARY KEY,
        at TEXT NOT NULL,
        command TEXT NOT NULL,
        exit_code INTEGER,
        duration_ms INTEGER,
        payload TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS relationships (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        target TEXT NOT NULL,
        kind TEXT NOT NULL,
        confidence TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_rel_source ON relationships(source);

      CREATE TABLE IF NOT EXISTS contracts (
        id TEXT PRIMARY KEY,
        at TEXT NOT NULL,
        kind TEXT NOT NULL,
        name TEXT NOT NULL,
        payload TEXT NOT NULL
      );
    `);
  }

  insertEvent(event: TimelineEvent): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO events
        (id, timestamp, type, origin, related_files, related_process, result, duration_ms, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      event.id,
      event.timestamp,
      event.type,
      event.origin,
      JSON.stringify(event.relatedFiles),
      event.relatedProcess ?? null,
      event.result ?? null,
      event.durationMs ?? null,
      JSON.stringify(sanitizeMetadata(event.metadata)),
    );
  }

  queryEvents(opts: {
    since?: string;
    until?: string;
    limit?: number;
    types?: string[];
    file?: string;
  }): TimelineEvent[] {
    const clauses: string[] = [];
    const params: Array<string | number> = [];
    if (opts.since) {
      clauses.push("timestamp >= ?");
      params.push(opts.since);
    }
    if (opts.until) {
      clauses.push("timestamp <= ?");
      params.push(opts.until);
    }
    if (opts.types && opts.types.length > 0) {
      clauses.push(`type IN (${opts.types.map(() => "?").join(",")})`);
      params.push(...opts.types);
    }
    if (opts.file) {
      clauses.push("related_files LIKE ?");
      params.push(`%${opts.file.replaceAll("\\", "/").replaceAll("%", "")}%`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const limit = Math.min(opts.limit ?? 100, 1000);
    const rows = this.db
      .prepare(`SELECT * FROM events ${where} ORDER BY timestamp DESC LIMIT ?`)
      .all(...params, limit) as Array<Record<string, unknown>>;
    return rows.map(rowToEvent);
  }

  saveTestRun(run: TestRunResult): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO test_runs (id, started_at, finished_at, mode, status, payload)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(run.id, run.startedAt, run.finishedAt, run.mode, run.status, JSON.stringify(run));
    for (const testCase of run.cases) {
      this.db
        .prepare(
          `INSERT OR REPLACE INTO test_cases (id, name, file, framework, last_status, last_run_at, last_pass_commit, payload)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          testCase.id,
          testCase.name,
          testCase.file,
          testCase.framework,
          testCase.status ?? null,
          run.finishedAt,
          testCase.status === "pass"
            ? ((run as TestRunResult & { commit?: string }).commit ?? null)
            : null,
          JSON.stringify(testCase),
        );
    }
  }

  latestTestRun(): TestRunResult | undefined {
    const row = this.db
      .prepare(`SELECT payload FROM test_runs ORDER BY started_at DESC LIMIT 1`)
      .get() as { payload: string } | undefined;
    return row ? (JSON.parse(row.payload) as TestRunResult) : undefined;
  }

  testHistory(testId: string, limit = 20): TestRunResult[] {
    const rows = this.db
      .prepare(`SELECT payload FROM test_runs ORDER BY started_at DESC LIMIT 200`)
      .all() as Array<{ payload: string }>;
    return rows
      .map((r) => JSON.parse(r.payload) as TestRunResult)
      .filter((run) => run.cases.some((c) => c.id === testId))
      .slice(0, limit);
  }

  upsertFailure(failure: FailureSummary): void {
    const existing = this.db
      .prepare(`SELECT * FROM failures WHERE fingerprint = ?`)
      .get(failure.fingerprint) as
      | {
          resolved_at: string | null;
          first_seen: string;
          last_seen: string;
        }
      | undefined;
    if (existing) {
      failure.status = existing.resolved_at ? "regression" : "recurring";
      this.db
        .prepare(
          `UPDATE failures SET last_seen = ?, message = ?, file = ?, line = ?, test_id = ?, resolved_at = NULL, payload = ? WHERE fingerprint = ?`,
        )
        .run(
          failure.lastSeen ?? new Date().toISOString(),
          failure.message,
          failure.file ?? null,
          failure.line ?? null,
          failure.testId ?? null,
          JSON.stringify(failure),
          failure.fingerprint,
        );
      return;
    }
    failure.status = "new";
    this.db
      .prepare(
        `INSERT INTO failures (id, fingerprint, kind, message, file, line, test_id, first_seen, last_seen, payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        failure.id,
        failure.fingerprint,
        failure.kind,
        failure.message,
        failure.file ?? null,
        failure.line ?? null,
        failure.testId ?? null,
        failure.firstSeen ?? new Date().toISOString(),
        failure.lastSeen ?? new Date().toISOString(),
        JSON.stringify(failure),
      );
  }

  listFailures(status?: string): FailureSummary[] {
    const rows = this.db
      .prepare(
        `SELECT payload, first_seen, last_seen, resolved_at, test_id FROM failures ORDER BY last_seen DESC`,
      )
      .all() as Array<{
      payload: string;
      first_seen: string;
      last_seen: string;
      resolved_at: string | null;
      test_id: string | null;
    }>;
    const classified = rows.map((row) => {
      const parsed = JSON.parse(row.payload) as FailureSummary;
      parsed.firstSeen = row.first_seen;
      parsed.lastSeen = row.last_seen;
      parsed.status = classifyFailure(row, parsed, this.flakeHint(row.test_id));
      return parsed;
    });
    return status ? classified.filter((f) => f.status === status) : classified;
  }

  findFailureByFingerprint(fingerprint: string): FailureSummary | undefined {
    const row = this.db
      .prepare(
        `SELECT payload, first_seen, last_seen, resolved_at FROM failures WHERE fingerprint = ?`,
      )
      .get(fingerprint) as
      | { payload: string; first_seen: string; last_seen: string; resolved_at: string | null }
      | undefined;
    if (!row) return undefined;
    const parsed = JSON.parse(row.payload) as FailureSummary;
    parsed.firstSeen = row.first_seen;
    parsed.lastSeen = row.last_seen;
    return parsed;
  }

  saveSnapshot(record: SnapshotRecord): void {
    this.db
      .prepare(`INSERT OR REPLACE INTO snapshots (id, created_at, payload) VALUES (?, ?, ?)`)
      .run(record.id, record.createdAt, JSON.stringify(record));
  }

  latestSnapshot(): SnapshotRecord | undefined {
    return this.listSnapshots(1)[0];
  }

  listSnapshots(limit = 20): SnapshotRecord[] {
    const rows = this.db
      .prepare(`SELECT payload FROM snapshots ORDER BY created_at DESC LIMIT ?`)
      .all(limit) as Array<{ payload: string }>;
    return rows.map((row) => JSON.parse(row.payload) as SnapshotRecord);
  }

  snapshotById(id: string): SnapshotRecord | undefined {
    const row = this.db.prepare(`SELECT payload FROM snapshots WHERE id = ?`).get(id) as
      { payload: string } | undefined;
    return row ? (JSON.parse(row.payload) as SnapshotRecord) : undefined;
  }

  private flakeHint(testId: string | null): boolean {
    if (!testId) return false;
    const rows = this.db
      .prepare(`SELECT payload FROM test_runs ORDER BY started_at DESC LIMIT 12`)
      .all() as Array<{ payload: string }>;
    const statuses = new Set<string>();
    for (const row of rows) {
      const run = JSON.parse(row.payload) as TestRunResult;
      const match = run.cases.find((c) => c.id === testId);
      if (match?.status) statuses.add(match.status);
    }
    return statuses.has("pass") && statuses.has("fail");
  }

  saveCoverage(id: string, at: string, scope: string, payload: unknown): void {
    this.db
      .prepare(`INSERT OR REPLACE INTO coverage (id, at, scope, payload) VALUES (?, ?, ?, ?)`)
      .run(id, at, scope, JSON.stringify(payload));
  }

  latestCoverage(scope = "workspace"): unknown | undefined {
    const row = this.db
      .prepare(`SELECT payload FROM coverage WHERE scope = ? ORDER BY at DESC LIMIT 1`)
      .get(scope) as { payload: string } | undefined;
    return row ? JSON.parse(row.payload) : undefined;
  }

  recordCommand(
    id: string,
    command: string,
    exitCode: number | null,
    durationMs: number,
    payload: unknown,
  ): void {
    this.db
      .prepare(
        `INSERT INTO commands (id, at, command, exit_code, duration_ms, payload) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, new Date().toISOString(), command, exitCode, durationMs, JSON.stringify(payload));
  }

  applyRetention(config: StackglassConfig): void {
    const cutoff = new Date(
      Date.now() - config.history.retentionDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    this.db.prepare(`DELETE FROM events WHERE timestamp < ?`).run(cutoff);
    const count = (this.db.prepare(`SELECT COUNT(*) AS n FROM events`).get() as { n: number }).n;
    if (count > config.history.maxEvents) {
      const extra = count - config.history.maxEvents;
      this.db
        .prepare(
          `DELETE FROM events WHERE id IN (SELECT id FROM events ORDER BY timestamp ASC LIMIT ?)`,
        )
        .run(extra);
    }
  }

  close(): void {
    this.db.close();
  }

  resolveFailure(fingerprint: string): void {
    this.db
      .prepare(`UPDATE failures SET resolved_at = ? WHERE fingerprint = ?`)
      .run(new Date().toISOString(), fingerprint);
  }
}

function rowToEvent(row: Record<string, unknown>): TimelineEvent {
  return {
    id: String(row.id),
    timestamp: String(row.timestamp),
    type: String(row.type) as TimelineEvent["type"],
    origin: String(row.origin),
    relatedFiles: JSON.parse(String(row.related_files ?? "[]")) as string[],
    relatedProcess: row.related_process ? String(row.related_process) : undefined,
    result: row.result ? String(row.result) : undefined,
    durationMs: typeof row.duration_ms === "number" ? row.duration_ms : undefined,
    metadata: JSON.parse(String(row.metadata ?? "{}")) as Record<string, unknown>,
  };
}

function classifyFailure(
  row: { first_seen: string; last_seen: string; resolved_at: string | null },
  payload: FailureSummary,
  flake: boolean,
): FailureSummary["status"] {
  if (row.resolved_at) return "resolved";
  if (flake) return "flake";
  if (payload.status === "regression") return "regression";
  if (row.first_seen === row.last_seen) return "new";
  if (payload.status === "recurring") return "recurring";
  return row.first_seen === row.last_seen ? "new" : "recurring";
}
