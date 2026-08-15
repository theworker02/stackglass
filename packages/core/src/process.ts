import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import { randomUUID } from "node:crypto";
import { CancelledError } from "./errors.ts";
import type { CancellationToken } from "./cancel.ts";
import { redactSecrets } from "./security.ts";

export interface RunCommandOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  input?: string;
  token?: CancellationToken;
  shell?: boolean;
}

export interface CommandResult {
  command: string;
  args: string[];
  cwd: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  cancelled: boolean;
}

const MAX_CAPTURE = 2_000_000;

export function runCommand(
  command: string,
  args: string[],
  options: RunCommandOptions,
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const spawnOpts: SpawnOptions = {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: options.shell ?? false,
      windowsHide: true,
    };
    let child: ChildProcess;
    try {
      child = spawn(command, args, spawnOpts);
    } catch (error) {
      resolve({
        command,
        args,
        cwd: options.cwd,
        exitCode: 1,
        signal: null,
        stdout: "",
        stderr: redactSecrets(error instanceof Error ? error.message : String(error)),
        durationMs: Date.now() - started,
        timedOut: false,
        cancelled: false,
      });
      return;
    }

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let cancelled = false;

    const append = (target: "stdout" | "stderr", chunk: Buffer | string) => {
      const text = redactSecrets(chunk.toString("utf8"));
      if (target === "stdout") {
        stdout += text;
        if (stdout.length > MAX_CAPTURE) stdout = stdout.slice(-MAX_CAPTURE);
      } else {
        stderr += text;
        if (stderr.length > MAX_CAPTURE) stderr = stderr.slice(-MAX_CAPTURE);
      }
    };

    child.stdout?.on("data", (chunk: Buffer) => append("stdout", chunk));
    child.stderr?.on("data", (chunk: Buffer) => append("stderr", chunk));

    if (options.input) child.stdin?.end(options.input);
    else child.stdin?.end();

    let timeout: NodeJS.Timeout | undefined;
    if (options.timeoutMs && options.timeoutMs > 0) {
      timeout = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        setTimeout(() => child.kill("SIGKILL"), 3_000).unref?.();
      }, options.timeoutMs);
    }

    const unsubscribe = options.token?.onCancel(() => {
      cancelled = true;
      child.kill("SIGTERM");
    });

    child.on("error", (error) => {
      if (timeout) clearTimeout(timeout);
      unsubscribe?.();
      reject(error);
    });

    child.on("close", (exitCode, signal) => {
      if (timeout) clearTimeout(timeout);
      unsubscribe?.();
      if (cancelled) {
        reject(new CancelledError());
        return;
      }
      resolve({
        command,
        args,
        cwd: options.cwd,
        exitCode,
        signal,
        stdout,
        stderr,
        durationMs: Date.now() - started,
        timedOut,
        cancelled,
      });
    });
  });
}

export function shellCommand(
  commandLine: string,
  options: RunCommandOptions,
): Promise<CommandResult> {
  const isWindows = process.platform === "win32";
  if (isWindows) {
    return runCommand("cmd.exe", ["/d", "/s", "/c", commandLine], { ...options, shell: false });
  }
  return runCommand("sh", ["-c", commandLine], { ...options, shell: false });
}

export function commandId(): string {
  return randomUUID();
}
