import path from "node:path";
import { pathToFileURL } from "node:url";

export function toPosix(filePath: string): string {
  return filePath.replaceAll("\\", "/");
}

export function normalizePath(filePath: string): string {
  return toPosix(path.normalize(filePath));
}

export function relativeTo(root: string, filePath: string): string {
  const rel = path.relative(root, filePath);
  return toPosix(rel || ".");
}

export function resolveWithin(root: string, maybeRelative: string): string {
  if (path.isAbsolute(maybeRelative)) return path.normalize(maybeRelative);
  return path.resolve(root, maybeRelative);
}

export function stackglassDir(root: string): string {
  return path.join(root, ".stackglass");
}

export function isWithin(root: string, candidate: string): boolean {
  const rel = path.relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

export function fileUrl(filePath: string): string {
  return pathToFileURL(filePath).href;
}

export function extnameLower(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}
