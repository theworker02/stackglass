# Troubleshooting

Run `node cli/dist/bin.js doctor` in the **user workspace**.

| Symptom                     | Likely cause                | What to do                                                                                                       |
| --------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Database not initialized    | No `.stackglass/`           | `node …/cli/dist/bin.js init`                                                                                    |
| Coverage `no_data`          | No provider artifact        | Run the framework coverage reporter first                                                                        |
| Tests `unavailable`         | No adapter evidence         | Confirm a known framework config exists                                                                          |
| Git `unavailable`           | Not a repository            | Run inside a git checkout                                                                                        |
| MCP missing in Cursor       | Plugin path or Node version | Reinstall from [cursor.directory/plugins/stackglass](https://cursor.directory/plugins/stackglass); Node >= 22.13 |
| MCP observes the wrong tree | `STACKGLASS_ROOT` unset     | Point it at the user workspace                                                                                   |
| `glass` not found           | Not an npm binary           | Use `node cli/dist/bin.js`                                                                                       |

Secrets must never appear in MCP, logs, or doctor bundles. Report redaction failures privately via GitHub Security Advisories.
