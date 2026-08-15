import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { runCommand, shellCommand, type CommandResult } from "./process.ts";
import type { CancellationToken } from "./cancel.ts";
import type {
  DetectedFramework,
  TestCase,
  TestFailure,
  TestRunResult,
  TestStatus,
} from "./protocol.ts";
import { fingerprintText, redactSecrets } from "./security.ts";
import { readTextIfSafe } from "./fs-scan.ts";
import { toPosix } from "./paths.ts";

export interface TestAdapter {
  id: string;
  name: string;
  detect(root: string): DetectedFramework;
  discover(root: string, files: string[]): TestCase[];
  run(options: AdapterRunOptions): Promise<TestRunResult>;
}

export interface AdapterRunOptions {
  root: string;
  files?: string[];
  namePattern?: string;
  timeoutMs: number;
  token?: CancellationToken;
  extraArgs?: string[];
}

export function defineTestAdapter(adapter: TestAdapter): TestAdapter {
  return adapter;
}

function framework(
  id: string,
  name: string,
  available: boolean,
  configFiles: string[],
  command?: string,
): DetectedFramework {
  return { id, name, available, configFiles, command };
}

function fileExists(root: string, names: string[]): string[] {
  return names.filter((n) => existsSync(path.join(root, n)));
}

function parseJsTests(file: string, text: string, frameworkId: string): TestCase[] {
  const cases: TestCase[] = [];
  const re =
    /(?:describe|suite)\(\s*['"`]([^'"`]+)['"`]|((?:it|test|it\.only|test\.only)\(\s*['"`]([^'"`]+)['"`])/g;
  let currentSuite: string | undefined;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match[1] && !match[2]) {
      currentSuite = match[1];
      continue;
    }
    const name = match[3];
    if (!name) continue;
    const id = `${frameworkId}:${file}:${currentSuite ?? ""}:${name}`;
    cases.push({
      id,
      name: currentSuite ? `${currentSuite} ${name}` : name,
      suite: currentSuite,
      file,
      framework: frameworkId,
      status: "not_run",
    });
  }
  if (cases.length === 0) {
    cases.push({
      id: `${frameworkId}:${file}`,
      name: path.posix.basename(file),
      file,
      framework: frameworkId,
      status: "not_run",
    });
  }
  return cases;
}

function parsePythonTests(file: string, text: string): TestCase[] {
  const cases: TestCase[] = [];
  const re = /^(?:async\s+)?def\s+(test_[A-Za-z0-9_]+)/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const name = match[1]!;
    cases.push({
      id: `pytest:${file}:${name}`,
      name,
      file,
      framework: "pytest",
      status: "not_run",
    });
  }
  return cases.length
    ? cases
    : [
        {
          id: `pytest:${file}`,
          name: path.posix.basename(file),
          file,
          framework: "pytest",
          status: "not_run",
        },
      ];
}

function baseResult(
  id: string,
  mode: TestRunResult["mode"],
  startedAt: string,
  status: TestRunResult["status"],
): Omit<TestRunResult, "finishedAt" | "summary" | "cases" | "failures"> {
  return { id, startedAt, mode, status };
}

function finish(
  partial: Omit<TestRunResult, "finishedAt" | "summary"> & { startedAt: string },
  cases: TestCase[],
  failures: TestFailure[],
  durationMs: number,
): TestRunResult {
  const passed = cases.filter((c) => c.status === "pass").length;
  const failed = cases.filter((c) => c.status === "fail").length;
  const skipped = cases.filter((c) => c.status === "skip").length;
  return {
    ...partial,
    finishedAt: new Date().toISOString(),
    summary: {
      total: cases.length,
      passed,
      failed,
      skipped,
      durationMs,
    },
    cases,
    failures,
  };
}

async function which(root: string, bin: string): Promise<boolean> {
  const result = await runCommand(process.platform === "win32" ? "where" : "which", [bin], {
    cwd: root,
    timeoutMs: 5_000,
  }).catch(() => undefined);
  return result?.exitCode === 0;
}

export const vitestAdapter = defineTestAdapter({
  id: "vitest",
  name: "Vitest",
  detect(root) {
    const configs = fileExists(root, [
      "vitest.config.ts",
      "vitest.config.js",
      "vitest.config.mts",
      "vite.config.ts",
      "vite.config.js",
    ]);
    const pkg = readPackage(root);
    const hasDep = Boolean(pkg?.devDependencies?.vitest || pkg?.dependencies?.vitest);
    const available = configs.length > 0 || hasDep;
    return framework(
      "vitest",
      "Vitest",
      available,
      configs,
      available ? "npx vitest run" : undefined,
    );
  },
  discover(root, files) {
    const testFiles = files.filter((f) => /\.(test|spec)\.(ts|tsx|js|jsx|mts|cts)$/.test(f));
    const cases: TestCase[] = [];
    for (const file of testFiles) {
      const text = readTextIfSafe(root, file) ?? "";
      cases.push(...parseJsTests(file, text, "vitest"));
    }
    return cases;
  },
  async run(options) {
    const startedAt = new Date().toISOString();
    const args = ["vitest", "run", "--reporter=json", "--reporter=default"];
    if (options.files?.length) args.push(...options.files);
    if (options.namePattern) args.push("-t", options.namePattern);
    const result = await runNpm(options.root, args, options.timeoutMs, options.token);
    const parsed = parseVitestJson(result.stdout) ?? parseVitestJson(extractJson(result.stdout));
    if (!parsed) {
      const fallbackCases = (options.files ?? []).map((file) => ({
        id: `vitest:${file}`,
        name: file,
        file,
        framework: "vitest" as const,
        status: (result.exitCode === 0 ? "pass" : "fail") as TestStatus,
        duration: result.durationMs,
      }));
      const failures: TestFailure[] =
        result.exitCode === 0
          ? []
          : fallbackCases.map((c) => failureFrom(c, result.stderr || result.stdout));
      return finish(
        {
          ...baseResult(
            `run-${Date.now()}`,
            "workspace",
            startedAt,
            result.timedOut ? "error" : result.exitCode === 0 ? "pass" : "fail",
          ),
          cases: fallbackCases,
          failures,
          outputExcerpt: excerpt(result),
        },
        fallbackCases,
        failures,
        result.durationMs,
      );
    }
    return parsedToRun(parsed, startedAt, result);
  },
});

export const jestAdapter = defineTestAdapter({
  id: "jest",
  name: "Jest",
  detect(root) {
    const configs = fileExists(root, [
      "jest.config.ts",
      "jest.config.js",
      "jest.config.cjs",
      "jest.config.mjs",
    ]);
    const pkg = readPackage(root);
    const available =
      configs.length > 0 ||
      Boolean(pkg?.devDependencies?.jest || pkg?.scripts?.test?.includes("jest"));
    return framework("jest", "Jest", available, configs, available ? "npx jest" : undefined);
  },
  discover(root, files) {
    const testFiles = files.filter((f) => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f));
    const cases: TestCase[] = [];
    for (const file of testFiles) {
      cases.push(...parseJsTests(file, readTextIfSafe(root, file) ?? "", "jest"));
    }
    return cases;
  },
  async run(options) {
    const startedAt = new Date().toISOString();
    const args = ["jest", "--json", "--forceExit"];
    if (options.files?.length) args.push(...options.files);
    const result = await runNpm(options.root, args, options.timeoutMs, options.token);
    const json = parseJsonBlob(result.stdout);
    const cases: TestCase[] = [];
    const failures: TestFailure[] = [];
    if (json && Array.isArray((json as { testResults?: unknown }).testResults)) {
      const tr = json as {
        testResults: Array<{
          name: string;
          assertionResults?: Array<{
            fullName: string;
            title: string;
            status: string;
            duration?: number;
            failureMessages?: string[];
          }>;
        }>;
      };
      for (const file of tr.testResults) {
        const rel = toPosix(path.relative(options.root, file.name));
        for (const assertion of file.assertionResults ?? []) {
          const status: TestStatus =
            assertion.status === "passed"
              ? "pass"
              : assertion.status === "pending"
                ? "skip"
                : "fail";
          const testCase: TestCase = {
            id: `jest:${rel}:${assertion.fullName}`,
            name: assertion.fullName || assertion.title,
            file: rel,
            framework: "jest",
            status,
            duration: assertion.duration,
          };
          cases.push(testCase);
          if (status === "fail") {
            failures.push(failureFrom(testCase, (assertion.failureMessages ?? []).join("\n")));
          }
        }
      }
    }
    return finish(
      {
        ...baseResult(
          `run-${Date.now()}`,
          "workspace",
          startedAt,
          result.exitCode === 0 ? "pass" : "fail",
        ),
        cases,
        failures,
        outputExcerpt: excerpt(result),
      },
      cases,
      failures,
      result.durationMs,
    );
  },
});

export const nodeTestAdapter = defineTestAdapter({
  id: "node-test",
  name: "Node Test Runner",
  detect(root) {
    const pkg = readPackage(root);
    const available = Boolean(
      pkg?.scripts?.test?.includes("node --test") || pkg?.scripts?.test?.includes("node:test"),
    );
    return framework(
      "node-test",
      "Node Test Runner",
      available,
      [],
      available ? "node --test" : undefined,
    );
  },
  discover(root, files) {
    const testFiles = files.filter((f) => /\.(test|spec)\.(cjs|mjs|js|ts)$/.test(f));
    return testFiles.flatMap((file) =>
      parseJsTests(file, readTextIfSafe(root, file) ?? "", "node-test"),
    );
  },
  async run(options) {
    const startedAt = new Date().toISOString();
    const files = options.files?.length ? options.files : ["**/*.test.js"];
    const result = await runCommand(process.execPath, ["--test", ...files], {
      cwd: options.root,
      timeoutMs: options.timeoutMs,
      token: options.token,
    });
    const cases: TestCase[] = parseTapish(result.stdout, "node-test");
    const failures = cases
      .filter((c) => c.status === "fail")
      .map((c) => failureFrom(c, result.stderr));
    return finish(
      {
        ...baseResult(
          `run-${Date.now()}`,
          "workspace",
          startedAt,
          result.exitCode === 0 ? "pass" : "fail",
        ),
        cases,
        failures,
        outputExcerpt: excerpt(result),
      },
      cases,
      failures,
      result.durationMs,
    );
  },
});

export const playwrightAdapter = defineTestAdapter({
  id: "playwright",
  name: "Playwright",
  detect(root) {
    const configs = fileExists(root, ["playwright.config.ts", "playwright.config.js"]);
    const pkg = readPackage(root);
    const available = configs.length > 0 || Boolean(pkg?.devDependencies?.["@playwright/test"]);
    return framework(
      "playwright",
      "Playwright",
      available,
      configs,
      available ? "npx playwright test" : undefined,
    );
  },
  discover(root, files) {
    const testFiles = files.filter(
      (f) => /\.(spec|test)\.(ts|js)$/.test(f) && !f.includes("vitest") && !f.includes("jest"),
    );
    return testFiles.flatMap((file) =>
      parseJsTests(file, readTextIfSafe(root, file) ?? "", "playwright"),
    );
  },
  async run(options) {
    const startedAt = new Date().toISOString();
    const args = ["playwright", "test", "--reporter=json"];
    if (options.files?.length) args.push(...options.files);
    const result = await runNpm(options.root, args, options.timeoutMs, options.token);
    const cases: TestCase[] = [];
    const failures: TestFailure[] = [];
    const json = parseJsonBlob(result.stdout) as
      | {
          suites?: Array<{
            file?: string;
            specs?: Array<{
              title: string;
              tests?: Array<{ results?: Array<{ status: string }> }>;
            }>;
          }>;
        }
      | undefined;
    if (json?.suites) {
      for (const suite of json.suites) {
        for (const spec of suite.specs ?? []) {
          const statusRaw = spec.tests?.[0]?.results?.[0]?.status;
          const status: TestStatus =
            statusRaw === "passed" || statusRaw === "expected"
              ? "pass"
              : statusRaw === "skipped"
                ? "skip"
                : "fail";
          const file = toPosix(suite.file ?? options.files?.[0] ?? "unknown");
          const testCase: TestCase = {
            id: `playwright:${file}:${spec.title}`,
            name: spec.title,
            file,
            framework: "playwright",
            status,
          };
          cases.push(testCase);
          if (status === "fail") failures.push(failureFrom(testCase, result.stderr));
        }
      }
    }
    return finish(
      {
        ...baseResult(
          `run-${Date.now()}`,
          "workspace",
          startedAt,
          result.exitCode === 0 ? "pass" : "fail",
        ),
        cases,
        failures,
        outputExcerpt: excerpt(result),
      },
      cases,
      failures,
      result.durationMs,
    );
  },
});

export const cypressAdapter = defineTestAdapter({
  id: "cypress",
  name: "Cypress",
  detect(root) {
    const configs = fileExists(root, ["cypress.config.ts", "cypress.config.js"]);
    const pkg = readPackage(root);
    const available = configs.length > 0 || Boolean(pkg?.devDependencies?.cypress);
    return framework(
      "cypress",
      "Cypress",
      available,
      configs,
      available ? "npx cypress run" : undefined,
    );
  },
  discover(root, files) {
    const testFiles = files.filter(
      (f) => f.includes("cypress/") && /\.(cy|spec)\.(ts|js)$/.test(f),
    );
    return testFiles.flatMap((file) =>
      parseJsTests(file, readTextIfSafe(root, file) ?? "", "cypress"),
    );
  },
  async run(options) {
    const startedAt = new Date().toISOString();
    const result = await runNpm(options.root, ["cypress", "run"], options.timeoutMs, options.token);
    const status = result.exitCode === 0 ? "pass" : "fail";
    const cases: TestCase[] = [
      {
        id: "cypress:run",
        name: "cypress run",
        file: options.files?.[0] ?? "cypress",
        framework: "cypress",
        status,
        duration: result.durationMs,
      },
    ];
    const failures = status === "fail" ? [failureFrom(cases[0]!, excerpt(result))] : [];
    return finish(
      {
        ...baseResult(`run-${Date.now()}`, "workspace", startedAt, status),
        cases,
        failures,
        outputExcerpt: excerpt(result),
      },
      cases,
      failures,
      result.durationMs,
    );
  },
});

export const pytestAdapter = defineTestAdapter({
  id: "pytest",
  name: "pytest",
  detect(root) {
    const configs = fileExists(root, ["pytest.ini", "pyproject.toml", "conftest.py"]);
    const available = configs.length > 0 || existsSync(path.join(root, "tests"));
    return framework(
      "pytest",
      "pytest",
      Boolean(
        available &&
        (existsSync(path.join(root, "pyproject.toml")) ||
          existsSync(path.join(root, "pytest.ini")) ||
          existsSync(path.join(root, "conftest.py"))),
      ),
      configs,
      "pytest",
    );
  },
  discover(root, files) {
    const testFiles = files.filter((f) =>
      /(^|\/)tests?\/.*\.py$|^test_.*\.py$|.*_test\.py$/.test(f),
    );
    return testFiles.flatMap((file) => parsePythonTests(file, readTextIfSafe(root, file) ?? ""));
  },
  async run(options) {
    const startedAt = new Date().toISOString();
    const args = ["-q", "--tb=short"];
    if (options.files?.length) args.push(...options.files);
    const bin = (await which(options.root, "pytest"))
      ? "pytest"
      : process.platform === "win32"
        ? "py"
        : "python3";
    const result =
      bin === "pytest"
        ? await runCommand("pytest", args, {
            cwd: options.root,
            timeoutMs: options.timeoutMs,
            token: options.token,
          })
        : await runCommand(bin, ["-m", "pytest", ...args], {
            cwd: options.root,
            timeoutMs: options.timeoutMs,
            token: options.token,
          });
    const cases = parsePytestOutput(result.stdout + "\n" + result.stderr);
    const failures = cases
      .filter((c) => c.status === "fail")
      .map((c) => failureFrom(c, result.stderr));
    if (cases.length === 0) {
      const status: TestStatus = result.exitCode === 0 ? "pass" : "fail";
      const fallback: TestCase[] = [
        { id: "pytest:session", name: "pytest", file: ".", framework: "pytest", status },
      ];
      const fbFail = status === "fail" ? [failureFrom(fallback[0]!, excerpt(result))] : [];
      return finish(
        {
          ...baseResult(
            `run-${Date.now()}`,
            "workspace",
            startedAt,
            result.exitCode === 0 ? "pass" : "fail",
          ),
          cases: fallback,
          failures: fbFail,
          outputExcerpt: excerpt(result),
        },
        fallback,
        fbFail,
        result.durationMs,
      );
    }
    return finish(
      {
        ...baseResult(
          `run-${Date.now()}`,
          "workspace",
          startedAt,
          result.exitCode === 0 ? "pass" : "fail",
        ),
        cases,
        failures,
        outputExcerpt: excerpt(result),
      },
      cases,
      failures,
      result.durationMs,
    );
  },
});

export const unittestAdapter = defineTestAdapter({
  id: "unittest",
  name: "unittest",
  detect(root) {
    const available =
      existsSync(path.join(root, "tests")) && !existsSync(path.join(root, "pytest.ini"));
    return framework(
      "unittest",
      "unittest",
      available,
      [],
      available ? "python -m unittest" : undefined,
    );
  },
  discover(root, files) {
    return files
      .filter((f) => /test_.*\.py$/.test(f))
      .map((file) => ({
        id: `unittest:${file}`,
        name: path.posix.basename(file),
        file,
        framework: "unittest",
        status: "not_run" as const,
      }));
  },
  async run(options) {
    const startedAt = new Date().toISOString();
    const py = process.platform === "win32" ? "py" : "python3";
    const result = await runCommand(py, ["-m", "unittest", "discover", "-q"], {
      cwd: options.root,
      timeoutMs: options.timeoutMs,
      token: options.token,
    });
    const status = result.exitCode === 0 ? "pass" : "fail";
    const cases: TestCase[] = [
      {
        id: "unittest:discover",
        name: "unittest discover",
        file: ".",
        framework: "unittest",
        status,
      },
    ];
    const failures = status === "fail" ? [failureFrom(cases[0]!, excerpt(result))] : [];
    return finish(
      {
        ...baseResult(`run-${Date.now()}`, "workspace", startedAt, status),
        cases,
        failures,
        outputExcerpt: excerpt(result),
      },
      cases,
      failures,
      result.durationMs,
    );
  },
});

export const cargoAdapter = defineTestAdapter({
  id: "cargo",
  name: "cargo test",
  detect(root) {
    const configs = fileExists(root, ["Cargo.toml"]);
    return framework(
      "cargo",
      "cargo test",
      configs.length > 0,
      configs,
      configs.length ? "cargo test" : undefined,
    );
  },
  discover(root, files) {
    return files
      .filter(
        (f) =>
          f.endsWith(".rs") &&
          (f.includes("/tests/") || /#\[test\]/.test(readTextIfSafe(root, f) ?? "")),
      )
      .map((file) => ({
        id: `cargo:${file}`,
        name: path.posix.basename(file),
        file,
        framework: "cargo",
        status: "not_run" as const,
      }));
  },
  async run(options) {
    const startedAt = new Date().toISOString();
    const result = await runCommand("cargo", ["test", "--", "--nocapture"], {
      cwd: options.root,
      timeoutMs: options.timeoutMs,
      token: options.token,
    });
    const cases = parseCargoTest(result.stdout);
    const failures = cases
      .filter((c) => c.status === "fail")
      .map((c) => failureFrom(c, result.stderr));
    return finish(
      {
        ...baseResult(
          `run-${Date.now()}`,
          "workspace",
          startedAt,
          result.exitCode === 0 ? "pass" : "fail",
        ),
        cases,
        failures,
        outputExcerpt: excerpt(result),
      },
      cases.length
        ? cases
        : [
            {
              id: "cargo:test",
              name: "cargo test",
              file: "Cargo.toml",
              framework: "cargo",
              status: result.exitCode === 0 ? "pass" : "fail",
            },
          ],
      failures,
      result.durationMs,
    );
  },
});

export const goTestAdapter = defineTestAdapter({
  id: "go",
  name: "go test",
  detect(root) {
    const configs = fileExists(root, ["go.mod"]);
    return framework(
      "go",
      "go test",
      configs.length > 0,
      configs,
      configs.length ? "go test ./..." : undefined,
    );
  },
  discover(root, files) {
    return files
      .filter((f) => f.endsWith("_test.go"))
      .flatMap((file) => {
        const text = readTextIfSafe(root, file) ?? "";
        const names = [...text.matchAll(/^func\s+(Test[A-Za-z0-9_]+)/gm)].map((m) => m[1]!);
        return names.map((name) => ({
          id: `go:${file}:${name}`,
          name,
          file,
          framework: "go",
          status: "not_run" as const,
        }));
      });
  },
  async run(options) {
    const startedAt = new Date().toISOString();
    const result = await runCommand("go", ["test", "./...", "-json"], {
      cwd: options.root,
      timeoutMs: options.timeoutMs,
      token: options.token,
    });
    const cases: TestCase[] = [];
    const failures: TestFailure[] = [];
    for (const line of result.stdout.split(/\r?\n/)) {
      if (!line.startsWith("{")) continue;
      try {
        const ev = JSON.parse(line) as {
          Action?: string;
          Test?: string;
          Package?: string;
          Output?: string;
        };
        if (ev.Test && (ev.Action === "pass" || ev.Action === "fail" || ev.Action === "skip")) {
          const testCase: TestCase = {
            id: `go:${ev.Package}:${ev.Test}`,
            name: ev.Test,
            file: ev.Package ?? ".",
            framework: "go",
            status: ev.Action === "pass" ? "pass" : ev.Action === "skip" ? "skip" : "fail",
          };
          cases.push(testCase);
          if (ev.Action === "fail")
            failures.push(failureFrom(testCase, ev.Output ?? result.stderr));
        }
      } catch {
        /* ignore */
      }
    }
    return finish(
      {
        ...baseResult(
          `run-${Date.now()}`,
          "workspace",
          startedAt,
          result.exitCode === 0 ? "pass" : "fail",
        ),
        cases,
        failures,
        outputExcerpt: excerpt(result),
      },
      cases,
      failures,
      result.durationMs,
    );
  },
});

export const dotnetAdapter = defineTestAdapter({
  id: "dotnet",
  name: ".NET test",
  detect(root) {
    const configs = fileExists(root, []).concat((["*.csproj", "*.sln"] as const).flatMap(() => []));
    const available = existsSync(path.join(root, ".")) && globHas(root, [".csproj", ".sln"]);
    return framework(
      "dotnet",
      ".NET test",
      available,
      configs,
      available ? "dotnet test" : undefined,
    );
  },
  discover(_root, files) {
    return files
      .filter((f) => f.endsWith("Tests.cs") || f.includes(".Tests/"))
      .map((file) => ({
        id: `dotnet:${file}`,
        name: path.posix.basename(file),
        file,
        framework: "dotnet",
        status: "not_run" as const,
      }));
  },
  async run(options) {
    const startedAt = new Date().toISOString();
    const result = await runCommand("dotnet", ["test", "--nologo"], {
      cwd: options.root,
      timeoutMs: options.timeoutMs,
      token: options.token,
    });
    const status = result.exitCode === 0 ? "pass" : "fail";
    const cases: TestCase[] = [
      { id: "dotnet:test", name: "dotnet test", file: ".", framework: "dotnet", status },
    ];
    const failures = status === "fail" ? [failureFrom(cases[0]!, excerpt(result))] : [];
    return finish(
      {
        ...baseResult(`run-${Date.now()}`, "workspace", startedAt, status),
        cases,
        failures,
        outputExcerpt: excerpt(result),
      },
      cases,
      failures,
      result.durationMs,
    );
  },
});

export const junitAdapter = defineTestAdapter({
  id: "junit",
  name: "JUnit",
  detect(root) {
    const configs = fileExists(root, ["pom.xml", "build.gradle", "build.gradle.kts"]);
    return framework(
      "junit",
      "JUnit",
      configs.length > 0,
      configs,
      configs.length ? "mvn test" : undefined,
    );
  },
  discover(_root, files) {
    return files
      .filter((f) => /Test\.java$/.test(f))
      .map((file) => ({
        id: `junit:${file}`,
        name: path.posix.basename(file),
        file,
        framework: "junit",
        status: "not_run" as const,
      }));
  },
  async run(options) {
    const startedAt = new Date().toISOString();
    const hasPom = existsSync(path.join(options.root, "pom.xml"));
    const result = hasPom
      ? await runCommand("mvn", ["-q", "test"], {
          cwd: options.root,
          timeoutMs: options.timeoutMs,
          token: options.token,
        })
      : await runCommand(
          process.platform === "win32" ? "gradlew.bat" : "./gradlew",
          ["test", "-q"],
          {
            cwd: options.root,
            timeoutMs: options.timeoutMs,
            token: options.token,
            shell: process.platform === "win32",
          },
        );
    const status = result.exitCode === 0 ? "pass" : "fail";
    const cases: TestCase[] = [
      { id: "junit:test", name: "junit", file: ".", framework: "junit", status },
    ];
    const failures = status === "fail" ? [failureFrom(cases[0]!, excerpt(result))] : [];
    return finish(
      {
        ...baseResult(`run-${Date.now()}`, "workspace", startedAt, status),
        cases,
        failures,
        outputExcerpt: excerpt(result),
      },
      cases,
      failures,
      result.durationMs,
    );
  },
});

export const TEST_ADAPTERS: TestAdapter[] = [
  vitestAdapter,
  jestAdapter,
  playwrightAdapter,
  cypressAdapter,
  nodeTestAdapter,
  pytestAdapter,
  unittestAdapter,
  cargoAdapter,
  goTestAdapter,
  dotnetAdapter,
  junitAdapter,
];

function readPackage(root: string):
  | {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    }
  | undefined {
  try {
    return JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
  } catch {
    return undefined;
  }
}

async function runNpm(
  root: string,
  args: string[],
  timeoutMs: number,
  token?: CancellationToken,
): Promise<CommandResult> {
  if (process.platform === "win32") {
    const line = ["npx.cmd", "--yes", ...args].map(quoteWinCmd).join(" ");
    return runCommand(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", line], {
      cwd: root,
      timeoutMs,
      token,
    });
  }
  return runCommand("npx", ["--yes", ...args], {
    cwd: root,
    timeoutMs,
    token,
  });
}

function quoteWinCmd(value: string): string {
  if (value.length === 0) return '""';
  if (!/[\s&<>|^()"]/.test(value)) return value;
  return `"${value.replaceAll('"', '\\"')}"`;
}

function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return "";
}

function parseJsonBlob(text: string): unknown | undefined {
  const candidate = extractJson(text);
  if (!candidate) return undefined;
  try {
    return JSON.parse(candidate);
  } catch {
    return undefined;
  }
}

function parseVitestJson(text: string | undefined): TestRunResult | undefined {
  if (!text) return undefined;
  try {
    const json = JSON.parse(text) as {
      testResults?: Array<{
        name?: string;
        assertionResults?: Array<{
          fullName?: string;
          title?: string;
          status?: string;
          duration?: number;
          failureMessages?: string[];
        }>;
      }>;
      numPassedTests?: number;
      numFailedTests?: number;
      numPendingTests?: number;
    };
    if (!json.testResults) return undefined;
    const cases: TestCase[] = [];
    const failures: TestFailure[] = [];
    for (const file of json.testResults) {
      const rel = toPosix(file.name ?? "unknown");
      for (const assertion of file.assertionResults ?? []) {
        const status: TestStatus =
          assertion.status === "passed" ? "pass" : assertion.status === "pending" ? "skip" : "fail";
        const testCase: TestCase = {
          id: `vitest:${rel}:${assertion.fullName ?? assertion.title}`,
          name: assertion.fullName ?? assertion.title ?? rel,
          file: rel,
          framework: "vitest",
          status,
          duration: assertion.duration,
        };
        cases.push(testCase);
        if (status === "fail")
          failures.push(failureFrom(testCase, (assertion.failureMessages ?? []).join("\n")));
      }
    }
    return {
      id: `run-${Date.now()}`,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      mode: "workspace",
      status: (json.numFailedTests ?? 0) > 0 ? "fail" : "pass",
      summary: {
        total: cases.length,
        passed: json.numPassedTests ?? cases.filter((c) => c.status === "pass").length,
        failed: json.numFailedTests ?? cases.filter((c) => c.status === "fail").length,
        skipped: json.numPendingTests ?? 0,
        durationMs: 0,
      },
      cases,
      failures,
    };
  } catch {
    return undefined;
  }
}

function parsedToRun(
  parsed: TestRunResult,
  startedAt: string,
  result: CommandResult,
): TestRunResult {
  return {
    ...parsed,
    startedAt,
    finishedAt: new Date().toISOString(),
    summary: { ...parsed.summary, durationMs: result.durationMs },
    outputExcerpt: excerpt(result),
    status: result.timedOut ? "error" : parsed.status,
  };
}

function parseTapish(stdout: string, frameworkId: string): TestCase[] {
  const cases: TestCase[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const ok = line.match(/^(not )?ok \d+ (.+)/);
    if (!ok) continue;
    const fail = Boolean(ok[1]);
    const name = ok[2] ?? "test";
    cases.push({
      id: `${frameworkId}:${name}`,
      name,
      file: ".",
      framework: frameworkId,
      status: fail ? "fail" : "pass",
    });
  }
  return cases;
}

function parsePytestOutput(text: string): TestCase[] {
  const cases: TestCase[] = [];
  const re = /^(FAILED|ERROR|PASSED|SKIPPED)\s+(\S+)/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const status: TestStatus =
      match[1] === "PASSED" ? "pass" : match[1] === "SKIPPED" ? "skip" : "fail";
    const loc = match[2] ?? "unknown";
    cases.push({
      id: `pytest:${loc}`,
      name: loc,
      file: loc.split("::")[0] ?? loc,
      framework: "pytest",
      status,
    });
  }
  return cases;
}

function parseCargoTest(text: string): TestCase[] {
  const cases: TestCase[] = [];
  const re = /test\s+(\S+)\s+\.\.\.\s+(ok|FAILED|ignored)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const status: TestStatus =
      match[2] === "ok" ? "pass" : match[2] === "ignored" ? "skip" : "fail";
    cases.push({
      id: `cargo:${match[1]}`,
      name: match[1]!,
      file: "Cargo.toml",
      framework: "cargo",
      status,
    });
  }
  return cases;
}

function globHas(root: string, exts: string[]): boolean {
  try {
    return readdirSync(root).some((name) => exts.some((ext) => name.endsWith(ext)));
  } catch {
    return false;
  }
}

function excerpt(result: CommandResult): string {
  return redactSecrets((result.stderr || result.stdout).slice(-4000));
}

function failureFrom(testCase: TestCase, message: string): TestFailure {
  const text = redactSecrets(message);
  const expected = text.match(/Expected[:\s]+([\s\S]+?)(?:Received|Actual|$)/i)?.[1]?.trim();
  const actual = text.match(/(?:Received|Actual)[:\s]+([\s\S]+?)(?:\n\n|$)/i)?.[1]?.trim();
  return {
    testId: testCase.id,
    name: testCase.name,
    file: testCase.file,
    message: text.split(/\r?\n/)[0] ?? text,
    expected,
    actual,
    stack: text,
    fingerprint: fingerprintText(["test", testCase.file, testCase.name, text.split("\n")[0]]),
  };
}

export { failureFrom };

export async function runArbitrary(
  root: string,
  commandLine: string,
  timeoutMs: number,
  token?: CancellationToken,
): Promise<CommandResult> {
  return shellCommand(commandLine, { cwd: root, timeoutMs, token });
}
