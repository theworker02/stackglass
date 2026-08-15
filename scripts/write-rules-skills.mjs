import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function write(rel, contents) {
  const abs = path.join(root, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, contents.endsWith("\n") ? contents : contents + "\n", "utf8");
}

const rules = [
  [
    "01-observe-before-changing.mdc",
    "Observe failures with Stackglass before editing code.",
    `# Observe before changing

Before fixing a failure:

1. Inspect the failure (\`test_failure_analyze\` / \`error_analyze\`)
2. Inspect source (\`code_context\`)
3. Inspect related changes (\`git_change_summary\`)
4. Inspect related tests (\`test_plan\`)
5. Inspect history (\`project_activity_timeline\`, \`git_history_context\`)
6. Form a hypothesis
7. Then modify

Do not randomly edit code until tests pass.`,
  ],
  [
    "02-investigate-failures.mdc",
    "Use Stackglass evidence when investigating failures.",
    `# Investigate failures

Use Stackglass MCP tools, not guesses.

Capture → fingerprint → source → related tests → timeline → git history → recent changes → hypothesis → reproduce → minimal fix → verify.

Call \`error_trace\` for the signature Stackglass connection between an error and what changed.`,
  ],
  [
    "03-test-selection.mdc",
    "Run the smallest meaningful verification first.",
    `# Test selection

Use the smallest meaningful verification first:

related unit test → package tests → integration tests → full workspace

Call \`test_plan\` then \`test_run\` with mode \`related\` or \`changed\` before \`workspace\`.`,
  ],
  [
    "04-test-integrity.mdc",
    "Never weaken tests merely to make the suite pass.",
    `# Test integrity

Never weaken tests merely to make the suite pass.

Suspicious without justification:

- removing assertions
- loosening comparisons
- skipping tests
- increasing arbitrary timeouts
- accepting snapshots blindly

Require a reason in the change description.`,
  ],
  [
    "05-no-blind-snapshot-updates.mdc",
    "Do not auto-accept snapshots because tests fail.",
    `# No blind snapshot updates

Do not automatically accept snapshots merely because tests fail.

Inspect the snapshot diff. Require intentional user acceptance before updating fixtures.`,
  ],
  [
    "06-validate-changes.mdc",
    "Do not claim success when tests did not actually pass.",
    `# No false pass

Do not claim success when:

- tests did not run
- tests were skipped
- build failed
- runner crashed
- coverage unavailable

Distinguish: PASS, FAIL, SKIPPED, NOT RUN, UNAVAILABLE.`,
  ],
  [
    "07-config-awareness.mdc",
    "Inspect existing configuration before adding new systems.",
    `# Configuration awareness

Before introducing a new configuration system or environment variable:

- inspect existing configuration (\`config_audit\`)
- inspect naming conventions
- inspect documentation
- inspect deployment / CI usage`,
  ],
  [
    "08-environment-safety.mdc",
    "Never expose environment secret values to agents.",
    `# Environment safety

Never return secret values. Use \`env_usage\` for names, locations, required, documented, example exists.

Do not print \`.env\` contents. Do not log tokens, passwords, or connection strings.`,
  ],
  [
    "09-runtime-awareness.mdc",
    "Check Stackglass-managed runtime status before assuming servers are up.",
    `# Runtime awareness

Call \`runtime_status\` and \`runtime_logs\` for processes launched or registered through Stackglass.

Do not assume a dev server is running. Unavailable is a valid state.`,
  ],
  [
    "10-git-awareness.mdc",
    "Use git_change_summary and git_history_context instead of guessing diffs.",
    `# Git awareness

Call \`git_change_summary\` for the working tree and \`git_history_context\` when asking when/why something changed.

Do not assume the newest commit caused a failure.`,
  ],
  [
    "11-documentation-consistency.mdc",
    "Check README and docs against project reality after command or config changes.",
    `# Documentation consistency

After changing scripts, packages, ports, or commands, call \`docs_check\`.

If the README documents a command that no longer exists, report a documentation mismatch.`,
  ],
  [
    "12-contract-safety.mdc",
    "Verify public contracts before changing exported behavior.",
    `# Contract safety

Before changing public behavior:

1. capture current contract
2. analyze the change
3. compare (\`contract_verify\`)
4. identify breakage
5. verify intended behavior`,
  ],
  [
    "13-regression-awareness.mdc",
    "Treat returning failures as possible regressions with evidence.",
    `# Regression awareness

If an error previously disappeared and returns later, mark Possible regression.

Provide: last seen, last resolved, relevant commits, changed files. Use \`error_trace\`.`,
  ],
  [
    "14-scope-control.mdc",
    "Keep changes scoped to the hypothesis and related tests.",
    `# Scope control

Change only what the evidence supports. Do not refactor unrelated files while investigating a failure.

If reproduction cannot be achieved, say so explicitly.`,
  ],
  [
    "15-release-safety.mdc",
    "Never publish automatically. Use release_readiness instead.",
    `# Release safety

Never publish automatically.

Stackglass may prepare a release via \`release_readiness\`. Publishing requires deliberate user action.`,
  ],
];

for (const [name, description, body] of rules) {
  write(`rules/${name}`, `---\ndescription: ${description}\nalwaysApply: true\n---\n\n${body}\n`);
}

const skills = [
  [
    "failure-investigator",
    "Investigates test and runtime failures with Stackglass evidence. Use when tests fail, builds fail, or the user asks why something broke.",
    `# Failure Investigator

## Workflow

Capture failure → Fingerprint → Find source → Find related tests → Inspect timeline → Inspect Git history → Inspect recent changes → Hypothesis → Reproduce → Minimal fix → Verify

## Tools

project_snapshot, test_failure_analyze, error_analyze, error_trace, project_activity_timeline, git_change_summary, code_context, test_run

Reproduce before fixing. If reproduction fails, say so.`,
  ],
  [
    "regression-hunter",
    "Finds when a failure last passed and ranks suspicious changes. Use for regressions, 'this used to work', or returning errors.",
    `# Regression Hunter

identify last passing state → find range of changes → rank suspicious changes → test hypothesis → identify regression source

Do not assume the newest commit is responsible.

Tools: error_trace, git_history_context, project_activity_timeline, git_change_summary, test_run`,
  ],
  [
    "test-architect",
    "Designs a verification plan for a feature or change. Use when adding features or asking which tests to write.",
    `# Test Architect

identify behavior → boundaries → failure states → contract → test plan

Recommend unit, integration, contract, and end-to-end only where justified.

Tools: change_impact, test_plan, test_discover, contract_verify`,
  ],
  [
    "flake-hunter",
    "Identifies unstable tests using history and controlled repeats. Use when a test is flaky or intermittent.",
    `# Flake Hunter

identify unstable test → collect history → repeat under control → compare failures → inspect timing/concurrency/shared state → report probable source

Never label a test flaky from one failure.

Tools: test_failure_analyze, project_activity_timeline. CLI: glass test flakes`,
  ],
  [
    "coverage-analyst",
    "Inspects coverage and changed-code coverage without inventing numbers. Use when asking if new code is tested.",
    `# Coverage Analyst

Call coverage_inspect. If availability is no_data, say coverage is unavailable.

Prefer changed-code coverage over global percentages. Identify the baseline used for regressions.`,
  ],
  [
    "contract-guardian",
    "Guards public API and schema changes. Use before changing exports, HTTP APIs, OpenAPI, or CLI output.",
    `# Contract Guardian

capture current contract → analyze change → compare → identify breakage → verify intended behavior

Tools: contract_verify, change_impact, docs_check`,
  ],
  [
    "runtime-investigator",
    "Inspects Stackglass-managed processes and sanitized logs. Use when a dev server crashed or logs are needed.",
    `# Runtime Investigator

Only processes launched or registered through Stackglass have rich management.

Tools: runtime_status, runtime_logs, error_analyze`,
  ],
  [
    "configuration-auditor",
    "Audits configuration drift between package manifests, CI, README, and env examples. Use for config bugs and Node version mismatches.",
    `# Configuration Auditor

Tools: config_audit, env_usage, docs_check

Never print secret values.`,
  ],
  [
    "documentation-verifier",
    "Checks README and docs against scripts, files, and package names. Use when docs look stale.",
    `# Documentation Verifier

Tools: docs_check, config_audit

Report documentation mismatches with the document path and the missing reference.`,
  ],
  [
    "release-inspector",
    "Runs release readiness and lists blockers. Use before tagging or publishing. Never publish automatically.",
    `# Release Inspector

Call release_readiness. Summarize blockers and warnings.

Never publish. Publishing requires deliberate user action.`,
  ],
];

for (const [name, description, body] of skills) {
  const skill = `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}\n`;
  write(`skills/${name}/SKILL.md`, skill);
}

console.log("wrote rules and skills");
