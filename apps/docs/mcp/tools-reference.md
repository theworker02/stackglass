# MCP tool reference

Each tool returns JSON. Extra properties are rejected. Missing projects still return structured availability fields rather than fake data.

Permissions: local filesystem of the workspace only. Secrets are redacted.

## project_snapshot

**Purpose:** Current observable project state.

**Example arguments:**

```json
{}
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.

## project_activity_timeline

**Purpose:** Flight-recorder events.

**Example arguments:**

```json
{ "limit": 50, "file": "src/auth/token.ts" }
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.

## code_context

**Purpose:** Source excerpt, symbols, related tests.

**Example arguments:**

```json
{ "file": "src/auth/token.ts", "line": 84 }
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.

## dependency_trace

**Purpose:** Imports and dependents.

**Example arguments:**

```json
{ "file": "src/auth/token.ts", "direction": "both" }
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.

## change_impact

**Purpose:** Affected files, tests, public surface, risk.

**Example arguments:**

```json
{}
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.

## git_change_summary

**Purpose:** Structured working-tree diff.

**Example arguments:**

```json
{}
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.

## git_history_context

**Purpose:** Recent commits for a path.

**Example arguments:**

```json
{ "file": "src/auth/token.ts" }
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.

## runtime_status

**Purpose:** Stackglass-managed processes only.

**Example arguments:**

```json
{}
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.

## runtime_logs

**Purpose:** Sanitized logs.

**Example arguments:**

```json
{ "tail": 100, "level": "error" }
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.

## error_analyze

**Purpose:** Parse compiler/test/runtime errors.

**Example arguments:**

```json
{ "compiler_error": "error TS2322: ..." }
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.

## error_trace

**Purpose:** Connect an error to source, git, tests, history.

**Example arguments:**

```json
{ "test_failure": "AssertionError: ..." }
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.

## test_discover

**Purpose:** Frameworks, files, cases.

**Example arguments:**

```json
{}
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.

## test_plan

**Purpose:** Smallest useful verification plan.

**Example arguments:**

```json
{ "files": ["src/auth/token.ts"] }
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.

## test_run

**Purpose:** Execute a plan or mode.

**Example arguments:**

```json
{ "mode": "related" }
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.

## test_failure_analyze

**Purpose:** Expected/actual, history, correlated failures.

**Example arguments:**

```json
{ "name": "token expiration" }
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.

## coverage_inspect

**Purpose:** Coverage if a provider produced it.

**Example arguments:**

```json
{ "scope": "changed" }
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.

## mutation_test

**Purpose:** Isolated mutation testing.

**Example arguments:**

```json
{ "target": "src/auth/token.ts" }
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.

## contract_verify

**Purpose:** Contracts and breaking JSON compare.

**Example arguments:**

```json
{ "before": {"id": 1}, "after": {} }
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.

## config_audit

**Purpose:** Config drift and conflicts.

**Example arguments:**

```json
{}
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.

## env_usage

**Purpose:** Env var names only, never values.

**Example arguments:**

```json
{}
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.

## docs_check

**Purpose:** README vs scripts and files.

**Example arguments:**

```json
{}
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.

## release_readiness

**Purpose:** Release report. Never publishes.

**Example arguments:**

```json
{}
```

**Errors:** invalid arguments return `invalid_arguments` with Zod issues. Internal failures return `internal_failure`. Cancellation surfaces as a cancelled test/run status where applicable.

**Security:** outputs pass through secret redaction. `env_usage` never returns values.
