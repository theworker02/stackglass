import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ignore, { type Ignore } from "ignore";
import { globSync } from "tinyglobby";
import { DEFAULT_IGNORE, isSecretPath } from "./security.ts";
import { toPosix } from "./paths.ts";

export function loadIgnore(root: string, extra: string[] = []): Ignore {
  const ig = ignore();
  ig.add(DEFAULT_IGNORE);
  ig.add(extra);
  for (const name of [".gitignore", ".stackglassignore"]) {
    const file = path.join(root, name);
    if (existsSync(file)) {
      try {
        ig.add(readFileSync(file, "utf8"));
      } catch {
        /* ignore unreadable */
      }
    }
  }
  return ig;
}

export function listProjectFiles(
  root: string,
  options: { extraIgnore?: string[]; maxFileSizeBytes?: number; maxDepth?: number } = {},
): string[] {
  const ig = loadIgnore(root, options.extraIgnore);
  const maxSize = options.maxFileSizeBytes ?? 1_048_576;
  const results: string[] = [];
  let files: string[] = [];
  try {
    files = globSync("**/*", {
      cwd: root,
      dot: true,
      onlyFiles: true,
      followSymbolicLinks: false,
      ignore: ["**/.git/**"],
    });
  } catch {
    return [];
  }
  for (const relative of files) {
    const posix = toPosix(relative);
    if (ig.ignores(posix)) continue;
    if (isSecretPath(posix)) continue;
    const depth = posix.split("/").length;
    if (options.maxDepth && depth > options.maxDepth) continue;
    const abs = path.join(root, relative);
    try {
      const stat = statSync(abs);
      if (!stat.isFile() || stat.size > maxSize) continue;
    } catch {
      continue;
    }
    results.push(posix);
  }
  return results.sort();
}

export function readTextIfSafe(
  root: string,
  relativePath: string,
  maxBytes = 400_000,
): string | undefined {
  if (isSecretPath(relativePath)) return undefined;
  const abs = path.join(root, relativePath);
  try {
    const stat = statSync(abs);
    if (stat.size > maxBytes) return undefined;
    return readFileSync(abs, "utf8");
  } catch {
    return undefined;
  }
}
