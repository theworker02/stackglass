import { existsSync } from "node:fs";
import path from "node:path";
import { runCommand } from "./process.ts";
import type {
  ChangedFile,
  GitChangeSummary,
  GitCommitSummary,
  GitHistoryContext,
  GitIdentity,
  RiskIndicator,
} from "./protocol.ts";
import { toPosix } from "./paths.ts";

export async function detectGitRoot(start: string): Promise<string | undefined> {
  let current = path.resolve(start);
  for (;;) {
    if (existsSync(path.join(current, ".git"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

async function git(root: string, args: string[]): Promise<string> {
  const result = await runCommand("git", ["-c", "core.quotepath=false", ...args], {
    cwd: root,
    timeoutMs: 30_000,
  });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }
  return result.stdout;
}

export async function gitIdentity(root: string): Promise<GitIdentity> {
  const gitRoot = await detectGitRoot(root);
  if (!gitRoot) return { available: false };
  try {
    const [branch, commit, status, remote] = await Promise.all([
      git(gitRoot, ["rev-parse", "--abbrev-ref", "HEAD"]).catch(() => "HEAD"),
      git(gitRoot, ["rev-parse", "HEAD"]).catch(() => ""),
      git(gitRoot, ["status", "--porcelain"]).catch(() => ""),
      git(gitRoot, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]).catch(() => ""),
    ]);
    let ahead = 0;
    let behind = 0;
    try {
      const counts = await git(gitRoot, ["rev-list", "--left-right", "--count", "HEAD...@{u}"]);
      const [a, b] = counts.trim().split(/\s+/);
      ahead = Number(a ?? 0);
      behind = Number(b ?? 0);
    } catch {
      /* no upstream */
    }
    const sha = commit.trim();
    return {
      available: true,
      root: gitRoot,
      branch: branch.trim(),
      commit: sha || undefined,
      commitShort: sha ? sha.slice(0, 7) : undefined,
      dirty: status.trim().length > 0,
      ahead,
      behind,
      remote: remote.trim() || undefined,
    };
  } catch {
    return { available: true, root: gitRoot };
  }
}

export async function gitChangeSummary(root: string): Promise<GitChangeSummary> {
  const gitRoot = await detectGitRoot(root);
  if (!gitRoot) {
    return emptySummary(false);
  }
  try {
    const [diff, untracked] = await Promise.all([
      git(gitRoot, ["diff", "--numstat", "HEAD"]).catch(() => ""),
      git(gitRoot, ["ls-files", "--others", "--exclude-standard"]).catch(() => ""),
    ]);
    const nameStatus = await git(gitRoot, ["diff", "--name-status", "HEAD"]).catch(() => "");
    const files = parseNameStatus(nameStatus, diff);
    for (const file of untracked.split(/\r?\n/).filter(Boolean)) {
      files.push({ path: toPosix(file), status: "untracked" });
    }
    const insertions = files.reduce((n, f) => n + (f.insertions ?? 0), 0);
    const deletions = files.reduce((n, f) => n + (f.deletions ?? 0), 0);
    return {
      available: true,
      files,
      insertions,
      deletions,
      renames: files.filter((f) => f.status === "renamed").length,
      newFiles: files.filter((f) => f.status === "added" || f.status === "untracked").length,
      deletedFiles: files.filter((f) => f.status === "deleted").length,
      riskIndicators: riskFromFiles(files),
      comparedTo: "HEAD",
    };
  } catch {
    return emptySummary(true);
  }
}

export async function gitHistoryContext(
  root: string,
  target: { file?: string; directory?: string; query?: string },
): Promise<GitHistoryContext> {
  const gitRoot = await detectGitRoot(root);
  if (!gitRoot) {
    return {
      available: false,
      target: target.file ?? target.directory ?? ".",
      commits: [],
      notes: ["Not a git repository."],
    };
  }
  const pathspec = target.file ?? target.directory;
  const args = ["log", "-n", "12", "--pretty=format:%H%x09%an%x09%aI%x09%s"];
  if (pathspec) args.push("--", pathspec);
  try {
    const output = await git(gitRoot, args);
    const commits: GitCommitSummary[] = [];
    for (const line of output.split(/\r?\n/).filter(Boolean)) {
      const [sha, author, date, ...rest] = line.split("\t");
      if (!sha) continue;
      let files: string[] = [];
      try {
        const names = await git(gitRoot, ["show", "--name-only", "--pretty=format:", sha]);
        files = names.split(/\r?\n/).map(toPosix).filter(Boolean);
      } catch {
        files = [];
      }
      commits.push({
        sha,
        shortSha: sha.slice(0, 7),
        author: author ?? "unknown",
        date: date ?? "",
        subject: rest.join("\t"),
        files,
      });
    }
    return {
      available: true,
      target: pathspec ?? target.query ?? ".",
      commits,
      notes: commits.length === 0 ? ["No matching history."] : [],
    };
  } catch (error) {
    return {
      available: true,
      target: pathspec ?? ".",
      commits: [],
      notes: [error instanceof Error ? error.message : String(error)],
    };
  }
}

function parseNameStatus(nameStatus: string, numstat: string): ChangedFile[] {
  const stats = new Map<string, { insertions: number; deletions: number }>();
  for (const line of numstat.split(/\r?\n/).filter(Boolean)) {
    const [ins, del, ...rest] = line.split("\t");
    const file = rest.join("\t");
    if (!file) continue;
    stats.set(toPosix(file.split(" => ").pop() ?? file), {
      insertions: ins === "-" ? 0 : Number(ins),
      deletions: del === "-" ? 0 : Number(del),
    });
  }
  const files: ChangedFile[] = [];
  for (const line of nameStatus.split(/\r?\n/).filter(Boolean)) {
    const [code, a, b] = line.split("\t");
    if (!code || !a) continue;
    const statusChar = code[0];
    if (statusChar === "R" && b) {
      files.push({
        path: toPosix(b),
        previousPath: toPosix(a),
        status: "renamed",
        ...stats.get(toPosix(b)),
      });
    } else if (statusChar === "A") {
      files.push({ path: toPosix(a), status: "added", ...stats.get(toPosix(a)) });
    } else if (statusChar === "D") {
      files.push({ path: toPosix(a), status: "deleted", ...stats.get(toPosix(a)) });
    } else {
      files.push({ path: toPosix(a), status: "modified", ...stats.get(toPosix(a)) });
    }
  }
  return files;
}

function riskFromFiles(files: ChangedFile[]): RiskIndicator[] {
  const indicators: RiskIndicator[] = [];
  const lockfiles = files.filter((f) =>
    /package-lock|pnpm-lock|yarn.lock|Cargo.lock|go.sum|poetry.lock/.test(f.path),
  );
  if (lockfiles.length) {
    indicators.push({
      code: "dependency-lockfile",
      severity: "moderate",
      message: "Lockfile changes may alter installed dependency versions.",
      files: lockfiles.map((f) => f.path),
    });
  }
  const auth = files.filter((f) => /auth|token|session|password|secret|permission/i.test(f.path));
  if (auth.length) {
    indicators.push({
      code: "auth-surface",
      severity: "high",
      message: "Authentication or session-related files changed.",
      files: auth.map((f) => f.path),
    });
  }
  const config = files.filter(
    (f) => /\.(ya?ml|toml|ini|env|json)$/i.test(f.path) && /config|ci|\.github/i.test(f.path),
  );
  if (config.length) {
    indicators.push({
      code: "config-change",
      severity: "moderate",
      message: "Configuration or CI files changed.",
      files: config.map((f) => f.path),
    });
  }
  const migrations = files.filter((f) => /migration|schema\.prisma|alembic/i.test(f.path));
  if (migrations.length) {
    indicators.push({
      code: "schema-change",
      severity: "high",
      message: "Database schema or migration files changed.",
      files: migrations.map((f) => f.path),
    });
  }
  return indicators;
}

function emptySummary(available: boolean): GitChangeSummary {
  return {
    available,
    files: [],
    insertions: 0,
    deletions: 0,
    renames: 0,
    newFiles: 0,
    deletedFiles: 0,
    riskIndicators: [],
    comparedTo: "HEAD",
  };
}
