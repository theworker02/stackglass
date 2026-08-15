import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { STACKGLASS_VERSION } from "./protocol.ts";
import type { DoctorCheck, DoctorReport } from "./protocol.ts";
import { stackglassDir } from "./paths.ts";

export function doctor(root: string): DoctorReport {
  const checks: DoctorCheck[] = [];
  checks.push({
    id: "version",
    label: "Stackglass version",
    status: "pass",
    detail: STACKGLASS_VERSION,
  });
  const nodeOk = Boolean(process.versions.node);
  checks.push({
    id: "node",
    label: "Node runtime",
    status: nodeOk ? "pass" : "fail",
    detail: `Node ${process.versions.node} (${process.platform})`,
  });
  const db = path.join(stackglassDir(root), "stackglass.db");
  checks.push({
    id: "database",
    label: "Database",
    status: existsSync(db) ? "pass" : "warning",
    detail: existsSync(db) ? db : "Not initialized. Run glass init.",
  });
  checks.push({
    id: "index",
    label: "Project index",
    status: existsSync(path.join(stackglassDir(root), "project.json")) ? "pass" : "warning",
    detail: existsSync(path.join(stackglassDir(root), "project.json"))
      ? "project.json present"
      : "Index not initialized",
  });
  const mcp = inspectMcp(root);
  checks.push({
    id: "mcp",
    label: "MCP",
    status: mcp.ok ? "pass" : "warning",
    detail: mcp.detail,
  });
  checks.push({
    id: "permissions",
    label: "Permissions",
    status: "pass",
    detail: "Local workspace access only. No remote upload.",
  });
  const cursor = inspectCursor(root);
  checks.push({
    id: "cursor",
    label: "Cursor integration",
    status: cursor.ok ? "pass" : "warning",
    detail: cursor.detail,
  });
  return {
    version: STACKGLASS_VERSION,
    node: process.versions.node,
    checks,
    ok: !checks.some((c) => c.status === "fail"),
  };
}

function inspectMcp(root: string): { ok: boolean; detail: string } {
  const configFiles = [
    path.join(root, ".cursor", "mcp.json"),
    path.join(root, "mcp.json"),
    path.join(root, ".mcp.json"),
  ];
  for (const file of configFiles) {
    if (!existsSync(file)) continue;
    try {
      const text = readFileSync(file, "utf8");
      if (/stackglass/i.test(text)) {
        return {
          ok: true,
          detail: `stackglass mentioned in ${path.basename(path.dirname(file))}/${path.basename(file)}`,
        };
      }
    } catch {
      /* unreadable */
    }
  }
  if (existsSync(path.join(root, "scripts", "stackglass-mcp.mjs"))) {
    return { ok: true, detail: "Stackglass MCP launcher present in this checkout" };
  }
  if (
    existsSync(path.join(root, "servers", "mcp", "dist", "bin.js")) ||
    existsSync(path.join(root, "servers", "mcp", "dist", "index.js"))
  ) {
    return { ok: true, detail: "stackglass-mcp build artifact present in this checkout" };
  }
  return {
    ok: false,
    detail:
      "No MCP config mentioning stackglass and no local Stackglass MCP build. Clone this repo, run npm install && npm run build, then install the Cursor plugin from the checkout.",
  };
}

function inspectCursor(root: string): { ok: boolean; detail: string } {
  const rule = path.join(root, ".cursor", "rules", "01-observe-before-changing.mdc");
  if (existsSync(rule)) {
    return { ok: true, detail: "Cursor rules installed under .cursor/rules" };
  }
  const pluginManifest = path.join(root, ".cursor-plugin", "plugin.json");
  if (existsSync(pluginManifest)) {
    try {
      const manifest = JSON.parse(readFileSync(pluginManifest, "utf8")) as { name?: string };
      if (manifest.name === "stackglass") {
        return { ok: true, detail: "Cursor plugin source present in this checkout" };
      }
    } catch {
      /* ignore invalid manifests */
    }
  }
  return {
    ok: false,
    detail: "No Stackglass Cursor rules in this workspace. Run glass init to install them.",
  };
}

export function writeDoctorBundle(root: string, report: DoctorReport): string {
  const dir = path.join(stackglassDir(root), "cache", "doctor");
  mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `bundle-${Date.now()}.json`);
  writeFileSync(
    dest,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        report,
        platform: process.platform,
        arch: process.arch,
        node: process.versions.node,
        note: "This bundle excludes source code and secret values.",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return dest;
}

export function readJsonSafe<T>(file: string): T | undefined {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return undefined;
  }
}
