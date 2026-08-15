---
name: stackglass-verify
description: Verify the current working-tree change with a targeted GlassLab plan.
---

1. `git_change_summary`
2. `change_impact`
3. `test_plan`
4. `test_run` with mode `related` unless the user asked for workspace
5. `docs_check` if scripts or README-facing files changed
6. `contract_verify` if public surface changed

Do not claim PASS unless tests actually ran and passed.
