import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { Stackglass, STACKGLASS_VERSION, type TestRunMode } from "@stackglass/core";
import { startStdio } from "@stackglass/mcp";
import { parseArgs, flag } from "./parse.ts";
import { serveDashboard } from "./serve.ts";

export interface CliIo {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

const HELP = `STACKGLASS  ${STACKGLASS_VERSION}
See what your project is actually doing.

Usage:
  glass <command> [options]

Commands:
  init                 Initialize .stackglass/ in this workspace
  status               Show current project state
  why                  Narrative of current state from evidence
  session              Replay recent timeline as a session
  heat                 Rank files by events, changes, and failures
  clusters             Group stored failures by shared files
  compare              Diff the two most recent snapshots
  attention            Show attention items (tests, docs, config, flakes)
  doctor [bundle]      Run diagnostics; bundle writes a sanitized archive
  snapshot             Write a project snapshot
  timeline             Show recent development events
  watch                Start smart watch mode
  test [mode]          Run tests (related|changed|failed|workspace)
  test history         Show last stored test run
  test flakes          Show flake candidates
  test repeat [n]      Repeat a run to probe flakes (never a single-run label)
  test mutation <file> Mutation-test a file in an isolated workspace
  test coverage        Show coverage if available
  test contracts       Verify observable contracts
  error [text]         Analyze an error from stdin or argument
  runtime              List Stackglass-managed processes
  changes              Git change summary
  config               Configuration audit
  env                  Environment variable usage (names only)
  docs                 Documentation checker
  release              Release readiness (never publishes)
  mcp                  Start the MCP server on stdio
  adapters             List detected test adapters
  logs                 Show Stackglass log file path
  cache                Manage local cache (clear)
  dashboard            Serve the local dashboard on 127.0.0.1
  help                 Show this help
`;

export async function runCli(
  argv: string[],
  cwd = process.cwd(),
  io: CliIo = defaultIo(),
): Promise<number> {
  const parsed = parseArgs(argv);
  const cmd = parsed.rest[0] ?? "help";
  const sub = parsed.rest[1];
  const writeOut = (text: string) => io.stdout(text.endsWith("\n") ? text : `${text}\n`);
  const writeErr = (text: string) => io.stderr(text.endsWith("\n") ? text : `${text}\n`);

  if (cmd === "help" || parsed.flags.help || parsed.flags.h) {
    writeOut(HELP);
    return 0;
  }
  if (cmd === "mcp") {
    await startStdio(cwd);
    return 0;
  }

  const glass = await Stackglass.open(cwd, { watch: cmd === "watch" });
  try {
    switch (cmd) {
      case "init": {
        const result = await glass.init();
        writeOut(result.summary.join("\n"));
        return 0;
      }
      case "status": {
        const snap = await glass.snapshot();
        writeOut(formatStatus(snap));
        return 0;
      }
      case "why": {
        const narrative = await glass.why();
        writeOut(narrative.headline);
        for (const paragraph of narrative.paragraphs) writeOut(paragraph);
        if (narrative.unanswered.length) {
          writeOut("Unanswered:");
          for (const item of narrative.unanswered) writeOut(`- ${item}`);
        }
        return 0;
      }
      case "session": {
        const session = glass.session();
        writeOut(session.summary);
        for (const beat of session.beats) {
          writeOut(`${beat.at}  ${pad(beat.type, 22)} ${beat.detail}`);
        }
        return 0;
      }
      case "heat": {
        const heat = glass.heat();
        if (heat.length === 0) {
          writeOut("No heat yet.");
          return 0;
        }
        for (const entry of heat) {
          writeOut(
            `${pad(String(entry.score), 4)}  ${entry.file}  events=${entry.events} changes=${entry.changes} failures=${entry.failures}`,
          );
        }
        return 0;
      }
      case "clusters": {
        const clusters = glass.clusters();
        if (clusters.length === 0) {
          writeOut("No failure clusters.");
          return 0;
        }
        for (const cluster of clusters) {
          writeOut(`${cluster.count}  ${cluster.label}`);
        }
        return 0;
      }
      case "compare": {
        writeOut(JSON.stringify(glass.compareSnapshots(), null, 2));
        return 0;
      }
      case "attention": {
        const items = await glass.attention();
        if (items.length === 0) {
          writeOut("Nothing in attention.");
          return 0;
        }
        for (const item of items) {
          writeOut(`${pad(item.severity.toUpperCase(), 8)} ${item.message}`);
        }
        return 0;
      }
      case "doctor": {
        if (sub === "bundle") {
          const dest = glass.doctorBundle();
          writeOut(`Wrote sanitized diagnostic bundle to ${dest}`);
          return 0;
        }
        const report = glass.doctor();
        for (const check of report.checks) {
          writeOut(
            `${pad(check.status.toUpperCase(), 8)} ${check.label}${check.detail ? " — " + check.detail : ""}`,
          );
        }
        return report.ok ? 0 : 1;
      }
      case "snapshot": {
        const snap = await glass.snapshot();
        writeOut(
          `Snapshot ${snap.generatedAt}\nBranch ${snap.repository.branch ?? "n/a"}\nChanged ${snap.changedFiles.length}`,
        );
        return 0;
      }
      case "timeline": {
        const events = glass.timeline({
          limit: Number(flag(parsed.flags, "limit") ?? 30),
          file: flag(parsed.flags, "file"),
        });
        for (const event of events) {
          const time = event.timestamp.slice(11, 19);
          writeOut(
            `${time}  ${pad(event.type, 22)} ${(event.relatedFiles[0] ?? event.result ?? "").toString()}`,
          );
        }
        if (events.length === 0) writeOut("No data.");
        return 0;
      }
      case "watch": {
        writeOut("Watching for classified changes. Ctrl+C to stop.");
        await new Promise<void>((resolve) => {
          process.on("SIGINT", () => resolve());
        });
        return 0;
      }
      case "test": {
        if (sub === "history") {
          const last = glass.storage.latestTestRun();
          writeOut(last ? JSON.stringify(last.summary, null, 2) : "No data.");
          return last?.status === "fail" ? 1 : 0;
        }
        if (sub === "flakes") {
          writeOut(JSON.stringify(glass.lab.flakes(), null, 2));
          return 0;
        }
        if (sub === "repeat") {
          const n = Number(parsed.rest[2] ?? 3);
          const target = parsed.rest[3];
          const result = await glass.lab.repeat({
            mode: target ? "single" : "workspace",
            target,
            repeat: Number.isFinite(n) ? n : 3,
          });
          writeOut(JSON.stringify(result, null, 2));
          return result.failed > 0 ? 1 : 0;
        }
        if (sub === "mutation") {
          const target = parsed.rest[2];
          if (!target) {
            writeErr("usage: glass test mutation <file>");
            return 2;
          }
          const result = await glass.lab.mutate({ target });
          writeOut(
            JSON.stringify(
              {
                generated: result.generated,
                killed: result.killed,
                survived: result.survived,
                notes: result.notes,
              },
              null,
              2,
            ),
          );
          return result.survived > 0 ? 1 : 0;
        }
        if (sub === "coverage") {
          writeOut(JSON.stringify(glass.lab.coverage(), null, 2));
          return 0;
        }
        if (sub === "contracts") {
          writeOut(JSON.stringify(glass.lab.verifyContracts(), null, 2));
          return 0;
        }
        const mode = (sub ?? "workspace") as TestRunMode;
        const result = await glass.lab.run({ mode, target: parsed.rest[2] });
        writeOut(
          `${result.status.toUpperCase()}  ${result.summary.passed} passed  ${result.summary.failed} failed  ${result.summary.skipped} skipped`,
        );
        if (result.status === "unavailable") writeOut(result.outputExcerpt ?? "Unavailable");
        return result.status === "pass" ? 0 : 1;
      }
      case "error": {
        const text = parsed.rest.slice(1).join(" ") || readStdin();
        writeOut(JSON.stringify(glass.errorAnalyze({ stackTrace: text }), null, 2));
        return 0;
      }
      case "runtime":
        writeOut(JSON.stringify(glass.runtime.list(), null, 2));
        return 0;
      case "changes":
        writeOut(JSON.stringify(await glass.gitSummary(), null, 2));
        return 0;
      case "config":
        writeOut(JSON.stringify(glass.configAudit(), null, 2));
        return 0;
      case "env":
        writeOut(JSON.stringify(glass.envUsage(), null, 2));
        return 0;
      case "docs":
        writeOut(JSON.stringify(glass.docsCheck(), null, 2));
        return 0;
      case "release": {
        const report = await glass.release();
        writeOut(JSON.stringify(report, null, 2));
        return report.ready ? 0 : 1;
      }
      case "adapters":
        writeOut(JSON.stringify(glass.adapters(), null, 2));
        return 0;
      case "logs":
        writeOut(path.join(cwd, ".stackglass", "cache"));
        return 0;
      case "cache": {
        if (sub === "clear") {
          const dir = path.join(cwd, ".stackglass", "cache");
          if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
          writeOut("Cache cleared.");
        } else {
          writeOut("usage: glass cache clear");
        }
        return 0;
      }
      case "dashboard": {
        const port = Number(flag(parsed.flags, "port") ?? 4780);
        const { url } = await serveDashboard(cwd, port);
        writeOut(`Dashboard ${url}`);
        await new Promise<void>((resolve) => process.on("SIGINT", () => resolve()));
        return 0;
      }
      default:
        writeErr(`Unknown command: ${cmd}\n`);
        writeOut(HELP);
        return 2;
    }
  } finally {
    if (cmd !== "watch" && cmd !== "dashboard") await glass.close();
  }
}

function formatStatus(snap: Awaited<ReturnType<Stackglass["snapshot"]>>): string {
  const tests =
    snap.testStatus.availability === "available"
      ? `${snap.testStatus.passed ?? 0} passed / ${snap.testStatus.failed ?? 0} failed`
      : snap.testStatus.availability;
  const coverage =
    snap.coverage.availability === "available" && snap.coverage.lines !== undefined
      ? `${snap.coverage.lines}%`
      : snap.coverage.availability;
  return [
    "STACKGLASS",
    `Branch          ${snap.repository.branch ?? "n/a"}`,
    `Changes         ${snap.changedFiles.length} files`,
    `Build           ${snap.buildStatus.status}`,
    `Tests           ${tests}`,
    `Coverage        ${coverage}`,
    `Runtime         ${snap.runtimeStatus.processes.length} processes`,
    `Attention       ${snap.attention.length} item(s)`,
    `MCP             local`,
  ].join("\n");
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function readStdin(): string {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function defaultIo(): CliIo {
  return {
    stdout: (text) => {
      process.stdout.write(text);
    },
    stderr: (text) => {
      process.stderr.write(text);
    },
  };
}

export { HELP };
