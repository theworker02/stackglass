# Security Policy

## Reporting a vulnerability

Report security issues privately via GitHub Security Advisories on [theworker02/stackglass](https://github.com/theworker02/stackglass/security/advisories/new).

Do not file public issues for vulnerabilities that expose secrets, execute untrusted code unsafely, or bypass redaction.

## Supported releases

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |
| < 1.0   | No        |

## Secret handling

Stackglass must not index, log, store, or return secret values through MCP, CLI, diagnostics, or timeline metadata.

Sensitive path patterns include `.env`, `*.pem`, `*.key`, `credentials*`, `secrets*`, and `id_rsa*`.

`env_usage` reports names and locations only.

## MCP permissions

The MCP server is a local stdio process. It can read the workspace and run test/build commands requested through GlassLab. It does not send source to a Stackglass cloud service.

## Process execution

Commands run in the workspace with timeouts and cancellation. Mutation testing uses a temporary copy and deletes it afterward. The working tree is not permanently mutated.

## Diagnostics privacy

`glass doctor bundle` excludes source code and secret values by default.

## Responsible disclosure

We will acknowledge reports, identify a fix, and credit reporters who want credit after a release is available.
