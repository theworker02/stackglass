import {
  Stackglass,
  fingerprintText,
  narrate,
  type EventType,
  type TestFailure,
} from "@stackglass/core";
import { SCHEMAS, type ToolName } from "./schemas.ts";
export type { ToolName };
import { z } from "zod";

export interface ToolContext {
  glass: Stackglass;
  signal?: AbortSignal;
}

export interface ToolResult {
  structured: unknown;
  text: string;
}

function json(value: unknown): ToolResult {
  return {
    structured: value,
    text: JSON.stringify(value, null, 2),
  };
}

export async function invokeTool(
  name: ToolName,
  rawArgs: unknown,
  ctx: ToolContext,
): Promise<ToolResult> {
  const schema = SCHEMAS[name];
  const args = schema.parse(rawArgs ?? {});
  switch (name) {
    case "project_snapshot": {
      const a = args as z.infer<typeof SCHEMAS.project_snapshot>;
      const snapshot = await ctx.glass.snapshot();
      if (!a.narrative) return json(snapshot);
      return json({ ...snapshot, narrative: narrate(snapshot, ctx.glass.timeline({ limit: 80 })) });
    }
    case "project_activity_timeline": {
      const a = args as z.infer<typeof SCHEMAS.project_activity_timeline>;
      const events = ctx.glass.timeline({
        since: a.since,
        until: a.until,
        limit: a.limit,
        eventTypes: a.event_types as EventType[] | undefined,
        file: a.file,
        package: a.package,
      });
      if (!a.session) return json(events);
      return json({ events, session: ctx.glass.session(a.limit ?? 200) });
    }
    case "code_context": {
      const a = args as z.infer<typeof SCHEMAS.code_context>;
      return json(
        ctx.glass.codeContext({
          file: a.file,
          symbol: a.symbol,
          error: a.error,
          test: a.test,
          task: a.task,
          line: a.line,
        }),
      );
    }
    case "dependency_trace": {
      const a = args as z.infer<typeof SCHEMAS.dependency_trace>;
      return json(ctx.glass.dependencyTrace(a));
    }
    case "change_impact": {
      const a = args as z.infer<typeof SCHEMAS.change_impact>;
      return json(await ctx.glass.changeImpact(a.files, { heat: a.heat }));
    }
    case "git_change_summary":
      return json(await ctx.glass.gitSummary());
    case "git_history_context": {
      const a = args as z.infer<typeof SCHEMAS.git_history_context>;
      return json(
        await ctx.glass.gitHistory({
          file: a.file,
          directory: a.directory,
          query: a.symbol ?? a.failure,
          rankSuspicious: a.rank_suspicious,
        }),
      );
    }
    case "runtime_status":
      return json({ processes: ctx.glass.runtime.list() });
    case "runtime_logs": {
      const a = args as z.infer<typeof SCHEMAS.runtime_logs>;
      return json(ctx.glass.runtime.logs(a));
    }
    case "error_analyze": {
      const a = args as z.infer<typeof SCHEMAS.error_analyze>;
      return json(
        ctx.glass.errorAnalyze({
          stackTrace: a.stack_trace,
          compilerError: a.compiler_error,
          testFailure: a.test_failure,
          runtimeException: a.runtime_exception,
          buildError: a.build_error,
        }),
      );
    }
    case "error_trace": {
      const a = args as z.infer<typeof SCHEMAS.error_trace>;
      return json(
        await ctx.glass.errorTrace({
          stackTrace: a.stack_trace,
          compilerError: a.compiler_error,
          testFailure: a.test_failure,
          runtimeException: a.runtime_exception,
          buildError: a.build_error,
        }),
      );
    }
    case "test_discover":
      return json(ctx.glass.lab.discover());
    case "test_plan": {
      const a = args as z.infer<typeof SCHEMAS.test_plan>;
      return json(ctx.glass.lab.plan(a));
    }
    case "test_run": {
      const a = args as z.infer<typeof SCHEMAS.test_run>;
      if (a.repeat && a.repeat > 1) {
        return json(
          await ctx.glass.lab.repeat({
            mode: a.mode,
            target: a.target,
            timeoutMs: a.timeout_ms,
            files: a.files,
            repeat: a.repeat,
          }),
        );
      }
      return json(
        await ctx.glass.lab.run({
          mode: a.mode,
          target: a.target,
          timeoutMs: a.timeout_ms,
          files: a.files,
        }),
      );
    }
    case "test_failure_analyze": {
      const a = args as z.infer<typeof SCHEMAS.test_failure_analyze>;
      const last = ctx.glass.storage.latestTestRun();
      const found =
        last?.failures.find((f) => f.testId === a.test_id || f.name === a.name) ??
        ({
          testId: a.test_id ?? "unknown",
          name: a.name ?? "unknown",
          file: a.file ?? "",
          message: a.message ?? "No failure text provided.",
          expected: a.expected,
          actual: a.actual,
          stack: a.stack,
          fingerprint: fingerprintText(["test", a.file, a.name, a.message]),
        } satisfies TestFailure);
      return json(ctx.glass.lab.analyzeFailure(found, { cluster: a.cluster }));
    }
    case "coverage_inspect": {
      const a = args as z.infer<typeof SCHEMAS.coverage_inspect>;
      const report = ctx.glass.lab.coverage(a.scope ?? "workspace", a.target);
      if (a.scope === "changed") {
        return json({ ...report, changedCode: await ctx.glass.lab.changedCodeCoverage() });
      }
      return json(report);
    }
    case "mutation_test": {
      const a = args as z.infer<typeof SCHEMAS.mutation_test>;
      return json(
        await ctx.glass.lab.mutate({
          target: a.target,
          timeoutMs: a.timeout_ms,
          maxMutants: a.max_mutants,
        }),
      );
    }
    case "contract_verify": {
      const a = args as z.infer<typeof SCHEMAS.contract_verify>;
      const result = ctx.glass.lab.verifyContracts();
      if (a.before !== undefined && a.after !== undefined) {
        const changes = ctx.glass.lab.compareContracts(a.before, a.after);
        return json({
          ...result,
          breaking: changes.filter((c) => c.breaking),
          compatible: changes.filter((c) => !c.breaking),
        });
      }
      return json(result);
    }
    case "config_audit":
      return json(ctx.glass.configAudit());
    case "env_usage":
      return json(ctx.glass.envUsage());
    case "docs_check":
      return json(ctx.glass.docsCheck());
    case "release_readiness":
      return json(await ctx.glass.release());
    default: {
      const _exhaustive: never = name;
      throw new Error(`Unknown tool ${_exhaustive}`);
    }
  }
}

export const TOOL_DESCRIPTIONS: Record<ToolName, string> = {
  project_snapshot:
    "Returns the current observable state of the project: git, changes, tests, build, runtime, failures. Optional narrative mode explains the state in prose.",
  project_activity_timeline:
    "Returns meaningful recent development events from the Stackglass flight recorder. Optional session mode adds a replay summary.",
  code_context: "Returns useful source context for a file, symbol, error, test, or task.",
  dependency_trace: "Traces dependencies or dependents related to a source component.",
  change_impact:
    "Analyzes likely impact of working-tree or specified changes. Optional heat ranks noisy files.",
  git_change_summary: "Returns a structured interpretation of the current Git diff.",
  git_history_context:
    "Returns relevant Git history for a file, symbol, failure, or directory. Optional rank_suspicious scores commits by overlapping failure files instead of assuming newest is guilty.",
  runtime_status: "Returns known Stackglass-managed development runtime state.",
  runtime_logs: "Returns sanitized logs associated with known Stackglass-managed processes.",
  error_analyze:
    "Parses a stack trace, compiler error, test failure, or runtime exception into a structured interpretation.",
  error_trace:
    "Connects an error to source, dependencies, recent changes, related tests, and previous occurrences.",
  test_discover: "Discovers test frameworks, suites, files, and cases.",
  test_plan: "Generates the smallest useful verification plan for a change or task.",
  test_run:
    "Runs a Stackglass test plan or selected test target. Optional files and repeat (flake probe, never a single-run flake label).",
  test_failure_analyze:
    "Analyzes failing tests against expected/actual, source, and previous runs. Optional cluster groups related failures.",
  coverage_inspect:
    "Returns coverage information where the underlying framework provides it. Never invents coverage.",
  mutation_test:
    "Runs mutation testing against a controlled target in an isolated temporary workspace.",
  contract_verify:
    "Verifies observable contracts (OpenAPI, exports, snapshots, schemas) and compares breaking changes.",
  config_audit:
    "Examines configuration for inconsistencies, missing references, and environment divergence.",
  env_usage: "Reports environment-variable names and usage. Never returns secret values.",
  docs_check: "Checks developer documentation against project reality.",
  release_readiness: "Performs a final release verification report. Never publishes.",
};
