---
name: failure-investigator
description: Investigates test and runtime failures with Stackglass evidence. Use when tests fail, builds fail, or the user asks why something broke.
---

# Failure Investigator

## Workflow

Capture failure → Fingerprint → Find source → Find related tests → Inspect timeline → Inspect Git history → Inspect recent changes → Hypothesis → Reproduce → Minimal fix → Verify

## Tools

project_snapshot, test_failure_analyze, error_analyze, error_trace, project_activity_timeline, git_change_summary, code_context, test_run

Reproduce before fixing. If reproduction fails, say so.
