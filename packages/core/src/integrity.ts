import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { GlassIndex } from "./index-engine.ts";
import { readTextIfSafe } from "./fs-scan.ts";
import { looksLikeSecretKey } from "./security.ts";
import type {
  ConfigAuditResult,
  ConfigFinding,
  DocsCheckResult,
  DocsMismatch,
  DocsRelationship,
  EnvUsageReport,
  EnvVariableUsage,
  ReleaseCheck,
  ReleaseReadiness,
} from "./protocol.ts";
import type { GitIdentity, GitChangeSummary } from "./protocol.ts";
import type { TestRunResult } from "./protocol.ts";

export function auditConfig(root: string, index: GlassIndex): ConfigAuditResult {
  const findings: ConfigFinding[] = [];
  const categories: Record<string, string[]> = {
    "Package Managers": [],
    Build: [],
    Tests: [],
    Lint: [],
    Formatting: [],
    "Type Checking": [],
    Environment: [],
    Runtime: [],
    CI: [],
    Stackglass: [],
  };
  const idx = index.get();
  const pkgPath = path.join(root, "package.json");
  let pkg:
    | {
        engines?: { node?: string };
        scripts?: Record<string, string>;
        packageManager?: string;
      }
    | undefined;
  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as typeof pkg;
    } catch {
      findings.push({
        severity: "error",
        code: "package-json-invalid",
        message: "package.json is not valid JSON.",
        files: ["package.json"],
      });
    }
  }
  const lockfiles = [
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lock",
    "bun.lockb",
  ].filter((f) => existsSync(path.join(root, f)));
  if (lockfiles.length > 1) {
    findings.push({
      severity: "warning",
      code: "multiple-lockfiles",
      message: `Multiple package manager lockfiles present: ${lockfiles.join(", ")}.`,
      files: lockfiles,
    });
  }
  categories["Package Managers"] = lockfiles.length ? lockfiles : pkg ? ["package.json"] : [];

  if (pkg?.scripts) {
    categories.Build = Object.keys(pkg.scripts).filter((s) => /build/.test(s));
    categories.Tests = Object.keys(pkg.scripts).filter((s) => /test/.test(s));
    categories.Lint = Object.keys(pkg.scripts).filter((s) => /lint/.test(s));
    categories.Formatting = Object.keys(pkg.scripts).filter((s) => /format|prettier/.test(s));
    categories["Type Checking"] = Object.keys(pkg.scripts).filter((s) =>
      /typecheck|type-check|tsc/.test(s),
    );
  }

  const ciFiles = idx.files
    .filter(
      (f) =>
        f.relativePath.startsWith(".github/workflows/") || f.relativePath.startsWith(".gitlab-ci"),
    )
    .map((f) => f.relativePath);
  categories.CI = ciFiles;
  const engine = pkg?.engines?.node;
  if (engine && ciFiles.length) {
    for (const ci of ciFiles) {
      const text = readTextIfSafe(root, ci) ?? "";
      const nodeVersions = [...text.matchAll(/node(?:-version)?\s*[:=]\s*['"]?(\d+)/gi)].map(
        (m) => m[1],
      );
      const wanted = engine.match(/\d+/)?.[0];
      if (wanted && nodeVersions.length && !nodeVersions.includes(wanted)) {
        findings.push({
          severity: "warning",
          code: "node-engine-ci-mismatch",
          message: `package.json engines.node is ${engine} but ${ci} uses Node ${nodeVersions.join(", ")}.`,
          files: ["package.json", ci],
        });
      }
    }
  }

  const readme = readTextIfSafe(root, "README.md") ?? "";
  const portReadme = readme.match(/localhost:(\d+)/)?.[1];
  const vite =
    readTextIfSafe(root, "vite.config.ts") ?? readTextIfSafe(root, "vite.config.js") ?? "";
  const vitePort = vite.match(/port:\s*(\d+)/)?.[1];
  if (portReadme && vitePort && portReadme !== vitePort) {
    findings.push({
      severity: "warning",
      code: "port-docs-mismatch",
      message: `README mentions port ${portReadme} but Vite defaults to ${vitePort}.`,
      files: ["README.md", "vite.config.ts"],
    });
  }

  if (existsSync(path.join(root, ".stackglass", "config.json"))) {
    categories.Stackglass = categories.Stackglass ?? [];
    categories.Stackglass.push(".stackglass/config.json");
  } else {
    findings.push({
      severity: "info",
      code: "stackglass-uninitialized",
      message: "Stackglass has not been initialized in this workspace. Run `glass init`.",
      files: [],
    });
  }

  categories.Environment = [".env.example", ".env"].filter((f) => existsSync(path.join(root, f)));
  categories.Runtime = idx.packages.flatMap((p) =>
    p.scripts.filter((s) => /dev|start|serve/.test(s)),
  );

  return { findings, categories };
}

export function envUsage(root: string, index: GlassIndex): EnvUsageReport {
  const idx = index.get();
  const names = new Map<string, EnvVariableUsage>();
  const example = readTextIfSafe(root, ".env.example") ?? readTextIfSafe(root, ".env.sample") ?? "";
  const documented = new Set<string>();
  for (const line of example.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z][A-Z0-9_]+)=/);
    if (m?.[1]) {
      documented.add(m[1]);
      names.set(m[1], {
        name: m[1],
        locations: [".env.example"],
        required: true,
        documented: true,
        exampleExists: true,
        defined: true,
      });
    }
  }
  const readme = readTextIfSafe(root, "README.md") ?? "";
  for (const match of readme.matchAll(/\b([A-Z][A-Z0-9_]{2,})\b/g)) {
    const name = match[1]!;
    if (!looksLikeSecretKey(name) && !/^[A-Z_]+$/.test(name)) continue;
    if (name.length < 4) continue;
  }
  const envRe =
    /(?:process\.env|os\.environ|std::env|env::var|Environment\.GetEnvironmentVariable)\[['"]?([A-Z][A-Z0-9_]+)/g;
  const simpleRe = /process\.env\.([A-Z][A-Z0-9_]+)/g;
  for (const file of idx.sourceFiles.concat(idx.configuration)) {
    const text = readTextIfSafe(root, file);
    if (!text) continue;
    for (const re of [envRe, simpleRe]) {
      re.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = re.exec(text))) {
        const name = match[1]!;
        const current = names.get(name) ?? {
          name,
          locations: [],
          required: false,
          documented: documented.has(name),
          exampleExists: documented.has(name),
          defined: documented.has(name),
        };
        if (!current.locations.includes(file)) current.locations.push(file);
        names.set(name, current);
      }
    }
  }
  for (const [name, usage] of names) {
    if (usage.defined && usage.locations.filter((l) => l !== ".env.example").length === 0) {
      usage.required = true;
    }
    void name;
  }
  return { variables: [...names.values()].sort((a, b) => a.name.localeCompare(b.name)) };
}

export function docsCheck(root: string, index: GlassIndex): DocsCheckResult {
  const idx = index.get();
  const mismatches: DocsMismatch[] = [];
  const relationships: DocsRelationship[] = [];
  const docs = ["README.md", ...idx.documentation.filter((d) => d.endsWith(".md"))].filter(
    (f, i, arr) => arr.indexOf(f) === i,
  );
  const scripts = idx.scripts;
  const files = new Set(idx.files.map((f) => f.relativePath));

  for (const doc of docs) {
    const text = readTextIfSafe(root, doc);
    if (!text) continue;
    relationships.push({ document: doc, kind: "file", target: doc });
    const commands = [
      ...text.matchAll(/`((?:pnpm|npm|yarn|bun|glass|stackglass|cargo|go|pytest)[^\n`]*)`/g),
    ];
    for (const match of commands) {
      const cmd = match[1] ?? "";
      relationships.push({ document: doc, kind: "command", target: cmd });
      const script = cmd.match(/(?:pnpm|npm run|yarn|bun run)\s+([A-Za-z0-9:_-]+)/)?.[1];
      if (
        script &&
        Object.keys(scripts).length &&
        !(script in scripts) &&
        !["install", "ci", "test", "run"].includes(script)
      ) {
        mismatches.push({
          severity: "warning",
          document: doc,
          message: `Documented command references script "${script}" which is not in package.json.`,
          reference: cmd,
        });
      }
    }
    for (const match of text.matchAll(
      /(?:^|\s)([A-Za-z0-9_./-]+\.(?:ts|js|py|rs|go|json|yml|yaml))\b/g,
    )) {
      const ref = match[1]!;
      if (ref.startsWith("http")) continue;
      relationships.push({ document: doc, kind: "file", target: ref });
      const normalized = ref.replace(/^\.\//, "");
      if (!files.has(normalized) && !existsSync(path.join(root, normalized))) {
        if (!ref.includes("*") && !ref.startsWith("src/auth/token")) {
          mismatches.push({
            severity: "info",
            document: doc,
            message: `Referenced file ${ref} was not found in the index.`,
            reference: ref,
          });
        }
      }
    }
    for (const pkg of idx.packages) {
      if (text.includes(pkg.name)) {
        relationships.push({ document: doc, kind: "package", target: pkg.name });
      }
    }
  }
  return { mismatches, relationships };
}

export function releaseReadiness(input: {
  git: GitIdentity;
  changes: GitChangeSummary;
  lastTest?: TestRunResult;
  docs: DocsCheckResult;
  config: ConfigAuditResult;
  changelogExists: boolean;
  version?: string;
}): ReleaseReadiness {
  const checks: ReleaseCheck[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];

  const gitCheck: ReleaseCheck = {
    id: "git",
    label: "Git state",
    status: input.git.available ? (input.git.dirty ? "warning" : "pass") : "unavailable",
    detail: input.git.available
      ? input.git.dirty
        ? "Working tree has uncommitted changes."
        : `Clean on ${input.git.branch ?? "unknown"} @ ${input.git.commitShort ?? "?"}`
      : "Not a git repository.",
  };
  checks.push(gitCheck);
  if (gitCheck.status === "warning") warnings.push(gitCheck.detail ?? "");

  const testCheck: ReleaseCheck = input.lastTest
    ? {
        id: "tests",
        label: "Tests",
        status:
          input.lastTest.status === "pass"
            ? "pass"
            : input.lastTest.status === "unavailable"
              ? "unavailable"
              : "fail",
        detail: `${input.lastTest.summary.passed} passed, ${input.lastTest.summary.failed} failed`,
      }
    : { id: "tests", label: "Tests", status: "not_run", detail: "No stored test run." };
  checks.push(testCheck);
  if (testCheck.status === "fail") blockers.push("Tests are failing.");
  if (testCheck.status === "not_run")
    warnings.push("Tests have not been run in this Stackglass session.");

  checks.push({
    id: "build",
    label: "Build",
    status: "not_run",
    detail: "Build is reported only after a Stackglass-managed build command.",
  });
  checks.push({
    id: "docs",
    label: "Documentation",
    status: input.docs.mismatches.some((m) => m.severity === "error")
      ? "fail"
      : input.docs.mismatches.length
        ? "warning"
        : "pass",
    detail: `${input.docs.mismatches.length} documentation finding(s).`,
  });
  checks.push({
    id: "config",
    label: "Configuration",
    status: input.config.findings.some((f) => f.severity === "error")
      ? "fail"
      : input.config.findings.some((f) => f.severity === "warning")
        ? "warning"
        : "pass",
  });
  checks.push({
    id: "changelog",
    label: "Changelog",
    status: input.changelogExists ? "pass" : "warning",
    detail: input.changelogExists ? "CHANGELOG.md present." : "CHANGELOG.md not found.",
  });
  checks.push({
    id: "version",
    label: "Version",
    status: input.version ? "pass" : "warning",
    detail: input.version ?? "No package version detected.",
  });
  checks.push({
    id: "publish",
    label: "Publish",
    status: "skip",
    detail: "Stackglass never publishes automatically. Publishing requires deliberate user action.",
  });

  const ready = blockers.length === 0 && checks.every((c) => c.status !== "fail");
  return { ready, checks, blockers, warnings: warnings.filter(Boolean) };
}

export function listDirSafe(root: string): string[] {
  try {
    return readdirSync(root);
  } catch {
    return [];
  }
}
