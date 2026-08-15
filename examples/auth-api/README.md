# Auth API demo

Demonstration project for Stackglass.

## Scenario

A developer changes `src/auth/token.ts` (here `token.js`) from milliseconds to seconds. Two tests fail. Cursor asks Stackglass:

1. `project_snapshot`
2. `project_activity_timeline`
3. `test_failure_analyze`
4. `git_change_summary`
5. `error_trace`

Evidence: expiry unit changed; tests still expect milliseconds; the same function feeds the public session payload, so a contract check is also relevant.

Then: `test_plan` → `test_run` → `contract_verify` → `release_readiness`.

This README is the real project README for the example. Commands:

```bash
node --test
```
