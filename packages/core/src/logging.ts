import type { LogLevel } from "./protocol.ts";
import { redactSecrets } from "./security.ts";

const LEVEL_ORDER: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

export interface LogRecord {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export class Logger {
  constructor(
    private minLevel: LogLevel = "info",
    private sink: (record: LogRecord) => void = defaultSink,
  ) {}

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.write("error", message, context);
  }
  warn(message: string, context?: Record<string, unknown>): void {
    this.write("warn", message, context);
  }
  info(message: string, context?: Record<string, unknown>): void {
    this.write("info", message, context);
  }
  debug(message: string, context?: Record<string, unknown>): void {
    this.write("debug", message, context);
  }
  trace(message: string, context?: Record<string, unknown>): void {
    this.write("trace", message, context);
  }

  child(context: Record<string, unknown>): Logger {
    return new Logger(this.minLevel, (record) => {
      this.sink({
        ...record,
        context: { ...context, ...record.context },
      });
    });
  }

  private write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] > LEVEL_ORDER[this.minLevel]) return;
    this.sink({
      timestamp: new Date().toISOString(),
      level,
      message: redactSecrets(message),
      context,
    });
  }
}

function defaultSink(record: LogRecord): void {
  const line = `[stackglass ${record.level}] ${record.message}`;
  if (record.level === "error") console.error(line);
  else if (record.level === "warn") console.warn(line);
  else console.error(line);
}
