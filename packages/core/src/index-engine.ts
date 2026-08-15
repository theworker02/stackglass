import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { StackglassConfig } from "./config.ts";
import { listProjectFiles, readTextIfSafe } from "./fs-scan.ts";
import { extnameLower, toPosix } from "./paths.ts";
import type {
  ImportRecord,
  IndexedFile,
  LanguageStats,
  PackageDependency,
  PackageInfo,
  ProjectIndex,
  PublicExport,
  SymbolInfo,
} from "./protocol.ts";

const LANGUAGE_BY_EXT: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".mts": "TypeScript",
  ".cts": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".py": "Python",
  ".rs": "Rust",
  ".go": "Go",
  ".java": "Java",
  ".kt": "Kotlin",
  ".cs": "C#",
  ".rb": "Ruby",
  ".php": "PHP",
  ".swift": "Swift",
  ".md": "Markdown",
  ".mdx": "Markdown",
  ".json": "JSON",
  ".yml": "YAML",
  ".yaml": "YAML",
  ".toml": "TOML",
  ".sql": "SQL",
  ".svelte": "Svelte",
  ".vue": "Vue",
};

const TEST_FILE_RE = /(\.|_)(test|spec|tests)(\.|$)|(^|\/)(tests?|__tests__|spec)\//i;

const CONFIG_NAMES = new Set([
  "package.json",
  "tsconfig.json",
  "jsconfig.json",
  "pyproject.toml",
  "cargo.toml",
  "go.mod",
  "go.sum",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "dockerfile",
  "compose.yml",
  "compose.yaml",
  "docker-compose.yml",
  ".eslintrc.json",
  "eslint.config.js",
  "eslint.config.ts",
  "vitest.config.ts",
  "vitest.config.js",
  "jest.config.ts",
  "jest.config.js",
  "playwright.config.ts",
  "pytest.ini",
  ".stackglassignore",
]);

export class GlassIndex {
  private cached: ProjectIndex | undefined;

  constructor(
    private readonly root: string,
    private readonly config: StackglassConfig,
  ) {}

  build(): ProjectIndex {
    const files = listProjectFiles(this.root, {
      extraIgnore: this.config.ignore,
      maxFileSizeBytes: this.config.index.maxFileSizeBytes,
      maxDepth: this.config.index.maxDepth,
    });
    const indexed: IndexedFile[] = [];
    const directories = new Set<string>();
    const languageBytes = new Map<string, { files: number; bytes: number }>();
    const packages: PackageInfo[] = [];
    const manifests: string[] = [];
    const testFiles: string[] = [];
    const sourceFiles: string[] = [];
    const documentation: string[] = [];
    const configuration: string[] = [];
    const scripts: Record<string, string> = {};
    const symbols: SymbolInfo[] = [];
    const imports: ImportRecord[] = [];
    const dependencies: PackageDependency[] = [];
    const publicExports: PublicExport[] = [];

    for (const relative of files) {
      const abs = path.join(this.root, relative);
      let size = 0;
      try {
        size = statSync(abs).size;
      } catch {
        continue;
      }
      const ext = extnameLower(relative);
      const language = LANGUAGE_BY_EXT[ext];
      const base = path.posix.basename(relative);
      const kind = classify(relative, base);
      const hash = hashFile(abs, size);
      indexed.push({ path: abs, relativePath: relative, kind, language, size, hash });
      const dir = path.posix.dirname(relative);
      if (dir !== ".") directories.add(dir);
      if (language) {
        const entry = languageBytes.get(language) ?? { files: 0, bytes: 0 };
        entry.files += 1;
        entry.bytes += size;
        languageBytes.set(language, entry);
      }
      if (kind === "test") testFiles.push(relative);
      if (kind === "source") sourceFiles.push(relative);
      if (kind === "docs") documentation.push(relative);
      if (kind === "config" || kind === "manifest") configuration.push(relative);
      if (kind === "manifest") manifests.push(relative);

      if (base.toLowerCase() === "package.json") {
        const pkg = parsePackageJson(this.root, relative);
        if (pkg) {
          packages.push(pkg.info);
          Object.assign(scripts, pkg.scripts);
          dependencies.push(...pkg.dependencies);
          publicExports.push(...pkg.exports);
        }
      }
      if (base.toLowerCase() === "cargo.toml") {
        const cargo = parseCargoToml(this.root, relative);
        if (cargo) packages.push(cargo);
      }
      if (base.toLowerCase() === "go.mod") {
        const go = parseGoMod(this.root, relative);
        if (go) packages.push(go);
      }
      if (base.toLowerCase() === "pyproject.toml") {
        const py = parsePyproject(this.root, relative);
        if (py) packages.push(py);
      }

      if (this.config.index.parseSymbols && language && kind !== "asset") {
        const text = readTextIfSafe(this.root, relative, 200_000);
        if (text) {
          if (language === "TypeScript" || language === "JavaScript") {
            symbols.push(...extractJsSymbols(relative, text));
            imports.push(...extractJsImports(relative, text));
          } else if (language === "Python") {
            symbols.push(...extractPySymbols(relative, text));
          } else if (language === "Go") {
            symbols.push(...extractGoSymbols(relative, text));
          } else if (language === "Rust") {
            symbols.push(...extractRustSymbols(relative, text));
          }
        }
      }
    }

    const languages: LanguageStats[] = [...languageBytes.entries()]
      .map(([language, v]) => ({ language, files: v.files, bytes: v.bytes }))
      .sort((a, b) => b.bytes - a.bytes);

    this.cached = {
      generatedAt: new Date().toISOString(),
      root: this.root,
      files: indexed,
      directories: [...directories].sort(),
      languages,
      packages,
      manifests,
      testFiles,
      sourceFiles,
      documentation,
      configuration,
      scripts,
      symbols,
      imports,
      dependencies,
      publicExports,
    };
    return this.cached;
  }

  get(): ProjectIndex {
    return this.cached ?? this.build();
  }

  invalidate(): void {
    this.cached = undefined;
  }

  file(relativePath: string): IndexedFile | undefined {
    const posix = toPosix(relativePath);
    return this.get().files.find((f) => f.relativePath === posix);
  }

  relatedTests(
    sourceFile: string,
  ): Array<{ file: string; confidence: "low" | "moderate" | "high"; reason: string }> {
    const index = this.get();
    const posix = toPosix(sourceFile);
    const base = path.posix.basename(posix).replace(/\.(tsx?|jsx?|py|rs|go|cs)$/i, "");
    const dir = path.posix.dirname(posix);
    const results: Array<{
      file: string;
      confidence: "low" | "moderate" | "high";
      reason: string;
    }> = [];
    for (const testFile of index.testFiles) {
      if (testFile === posix) {
        results.push({ file: testFile, confidence: "high", reason: "The file itself is a test." });
        continue;
      }
      const testBase = path.posix.basename(testFile);
      if (testBase.includes(base) && base.length > 2) {
        results.push({
          file: testFile,
          confidence: "high",
          reason: "Direct module test by naming convention.",
        });
        continue;
      }
      if (
        path.posix.dirname(testFile) === dir ||
        path.posix.dirname(testFile).startsWith(`${dir}/`)
      ) {
        results.push({
          file: testFile,
          confidence: "moderate",
          reason: "Colocated in the same directory tree.",
        });
      }
    }
    const importers = index.imports.filter((imp) => {
      if (imp.kind !== "relative") return false;
      const resolved = toPosix(
        path.posix.normalize(path.posix.join(path.posix.dirname(imp.file), imp.specifier)),
      );
      return (
        resolved === posix.replace(/\.(tsx?|jsx?|mts|cts|mjs|cjs)$/i, "") || resolved === posix
      );
    });
    for (const imp of importers) {
      if (index.testFiles.includes(imp.file) && !results.some((r) => r.file === imp.file)) {
        results.push({
          file: imp.file,
          confidence: "high",
          reason: "Test file imports this module.",
        });
      }
    }
    return results;
  }
}

function classify(relative: string, base: string): IndexedFile["kind"] {
  const lower = base.toLowerCase();
  if (
    lower === "package.json" ||
    lower === "cargo.toml" ||
    lower === "go.mod" ||
    lower === "pyproject.toml" ||
    lower === "pom.xml"
  ) {
    return "manifest";
  }
  if (
    CONFIG_NAMES.has(lower) ||
    relative.startsWith(".github/") ||
    /\.config\.(ts|js|mjs|cjs)$/.test(lower)
  ) {
    return "config";
  }
  if (TEST_FILE_RE.test(relative)) return "test";
  if (/\.(md|mdx|rst|adoc)$/i.test(lower) || relative.startsWith("docs/")) return "docs";
  if (/\.(png|jpe?g|gif|svg|webp|ico|woff2?|ttf)$/i.test(lower)) return "asset";
  if (LANGUAGE_BY_EXT[extnameLower(relative)]) return "source";
  return "other";
}

function hashFile(abs: string, size: number): string {
  try {
    if (size > 256_000) return `size:${size}`;
    return createHash("sha256").update(readFileSync(abs)).digest("hex").slice(0, 16);
  } catch {
    return "unreadable";
  }
}

function parsePackageJson(
  root: string,
  relative: string,
):
  | {
      info: PackageInfo;
      scripts: Record<string, string>;
      dependencies: PackageDependency[];
      exports: PublicExport[];
    }
  | undefined {
  try {
    const raw = JSON.parse(readFileSync(path.join(root, relative), "utf8")) as {
      name?: string;
      version?: string;
      private?: boolean;
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
      exports?: unknown;
    };
    const dir = path.posix.dirname(relative);
    const name = raw.name ?? (dir === "." ? path.basename(root) : dir);
    const scripts = raw.scripts ?? {};
    const info: PackageInfo = {
      name,
      path: relative,
      manager: detectJsManager(root),
      version: raw.version,
      private: raw.private,
      scripts: Object.keys(scripts),
    };
    const dependencies: PackageDependency[] = [];
    const add = (kind: PackageDependency["kind"], rec?: Record<string, string>) => {
      if (!rec) return;
      for (const [depName, version] of Object.entries(rec)) {
        dependencies.push({ package: name, name: depName, version, kind });
      }
    };
    add("dependency", raw.dependencies);
    add("devDependency", raw.devDependencies);
    add("peerDependency", raw.peerDependencies);
    add("optionalDependency", raw.optionalDependencies);
    const exports: PublicExport[] = [];
    if (raw.exports && typeof raw.exports === "object") {
      for (const key of Object.keys(raw.exports as Record<string, unknown>)) {
        exports.push({ package: name, name: key, file: relative });
      }
    }
    return { info, scripts, dependencies, exports };
  } catch {
    return undefined;
  }
}

function detectJsManager(root: string): string | undefined {
  if (existsSync(path.join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(path.join(root, "yarn.lock"))) return "yarn";
  if (existsSync(path.join(root, "bun.lockb")) || existsSync(path.join(root, "bun.lock")))
    return "bun";
  if (existsSync(path.join(root, "package-lock.json"))) return "npm";
  if (existsSync(path.join(root, "package.json"))) return "npm";
  return undefined;
}

function parseCargoToml(root: string, relative: string): PackageInfo | undefined {
  const text = readTextIfSafe(root, relative);
  if (!text) return undefined;
  const name = text.match(/^\s*name\s*=\s*"([^"]+)"/m)?.[1] ?? path.posix.dirname(relative);
  const version = text.match(/^\s*version\s*=\s*"([^"]+)"/m)?.[1];
  return { name, path: relative, manager: "cargo", version, scripts: ["test", "build", "clippy"] };
}

function parseGoMod(root: string, relative: string): PackageInfo | undefined {
  const text = readTextIfSafe(root, relative);
  if (!text) return undefined;
  const name = text.match(/^module\s+(\S+)/m)?.[1] ?? "go";
  return { name, path: relative, manager: "go", scripts: ["test", "build", "vet"] };
}

function parsePyproject(root: string, relative: string): PackageInfo | undefined {
  const text = readTextIfSafe(root, relative);
  if (!text) return undefined;
  const name = text.match(/^\s*name\s*=\s*"([^"]+)"/m)?.[1] ?? "python";
  return { name, path: relative, manager: "python", scripts: ["test"] };
}

function extractJsSymbols(file: string, text: string): SymbolInfo[] {
  const symbols: SymbolInfo[] = [];
  const patterns: Array<[RegExp, string]> = [
    [/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g, "function"],
    [/export\s+class\s+([A-Za-z0-9_]+)/g, "class"],
    [/export\s+(?:type|interface)\s+([A-Za-z0-9_]+)/g, "type"],
    [/export\s+const\s+([A-Za-z0-9_]+)/g, "const"],
    [/(?:export\s+default\s+function)\s+([A-Za-z0-9_]+)/g, "function"],
  ];
  for (const [re, kind] of patterns) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text))) {
      const name = match[1];
      if (!name) continue;
      const line = text.slice(0, match.index).split(/\r?\n/).length;
      symbols.push({ name, kind, file, line, exported: true });
    }
  }
  return symbols.slice(0, 200);
}

function extractJsImports(file: string, text: string): ImportRecord[] {
  const records: ImportRecord[] = [];
  const re = /(?:import\s+(?:[^'"\n]+from\s+)?|require\s*\(\s*)['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const specifier = match[1];
    if (!specifier) continue;
    const kind = specifier.startsWith(".")
      ? "relative"
      : specifier.startsWith("node:")
        ? "builtin"
        : "package";
    records.push({ file, specifier, kind });
  }
  return records.slice(0, 400);
}

function extractPySymbols(file: string, text: string): SymbolInfo[] {
  const symbols: SymbolInfo[] = [];
  const re = /^(?:async\s+)?def\s+([A-Za-z_][A-Za-z0-9_]*)|^class\s+([A-Za-z_][A-Za-z0-9_]*)/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const name = match[1] ?? match[2];
    if (!name || name.startsWith("_")) continue;
    const line = text.slice(0, match.index).split(/\r?\n/).length;
    symbols.push({ name, kind: match[1] ? "function" : "class", file, line, exported: true });
  }
  return symbols.slice(0, 200);
}

function extractGoSymbols(file: string, text: string): SymbolInfo[] {
  const symbols: SymbolInfo[] = [];
  const re = /^func\s+(?:\([^)]+\)\s+)?([A-Z][A-Za-z0-9_]*)|^type\s+([A-Z][A-Za-z0-9_]*)/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const name = match[1] ?? match[2];
    if (!name) continue;
    const line = text.slice(0, match.index).split(/\r?\n/).length;
    symbols.push({ name, kind: match[1] ? "function" : "type", file, line, exported: true });
  }
  return symbols.slice(0, 200);
}

function extractRustSymbols(file: string, text: string): SymbolInfo[] {
  const symbols: SymbolInfo[] = [];
  const re = /^pub\s+(?:async\s+)?(?:fn|struct|enum|trait|type)\s+([A-Za-z0-9_]+)/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const name = match[1];
    if (!name) continue;
    const line = text.slice(0, match.index).split(/\r?\n/).length;
    symbols.push({ name, kind: "export", file, line, exported: true });
  }
  return symbols.slice(0, 200);
}
