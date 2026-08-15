import type { AnalyzedError, ErrorAnalyzeRequest, StackFrame } from "./protocol.ts";
import { fingerprintText, redactSecrets } from "./security.ts";

export interface ErrorAdapter {
  id: string;
  detect(input: string): boolean;
  parse(input: string): AnalyzedError | undefined;
}

export function analyzeError(request: ErrorAnalyzeRequest): AnalyzedError {
  const input =
    request.stackTrace ??
    request.compilerError ??
    request.testFailure ??
    request.runtimeException ??
    request.buildError ??
    "";
  const sanitized = redactSecrets(input);
  if (!sanitized.trim()) {
    return {
      kind: "unknown",
      fingerprint: fingerprintText(["empty"]),
      message: "No error text provided.",
      normalizedMessage: "no error text provided",
      stackFrames: [],
      parser: "none",
      availability: "no_data",
    };
  }
  for (const adapter of ERROR_ADAPTERS) {
    if (adapter.detect(sanitized)) {
      const parsed = adapter.parse(sanitized);
      if (parsed) return parsed;
    }
  }
  return genericParse(sanitized);
}

const TS_RE = /error TS(\d+):\s*(.+)/i;
const TS_LOC = /([^\s:(]+\.tsx?):(\d+):(\d+)/;

const VITEST_RE = /FAIL\s+(.+\.(?:test|spec)\.[jt]sx?)/;
const JEST_RE = /●\s+(.+)/;
const PYTEST_RE = /^(E\s+)?(AssertionError|Error|Exception|Failed):\s*(.+)/m;
const PY_TRACE = /File "([^"]+)", line (\d+)/g;
const RUSTC_RE = /error(?:\[E(\d+)\])?:\s*(.+)/;
const RUST_LOC = /-->\s+([^:]+):(\d+):(\d+)/;
const GO_RE = /([^:\s]+\.go):(\d+):(\d+):\s*(.+)/;
const NODE_FRAME = /^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/gm;
const ESLINT_RE = /([^\s]+):(\d+):(\d+):\s+(.+?)\s+\(([\w-]+)\)/;
const PLAYWRIGHT_RE = /Error:\s*(.+)|Test timeout|expect\(/i;
const DOTNET_RE = /error\s+([A-Z]+\d+):\s*(.+)/;

export const ERROR_ADAPTERS: ErrorAdapter[] = [
  {
    id: "typescript",
    detect: (s) => /error TS\d+/i.test(s) || /TS\d{4}/.test(s),
    parse: (s) => {
      const code = s.match(TS_RE);
      const loc = s.match(TS_LOC);
      const message = code?.[2]?.trim() ?? firstLine(s);
      return makeError({
        kind: "compiler",
        message,
        code: code ? `TS${code[1]}` : undefined,
        file: loc?.[1],
        line: loc ? Number(loc[2]) : undefined,
        column: loc ? Number(loc[3]) : undefined,
        parser: "typescript",
        stackFrames: loc ? [{ file: loc[1], line: Number(loc[2]), column: Number(loc[3]) }] : [],
      });
    },
  },
  {
    id: "eslint",
    detect: (s) => ESLINT_RE.test(s) || /\beslint\b/i.test(s),
    parse: (s) => {
      const m = s.match(ESLINT_RE);
      return makeError({
        kind: "lint",
        message: m?.[4] ?? firstLine(s),
        code: m?.[5],
        file: m?.[1],
        line: m ? Number(m[2]) : undefined,
        column: m ? Number(m[3]) : undefined,
        parser: "eslint",
        stackFrames: [],
      });
    },
  },
  {
    id: "vitest",
    detect: (s) => /FAIL\s+.+\.(test|spec)\./.test(s) || /Vitest/.test(s),
    parse: (s) => {
      const file = s.match(VITEST_RE)?.[1];
      const assertion = s.match(/AssertionError:\s*(.+)/)?.[1] ?? firstLine(s);
      return makeError({
        kind: "test",
        message: assertion,
        file,
        parser: "vitest",
        stackFrames: parseNodeStack(s),
      });
    },
  },
  {
    id: "jest",
    detect: (s) => /● /.test(s) || (/FAIL\s+.+\.test\./.test(s) && /jest/i.test(s)),
    parse: (s) =>
      makeError({
        kind: "test",
        message: s.match(JEST_RE)?.[1] ?? firstLine(s),
        parser: "jest",
        stackFrames: parseNodeStack(s),
      }),
  },
  {
    id: "playwright",
    detect: (s) => /playwright/i.test(s) || (PLAYWRIGHT_RE.test(s) && /locator|page\./i.test(s)),
    parse: (s) =>
      makeError({
        kind: "test",
        message: firstLine(s),
        parser: "playwright",
        stackFrames: parseNodeStack(s),
      }),
  },
  {
    id: "pytest",
    detect: (s) => /={3,} FAILURES ={3,}/.test(s) || PYTEST_RE.test(s) || /pytest/i.test(s),
    parse: (s) => {
      const frames: StackFrame[] = [];
      PY_TRACE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = PY_TRACE.exec(s))) {
        frames.push({ file: m[1], line: Number(m[2]) });
      }
      return makeError({
        kind: "test",
        message: s.match(PYTEST_RE)?.[3] ?? firstLine(s),
        file: frames.at(-1)?.file,
        line: frames.at(-1)?.line,
        parser: "pytest",
        stackFrames: frames,
      });
    },
  },
  {
    id: "python",
    detect: (s) => /Traceback \(most recent call last\)/.test(s),
    parse: (s) => {
      const frames: StackFrame[] = [];
      PY_TRACE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = PY_TRACE.exec(s))) frames.push({ file: m[1], line: Number(m[2]) });
      const err = s.match(/([A-Za-z_]+Error):\s*(.+)/);
      return makeError({
        kind: "runtime",
        message: err ? `${err[1]}: ${err[2]}` : firstLine(s),
        file: frames.at(-1)?.file,
        line: frames.at(-1)?.line,
        parser: "python",
        stackFrames: frames,
      });
    },
  },
  {
    id: "rustc",
    detect: (s) => /error(\[E\d+\])?:/.test(s) && /--> /.test(s),
    parse: (s) => {
      const loc = s.match(RUST_LOC);
      const err = s.match(RUSTC_RE);
      return makeError({
        kind: "compiler",
        message: err?.[2] ?? firstLine(s),
        code: err?.[1] ? `E${err[1]}` : undefined,
        file: loc?.[1],
        line: loc ? Number(loc[2]) : undefined,
        column: loc ? Number(loc[3]) : undefined,
        parser: "rustc",
        stackFrames: loc ? [{ file: loc[1], line: Number(loc[2]), column: Number(loc[3]) }] : [],
      });
    },
  },
  {
    id: "go",
    detect: (s) => GO_RE.test(s) || (/FAIL\s+\S+\s+/.test(s) && /\.go:/.test(s)),
    parse: (s) => {
      const m = s.match(GO_RE);
      return makeError({
        kind: /\.go:\d+:\d+:/.test(s) && /error/.test(s.toLowerCase()) ? "compiler" : "test",
        message: m?.[4] ?? firstLine(s),
        file: m?.[1],
        line: m ? Number(m[2]) : undefined,
        column: m ? Number(m[3]) : undefined,
        parser: "go",
        stackFrames: m ? [{ file: m[1], line: Number(m[2]), column: Number(m[3]) }] : [],
      });
    },
  },
  {
    id: "dotnet",
    detect: (s) => DOTNET_RE.test(s) || /error CS\d+/.test(s),
    parse: (s) => {
      const m = s.match(DOTNET_RE);
      return makeError({
        kind: "compiler",
        message: m?.[2] ?? firstLine(s),
        code: m?.[1],
        parser: "dotnet",
        stackFrames: [],
      });
    },
  },
  {
    id: "node",
    detect: (s) => /^\s*at\s+.+:\d+:\d+/m.test(s) || /Error: /.test(s),
    parse: (s) =>
      makeError({
        kind: "runtime",
        message: firstLine(s),
        parser: "node",
        stackFrames: parseNodeStack(s),
      }),
  },
];

function parseNodeStack(text: string): StackFrame[] {
  const frames: StackFrame[] = [];
  NODE_FRAME.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NODE_FRAME.exec(text))) {
    frames.push({
      functionName: m[1],
      file: m[2],
      line: Number(m[3]),
      column: Number(m[4]),
    });
  }
  return frames.slice(0, 30);
}

function firstLine(s: string): string {
  return redactSecrets(
    s
      .split(/\r?\n/)
      .find((l) => l.trim())
      ?.trim() ?? s.trim(),
  );
}

function makeError(partial: {
  kind: string;
  message: string;
  code?: string;
  file?: string;
  line?: number;
  column?: number;
  parser: string;
  stackFrames: StackFrame[];
}): AnalyzedError {
  const normalized = partial.message.replace(/\d+/g, "N").replace(/\s+/g, " ").trim().toLowerCase();
  return {
    kind: partial.kind,
    fingerprint: fingerprintText([
      partial.kind,
      partial.file,
      String(partial.line ?? ""),
      normalized,
      partial.stackFrames
        .slice(0, 3)
        .map((f) => `${f.file}:${f.functionName ?? ""}`)
        .join(">"),
    ]),
    message: redactSecrets(partial.message),
    normalizedMessage: normalized,
    file: partial.file,
    line: partial.line,
    column: partial.column,
    code: partial.code,
    stackFrames: partial.stackFrames,
    parser: partial.parser,
    availability: "available",
  };
}

function genericParse(s: string): AnalyzedError {
  return makeError({
    kind: "unknown",
    message: firstLine(s),
    parser: "generic",
    stackFrames: parseNodeStack(s),
  });
}
