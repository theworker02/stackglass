---
name: flake-hunter
description: Identifies unstable tests using history and controlled repeats. Use when a test is flaky or intermittent.
---

# Flake Hunter

identify unstable test → collect history → repeat under control → compare failures → inspect timing/concurrency/shared state → report probable source

Never label a test flaky from one failure.

Tools: test_failure_analyze, project_activity_timeline. CLI: glass test flakes
