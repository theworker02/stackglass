---
name: regression-hunter
description: Finds when a failure last passed and ranks suspicious changes. Use for regressions, 'this used to work', or returning errors.
---

# Regression Hunter

identify last passing state → find range of changes → rank suspicious changes → test hypothesis → identify regression source

Do not assume the newest commit is responsible.

Tools: error_trace, git_history_context, project_activity_timeline, git_change_summary, test_run
