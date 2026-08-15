import { createHash } from "node:crypto";
import path from "node:path";

const SECRET_FILE_PATTERNS = [
  /^\.env($|\.)/i,
  /\.pem$/i,
  /\.key$/i,
  /(^|[/\\])credentials/i,
  /(^|[/\\])secrets/i,
  /(^|[/\\])id_rsa/i,
  /(^|[/\\])id_ed25519/i,
  /\.p12$/i,
  /\.pfx$/i,
  /service-account.*\.json$/i,
];

const SECRET_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /credential/i,
  /auth/i,
  /connection[_-]?string/i,
  /database[_-]?url/i,
  /dsn/i,
];

const SECRET_VALUE_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /ghp_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /sk_live_[A-Za-z0-9]+/,
  /sk-[A-Za-z0-9]{20,}/,
  /xox[baprs]-[A-Za-z0-9-]+/,
  /postgres(?:ql)?:\/\/[^\s]+/i,
  /mysql:\/\/[^\s]+/i,
  /mongodb(?:\+srv)?:\/\/[^\s]+/i,
  /AKIA[0-9A-Z]{16}/,
];

export function isSecretPath(filePath: string): boolean {
  const base = path.basename(filePath);
  const normalized = filePath.replaceAll("\\", "/");
  return SECRET_FILE_PATTERNS.some((re) => re.test(base) || re.test(normalized));
}

export function looksLikeSecretKey(name: string): boolean {
  return SECRET_KEY_PATTERNS.some((re) => re.test(name));
}

export function redactSecrets(text: string): string {
  let out = text;
  for (const re of SECRET_VALUE_PATTERNS) {
    out = out.replace(re, "[REDACTED]");
  }
  out = out.replace(/\b([A-Z][A-Z0-9_]{2,})=(.+)/g, (full, key: string, value: string) => {
    if (looksLikeSecretKey(key) || SECRET_VALUE_PATTERNS.some((re) => re.test(value))) {
      return `${key}=[REDACTED]`;
    }
    return full;
  });
  return out;
}

export function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (looksLikeSecretKey(key)) {
      out[key] = "[REDACTED]";
      continue;
    }
    if (typeof value === "string") {
      out[key] = redactSecrets(value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function fingerprintText(parts: Array<string | undefined>): string {
  const normalized = parts
    .filter((p): p is string => Boolean(p))
    .map((p) =>
      p.replace(/\\/g, "/").replace(/\d+/g, "N").replace(/\s+/g, " ").trim().toLowerCase(),
    )
    .join("|");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

export const DEFAULT_IGNORE = [
  "node_modules",
  "target",
  "dist",
  "build",
  "coverage",
  "vendor",
  ".git",
  ".svn",
  ".hg",
  ".stackglass/cache",
  ".stackglass/history",
  "*.db",
  "*.db-wal",
  "*.db-shm",
  ".next",
  ".nuxt",
  ".output",
  ".turbo",
  ".cache",
  "__pycache__",
  ".venv",
  "venv",
  ".pytest_cache",
  ".mypy_cache",
  "Pods",
  "*.min.js",
  "*.map",
];
