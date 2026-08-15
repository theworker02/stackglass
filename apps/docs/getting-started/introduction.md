# Introduction

Stackglass is a local-first developer observability and verification platform for Cursor.

It is **not** an AI that writes code. Cursor already provides the coding agent. Stackglass gives that agent evidence about project state, tests, failures, history, configuration, contracts, and documentation.

The defining principle: **give coding agents evidence instead of forcing them to guess.**

Install the Cursor plugin: [https://cursor.directory/plugins/stackglass](https://cursor.directory/plugins/stackglass)

## What it is

A flight recorder, testing laboratory (GlassLab), change inspector, MCP server with **exactly 22 tools**, Cursor plugin, GlassLens, and a local dashboard. Version **1.1.0**.

## What it is not

Not a coding assistant. Not an npm package (`bin`, `npm link`, and `npm publish` are not part of this project). Not a 23rd MCP tool. Not a cloud that uploads source. `release_readiness` never publishes.

Missing data is reported as `no_data`, `unavailable`, or `not_configured`. Stackglass will not invent coverage or test results.
