import { z } from "zod";
import { MCP_TOOL_NAMES } from "@stackglass/core";

export const toolNames = MCP_TOOL_NAMES;

export const snapshotInput = z
  .object({
    narrative: z.boolean().optional(),
  })
  .strict();

export const timelineInput = z
  .object({
    since: z.string().optional(),
    until: z.string().optional(),
    limit: z.number().int().positive().max(1000).optional(),
    event_types: z.array(z.string()).optional(),
    file: z.string().optional(),
    package: z.string().optional(),
    session: z.boolean().optional(),
  })
  .strict();

export const codeContextInput = z
  .object({
    file: z.string().optional(),
    symbol: z.string().optional(),
    error: z.string().optional(),
    test: z.string().optional(),
    task: z.string().optional(),
    line: z.number().int().positive().optional(),
  })
  .strict();

export const dependencyTraceInput = z
  .object({
    file: z.string().optional(),
    symbol: z.string().optional(),
    package: z.string().optional(),
    direction: z.enum(["dependencies", "dependents", "both"]).optional(),
  })
  .strict();

export const changeImpactInput = z
  .object({
    files: z.array(z.string()).optional(),
    heat: z.boolean().optional(),
  })
  .strict();

export const gitChangeInput = z.object({}).strict();

export const gitHistoryInput = z
  .object({
    file: z.string().optional(),
    symbol: z.string().optional(),
    failure: z.string().optional(),
    directory: z.string().optional(),
    rank_suspicious: z.boolean().optional(),
  })
  .strict();

export const runtimeStatusInput = z.object({}).strict();

export const runtimeLogsInput = z
  .object({
    process: z.string().optional(),
    tail: z.number().int().positive().max(2000).optional(),
    filter: z.string().optional(),
    level: z.enum(["error", "warn", "info", "debug", "trace"]).optional(),
    since: z.string().optional(),
    until: z.string().optional(),
  })
  .strict();

export const errorAnalyzeInput = z
  .object({
    stack_trace: z.string().optional(),
    compiler_error: z.string().optional(),
    test_failure: z.string().optional(),
    runtime_exception: z.string().optional(),
    build_error: z.string().optional(),
  })
  .strict();

export const errorTraceInput = errorAnalyzeInput;

export const testDiscoverInput = z.object({}).strict();

export const testPlanInput = z
  .object({
    files: z.array(z.string()).optional(),
    task: z.string().optional(),
    mode: z
      .enum(["single", "related", "changed", "package", "workspace", "failed", "last"])
      .optional(),
  })
  .strict();

export const testRunInput = z
  .object({
    mode: z
      .enum(["single", "related", "changed", "package", "workspace", "failed", "last"])
      .optional(),
    target: z.string().optional(),
    timeout_ms: z.number().int().positive().optional(),
    files: z.array(z.string()).optional(),
    repeat: z.number().int().positive().max(25).optional(),
  })
  .strict();

export const testFailureAnalyzeInput = z
  .object({
    test_id: z.string().optional(),
    name: z.string().optional(),
    file: z.string().optional(),
    message: z.string().optional(),
    expected: z.string().optional(),
    actual: z.string().optional(),
    stack: z.string().optional(),
    cluster: z.boolean().optional(),
  })
  .strict();

export const coverageInspectInput = z
  .object({
    scope: z.enum(["file", "package", "changed", "workspace"]).optional(),
    target: z.string().optional(),
  })
  .strict();

export const mutationTestInput = z
  .object({
    target: z.string(),
    timeout_ms: z.number().int().positive().optional(),
    max_mutants: z.number().int().positive().max(100).optional(),
  })
  .strict();

export const contractVerifyInput = z
  .object({
    before: z.unknown().optional(),
    after: z.unknown().optional(),
  })
  .strict();

export const configAuditInput = z.object({}).strict();
export const envUsageInput = z.object({}).strict();
export const docsCheckInput = z.object({}).strict();
export const releaseReadinessInput = z.object({}).strict();

export const SCHEMAS = {
  project_snapshot: snapshotInput,
  project_activity_timeline: timelineInput,
  code_context: codeContextInput,
  dependency_trace: dependencyTraceInput,
  change_impact: changeImpactInput,
  git_change_summary: gitChangeInput,
  git_history_context: gitHistoryInput,
  runtime_status: runtimeStatusInput,
  runtime_logs: runtimeLogsInput,
  error_analyze: errorAnalyzeInput,
  error_trace: errorTraceInput,
  test_discover: testDiscoverInput,
  test_plan: testPlanInput,
  test_run: testRunInput,
  test_failure_analyze: testFailureAnalyzeInput,
  coverage_inspect: coverageInspectInput,
  mutation_test: mutationTestInput,
  contract_verify: contractVerifyInput,
  config_audit: configAuditInput,
  env_usage: envUsageInput,
  docs_check: docsCheckInput,
  release_readiness: releaseReadinessInput,
} as const;

export type ToolName = keyof typeof SCHEMAS;
