import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

export function tempDir(prefix = "stackglass-"): string {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

export function write(root: string, relative: string, contents: string): void {
  const abs = path.join(root, relative);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, contents, "utf8");
}

export function makeTsProject(options?: { git?: boolean }): string {
  const root = tempDir();
  write(
    root,
    "package.json",
    JSON.stringify(
      {
        name: "fixture-app",
        version: "1.0.0",
        type: "module",
        scripts: { test: "vitest run", typecheck: "tsc --noEmit", "dev:web": "vite" },
        devDependencies: { vitest: "^3.0.0" },
        engines: { node: ">=22" },
      },
      null,
      2,
    ),
  );
  write(
    root,
    "src/auth/token.ts",
    `export function tokenExpiry(ms: number): number {
  return Date.now() + ms;
}
`,
  );
  write(
    root,
    "src/auth/token.test.ts",
    `import { describe, it, expect } from "vitest";
import { tokenExpiry } from "./token.ts";

describe("tokenExpiry", () => {
  it("adds milliseconds", () => {
    const now = Date.now();
    expect(tokenExpiry(1000)).toBeGreaterThanOrEqual(now);
  });
});
`,
  );
  write(root, "README.md", "# Fixture\n\nRun `pnpm dev:web` and `pnpm test`.\n");
  write(root, ".env.example", "DATABASE_URL=\nAPI_TOKEN=\n");
  write(root, "src/db.ts", `export const url = process.env.DATABASE_URL;\n`);
  if (options?.git !== false) {
    try {
      execSync("git init", { cwd: root, stdio: "ignore" });
      execSync('git config user.email "test@example.com"', { cwd: root, stdio: "ignore" });
      execSync('git config user.name "Stackglass Tests"', { cwd: root, stdio: "ignore" });
      execSync("git add .", { cwd: root, stdio: "ignore" });
      execSync('git commit -m "init"', { cwd: root, stdio: "ignore" });
    } catch {
      /* git optional */
    }
  }
  return root;
}

export function cleanup(root: string): void {
  rmSync(root, { recursive: true, force: true });
}
