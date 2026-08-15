/**
 * Shared protocol types for Stackglass.
 * MCP tools, CLI, dashboard, and plugin all speak this model.
 */

export const STACKGLASS_VERSION = "1.1.0";

export const MCP_TOOL_NAMES = [
  "project_snapshot",
  "project_activity_timeline",
  "code_context",
  "dependency_trace",
  "change_impact",
  "git_change_summary",
  "git_history_context",
  "runtime_status",
  "runtime_logs",
  "error_analyze",
  "error_trace",
  "test_discover",
  "test_plan",
  "test_run",
  "test_failure_analyze",
  "coverage_inspect",
  "mutation_test",
  "contract_verify",
  "config_audit",
  "env_usage",
  "docs_check",
  "release_readiness",
] as const;

export type McpToolName = (typeof MCP_TOOL_NAMES)[number];

export const EVENT_TYPES = [
  "file.changed",
  "file.created",
  "file.deleted",
  "git.changed",
  "command.started",
  "command.finished",
  "build.started",
  "build.failed",
  "build.passed",
  "typecheck.started",
  "typecheck.failed",
  "typecheck.passed",
  "test.started",
  "test.failed",
  "test.passed",
  "test.skipped",
  "runtime.started",
  "runtime.stopped",
  "runtime.crashed",
  "coverage.changed",
  "config.changed",
  "dependency.changed",
  "snapshot.created",
  "index.updated",
  "watch.classified",
  "docs.mismatch",
  "contract.changed",
  "failure.fingerprint",
  "watch.autorun",
  "session.summarized",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export type Availability =
  "available" | "unavailable" | "unsupported" | "not_configured" | "no_data";

export type TestStatus = "pass" | "fail" | "skip" | "todo" | "not_run" | "unavailable";

export type BuildStatus = "pass" | "fail" | "not_run" | "unavailable";

export type Confidence = "low" | "moderate" | "high";

export type LogLevel = "error" | "warn" | "info" | "debug" | "trace";

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: EventType;
  origin: string;
  relatedFiles: string[];
  relatedProcess?: string;
  result?: string;
  durationMs?: number;
  metadata: Record<string, unknown>;
}

export interface GitIdentity {
  available: boolean;
  root?: string;
  branch?: string;
  commit?: string;
  commitShort?: string;
  dirty?: boolean;
  ahead?: number;
  behind?: number;
  remote?: string;
}

export interface PackageInfo {
  name: string;
  path: string;
  manager?: string;
  version?: string;
  private?: boolean;
  scripts: string[];
}

export interface LanguageStats {
  language: string;
  files: number;
  bytes: number;
}

export interface FailureSummary {
  id: string;
  fingerprint: string;
  kind: string;
  message: string;
  file?: string;
  line?: number;
  testId?: string;
  firstSeen?: string;
  lastSeen?: string;
  status: "current" | "new" | "recurring" | "regression" | "flake" | "resolved";
}

export interface ProjectSnapshot {
  generatedAt: string;
  workspaceRoot: string;
  repository: GitIdentity;
  changedFiles: ChangedFile[];
  languages: LanguageStats[];
  packages: PackageInfo[];
  testStatus: {
    availability: Availability;
    total?: number;
    passed?: number;
    failed?: number;
    skipped?: number;
    lastRunAt?: string;
  };
  buildStatus: {
    availability: Availability;
    status: BuildStatus;
    lastRunAt?: string;
  };
  runtimeStatus: {
    processes: RuntimeProcess[];
  };
  coverage: {
    availability: Availability;
    lines?: number;
    branches?: number;
    functions?: number;
    statements?: number;
    baseline?: string;
  };
  contracts: {
    availability: Availability;
    status?: "pass" | "fail" | "not_run";
  };
  recentFailures: FailureSummary[];
  attention: AttentionItem[];
}

export interface AttentionItem {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  related?: string[];
}

export interface ChangedFile {
  path: string;
  status: "modified" | "added" | "deleted" | "renamed" | "untracked";
  insertions?: number;
  deletions?: number;
  previousPath?: string;
}

export interface TimelineQuery {
  since?: string;
  until?: string;
  limit?: number;
  eventTypes?: EventType[];
  file?: string;
  package?: string;
}

export interface CodeContextRequest {
  file?: string;
  symbol?: string;
  error?: string;
  test?: string;
  task?: string;
  line?: number;
}

export interface CodeContext {
  availability: Availability;
  file?: string;
  language?: string;
  excerpt?: string;
  startLine?: number;
  endLine?: number;
  symbols?: SymbolInfo[];
  relatedTests?: RelatedTest[];
  imports?: string[];
  exports?: string[];
  notes: string[];
}

export interface SymbolInfo {
  name: string;
  kind: string;
  file: string;
  line: number;
  exported?: boolean;
}

export interface RelatedTest {
  id: string;
  file: string;
  name: string;
  confidence: Confidence;
  reason: string;
}

export interface DependencyTraceRequest {
  file?: string;
  symbol?: string;
  package?: string;
  direction?: "dependencies" | "dependents" | "both";
}

export interface DependencyTrace {
  target: string;
  dependencies: DependencyEdge[];
  dependents: DependencyEdge[];
}

export interface DependencyEdge {
  from: string;
  to: string;
  kind: "import" | "package" | "test" | "config";
  confidence: Confidence;
}

export interface ChangeImpact {
  scope: "working-tree" | "commit" | "specified";
  affectedFiles: string[];
  affectedPackages: string[];
  relatedTests: RelatedTest[];
  publicSurfaceChanges: PublicSurfaceChange[];
  configImpact: string[];
  documentationImpact: string[];
  risk: RiskLevel;
  confidence: Confidence;
  notes: string[];
  heat?: FileHeatEntry[];
}

export interface PublicSurfaceChange {
  kind: "export" | "endpoint" | "cli" | "schema" | "type";
  name: string;
  change: string;
  breaking: boolean;
}

export interface GitChangeSummary {
  available: boolean;
  files: ChangedFile[];
  insertions: number;
  deletions: number;
  renames: number;
  newFiles: number;
  deletedFiles: number;
  riskIndicators: RiskIndicator[];
  comparedTo: string;
}

export interface RiskIndicator {
  code: string;
  severity: RiskLevel;
  message: string;
  files: string[];
}

export interface GitHistoryContext {
  available: boolean;
  target: string;
  commits: GitCommitSummary[];
  notes: string[];
  suspiciousCommits?: SuspiciousCommit[];
}

export interface GitCommitSummary {
  sha: string;
  shortSha: string;
  author: string;
  date: string;
  subject: string;
  files: string[];
}

export interface RuntimeProcess {
  id: string;
  name: string;
  command: string;
  status: "running" | "stopped" | "crashed" | "unknown";
  pid?: number;
  cwd?: string;
  url?: string;
  startedAt?: string;
  managed: boolean;
}

export interface RuntimeLogsQuery {
  process?: string;
  tail?: number;
  filter?: string;
  level?: LogLevel;
  since?: string;
  until?: string;
}

export interface RuntimeLogLine {
  timestamp: string;
  process: string;
  level: LogLevel;
  message: string;
}

export interface ErrorAnalyzeRequest {
  stackTrace?: string;
  compilerError?: string;
  testFailure?: string;
  runtimeException?: string;
  buildError?: string;
}

export interface AnalyzedError {
  kind: string;
  fingerprint: string;
  message: string;
  normalizedMessage: string;
  file?: string;
  line?: number;
  column?: number;
  code?: string;
  stackFrames: StackFrame[];
  parser: string;
  availability: Availability;
}

export interface StackFrame {
  functionName?: string;
  file?: string;
  line?: number;
  column?: number;
}

export interface ErrorTrace {
  error: AnalyzedError;
  source?: CodeContext;
  dependencies: DependencyEdge[];
  recentChanges: ChangedFile[];
  relatedTests: RelatedTest[];
  previousOccurrences: FailureSummary[];
  possibleRegression: boolean;
  notes: string[];
}

export interface TestCase {
  id: string;
  name: string;
  suite?: string;
  file: string;
  framework: string;
  package?: string;
  status?: TestStatus;
  duration?: number;
  history?: TestRunSummary[];
}

export interface TestRunSummary {
  id: string;
  at: string;
  status: TestStatus;
  durationMs?: number;
  commit?: string;
}

export interface TestDiscovery {
  frameworks: DetectedFramework[];
  suites: string[];
  files: string[];
  cases: TestCase[];
  packages: string[];
}

export interface DetectedFramework {
  id: string;
  name: string;
  available: boolean;
  configFiles: string[];
  command?: string;
}

export type TestRunMode =
  "single" | "related" | "changed" | "package" | "workspace" | "failed" | "last";

export interface TestPlanItem {
  order: number;
  kind: "test" | "typecheck" | "build" | "contract" | "lint";
  target: string;
  reason: string;
  estimated?: string;
}

export interface TestPlan {
  mode: TestRunMode | "task";
  items: TestPlanItem[];
  notes: string[];
}

export interface TestRunRequest {
  mode?: TestRunMode;
  target?: string;
  plan?: TestPlan;
  timeoutMs?: number;
  files?: string[];
  repeat?: number;
}

export interface TestRunResult {
  id: string;
  startedAt: string;
  finishedAt: string;
  mode: TestRunMode;
  status: "pass" | "fail" | "error" | "cancelled" | "unavailable";
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    durationMs: number;
  };
  cases: TestCase[];
  failures: TestFailure[];
  outputExcerpt?: string;
}

export interface TestFailure {
  testId: string;
  name: string;
  file: string;
  message: string;
  expected?: string;
  actual?: string;
  stack?: string;
  fingerprint: string;
}

export interface TestFailureAnalysis {
  failure: TestFailure;
  expected?: string;
  actual?: string;
  stack?: string;
  source?: CodeContext;
  recentChange?: ChangedFile[];
  previousSuccessfulRun?: TestRunSummary;
  correlatedFailures: TestFailure[];
  firstSeen?: string;
  lastSeen?: string;
  previouslyResolved: boolean;
  similarFailures: FailureSummary[];
  possibleCauses: string[];
  clusters?: FailureCluster[];
}

export interface CoverageReport {
  availability: Availability;
  scope: "file" | "package" | "changed" | "workspace";
  target?: string;
  lines?: CoverageMetric;
  branches?: CoverageMetric;
  functions?: CoverageMetric;
  statements?: CoverageMetric;
  changedCode?: ChangedCodeCoverage[];
  baseline?: CoverageBaseline;
  files: FileCoverage[];
}

export interface CoverageMetric {
  covered: number;
  total: number;
  pct: number;
}

export interface ChangedCodeCoverage {
  file: string;
  changedLines: number;
  coveredChangedLines: number;
  pct: number;
  uncoveredLines: number[];
}

export interface CoverageBaseline {
  source: string;
  at: string;
  linesPct?: number;
}

export interface FileCoverage {
  file: string;
  lines?: CoverageMetric;
  branches?: CoverageMetric;
  functions?: CoverageMetric;
  statements?: CoverageMetric;
}

export interface MutationRequest {
  target: string;
  timeoutMs?: number;
  maxMutants?: number;
}

export interface MutationResult {
  availability: Availability;
  target: string;
  workspace: string;
  generated: number;
  killed: number;
  survived: number;
  timedOut: number;
  invalid: number;
  mutants: Mutant[];
  notes: string[];
}

export interface Mutant {
  id: string;
  file: string;
  line: number;
  operator: string;
  original: string;
  replacement: string;
  status: "killed" | "survived" | "timed_out" | "invalid";
  killingTest?: string;
}

export type ContractKind =
  | "http"
  | "openapi"
  | "graphql"
  | "json-schema"
  | "package-exports"
  | "cli"
  | "snapshot"
  | "database";

export interface ContractVerifyResult {
  availability: Availability;
  contracts: ContractCheck[];
  breaking: ContractChange[];
  compatible: ContractChange[];
}

export interface ContractCheck {
  kind: ContractKind;
  name: string;
  status: "pass" | "fail" | "unavailable" | "not_configured";
  details?: string;
}

export interface ContractChange {
  kind: string;
  path: string;
  breaking: boolean;
  before?: string;
  after?: string;
}

export interface ConfigAuditResult {
  findings: ConfigFinding[];
  categories: Record<string, string[]>;
}

export interface ConfigFinding {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  files: string[];
}

export interface EnvUsageReport {
  variables: EnvVariableUsage[];
}

export interface EnvVariableUsage {
  name: string;
  locations: string[];
  required: boolean;
  documented: boolean;
  exampleExists: boolean;
  defined: boolean;
}

export interface DocsCheckResult {
  mismatches: DocsMismatch[];
  relationships: DocsRelationship[];
}

export interface DocsMismatch {
  severity: "info" | "warning" | "error";
  document: string;
  message: string;
  reference: string;
}

export interface DocsRelationship {
  document: string;
  kind: "package" | "command" | "config" | "api" | "file";
  target: string;
}

export type CheckStatus = "pass" | "fail" | "warning" | "skip" | "not_run" | "unavailable";

export interface ReleaseReadiness {
  ready: boolean;
  checks: ReleaseCheck[];
  blockers: string[];
  warnings: string[];
}

export interface ReleaseCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail?: string;
}

export interface IndexedFile {
  path: string;
  relativePath: string;
  kind: "source" | "test" | "docs" | "config" | "manifest" | "script" | "asset" | "other";
  language?: string;
  size: number;
  hash: string;
}

export interface ProjectIndex {
  generatedAt: string;
  root: string;
  files: IndexedFile[];
  directories: string[];
  languages: LanguageStats[];
  packages: PackageInfo[];
  manifests: string[];
  testFiles: string[];
  sourceFiles: string[];
  documentation: string[];
  configuration: string[];
  scripts: Record<string, string>;
  symbols: SymbolInfo[];
  imports: ImportRecord[];
  dependencies: PackageDependency[];
  publicExports: PublicExport[];
}

export interface ImportRecord {
  file: string;
  specifier: string;
  kind: "relative" | "package" | "builtin";
}

export interface PackageDependency {
  package: string;
  name: string;
  version: string;
  kind: "dependency" | "devDependency" | "peerDependency" | "optionalDependency";
}

export interface PublicExport {
  package: string;
  name: string;
  file?: string;
}

export interface DoctorReport {
  version: string;
  node: string;
  checks: DoctorCheck[];
  ok: boolean;
}

export interface DoctorCheck {
  id: string;
  label: string;
  status: "pass" | "fail" | "warning" | "skip";
  detail?: string;
}

export interface FlakeReport {
  tests: FlakeCandidate[];
}

export interface FlakeCandidate {
  testId: string;
  name: string;
  file: string;
  confidence: Confidence;
  passRate?: number;
  samples: number;
  lastFailure?: string;
  notes: string[];
}

export interface SnapshotRecord {
  id: string;
  createdAt: string;
  branch?: string;
  commit?: string;
  changedFiles: string[];
  dependencyFingerprint: string;
  testStatus: ProjectSnapshot["testStatus"];
  buildStatus: ProjectSnapshot["buildStatus"];
  coverageSummary?: { lines?: number; availability: Availability };
  runtimeProcessCount: number;
  configFingerprint: string;
  documentationFingerprint: string;
}

export interface ProjectNarrative {
  headline: string;
  paragraphs: string[];
  evidence: string[];
  unanswered: string[];
}

export interface SessionReplay {
  startedAt?: string;
  endedAt?: string;
  eventCount: number;
  filesTouched: string[];
  testsObserved: number;
  failuresObserved: number;
  summary: string;
  beats: Array<{ at: string; type: string; detail: string }>;
}

export interface FailureCluster {
  id: string;
  label: string;
  count: number;
  failures: FailureSummary[];
  sharedFiles: string[];
  sharedDependency?: string;
  recentChange?: string;
}

export interface FileHeatEntry {
  file: string;
  events: number;
  failures: number;
  changes: number;
  score: number;
}

export interface SnapshotDiff {
  availability: Availability;
  beforeId?: string;
  afterId?: string;
  filesAdded: string[];
  filesRemoved: string[];
  testDelta?: { passed: number; failed: number };
  coverageDelta?: number;
  notes: string[];
}

export interface SuspiciousCommit {
  sha: string;
  shortSha: string;
  subject: string;
  score: number;
  overlappingFiles: string[];
  reason: string;
}

export interface FlakeRepeatResult {
  target: string;
  requested: number;
  ran: number;
  passed: number;
  failed: number;
  stoppedEarly: boolean;
  notes: string[];
}

export interface McpUnavailable {
  availability: Exclude<Availability, "available">;
  reason: string;
}

export function unavailable(
  availability: Exclude<Availability, "available">,
  reason: string,
): McpUnavailable {
  return { availability, reason };
}
