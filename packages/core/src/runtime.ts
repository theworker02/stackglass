import { randomUUID } from "node:crypto";
import type { RuntimeLogLine, RuntimeLogsQuery, RuntimeProcess, LogLevel } from "./protocol.ts";
import { redactSecrets } from "./security.ts";
import { runCommand } from "./process.ts";
import type { CancellationToken } from "./cancel.ts";
import type { GlassTrace } from "./trace.ts";

interface Managed {
  process: RuntimeProcess;
  logs: RuntimeLogLine[];
  child?: { kill: () => void };
}

export class RuntimeManager {
  private readonly processes = new Map<string, Managed>();

  constructor(
    private readonly root: string,
    private readonly trace: GlassTrace,
  ) {}

  list(): RuntimeProcess[] {
    return [...this.processes.values()].map((m) => m.process);
  }

  async start(
    name: string,
    command: string,
    args: string[],
    cwd?: string,
  ): Promise<RuntimeProcess> {
    const id = randomUUID();
    const startedAt = new Date().toISOString();
    const proc: RuntimeProcess = {
      id,
      name,
      command: [command, ...args].join(" "),
      status: "running",
      cwd: cwd ?? this.root,
      startedAt,
      managed: true,
    };
    this.processes.set(id, { process: proc, logs: [] });
    this.trace.record({
      type: "runtime.started",
      relatedProcess: id,
      metadata: { name, command: proc.command },
    });
    void runCommand(command, args, { cwd: cwd ?? this.root, timeoutMs: 0 }).then((result) => {
      const managed = this.processes.get(id);
      if (!managed) return;
      managed.process.status = result.exitCode === 0 ? "stopped" : "crashed";
      this.append(
        id,
        result.exitCode === 0 ? "info" : "error",
        redactSecrets(result.stdout || result.stderr || "exited"),
      );
      this.trace.record({
        type: result.exitCode === 0 ? "runtime.stopped" : "runtime.crashed",
        relatedProcess: id,
        result: String(result.exitCode),
        durationMs: result.durationMs,
      });
    });
    return proc;
  }

  stop(id: string): RuntimeProcess | undefined {
    const managed = this.processes.get(id);
    if (!managed) return undefined;
    managed.child?.kill();
    managed.process.status = "stopped";
    this.trace.record({ type: "runtime.stopped", relatedProcess: id });
    return managed.process;
  }

  append(id: string, level: LogLevel, message: string): void {
    const managed = this.processes.get(id);
    if (!managed) return;
    managed.logs.push({
      timestamp: new Date().toISOString(),
      process: managed.process.name,
      level,
      message: redactSecrets(message),
    });
    if (managed.logs.length > 5000) managed.logs.splice(0, managed.logs.length - 5000);
  }

  logs(query: RuntimeLogsQuery): RuntimeLogLine[] {
    const all = [...this.processes.values()].flatMap((m) => m.logs);
    let rows = all;
    if (query.process) {
      const processId = query.process;
      rows = rows.filter(
        (l) => l.process === processId || this.processes.get(processId)?.process.name === l.process,
      );
    }
    if (query.level) {
      const order: LogLevel[] = ["error", "warn", "info", "debug", "trace"];
      const min = order.indexOf(query.level);
      rows = rows.filter((l) => order.indexOf(l.level) <= min);
    }
    if (query.filter) {
      const f = query.filter.toLowerCase();
      rows = rows.filter((l) => l.message.toLowerCase().includes(f));
    }
    if (query.since) rows = rows.filter((l) => l.timestamp >= query.since!);
    if (query.until) rows = rows.filter((l) => l.timestamp <= query.until!);
    const tail = query.tail ?? 200;
    return rows.slice(-tail);
  }

  registerExternal(info: Omit<RuntimeProcess, "id" | "managed"> & { id?: string }): RuntimeProcess {
    const proc: RuntimeProcess = {
      ...info,
      id: info.id ?? randomUUID(),
      managed: false,
    };
    this.processes.set(proc.id, { process: proc, logs: [] });
    return proc;
  }
}

export async function pingUrl(url: string, token?: CancellationToken): Promise<boolean> {
  try {
    token?.throwIfCancelled();
    const res = await fetch(url, { signal: token?.toAbortSignal() ?? AbortSignal.timeout(2000) });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}
