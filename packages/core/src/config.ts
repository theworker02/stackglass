import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { stackglassDir } from "./paths.ts";

export const historyConfigSchema = z.object({
  retentionDays: z.number().int().positive().default(30),
  maxEvents: z.number().int().positive().default(50_000),
});

export const watchConfigSchema = z.object({
  enabled: z.boolean().default(true),
  autoRun: z.boolean().default(false),
  debounceMs: z.number().int().nonnegative().default(250),
});

export const indexConfigSchema = z.object({
  maxFileSizeBytes: z.number().int().positive().default(1_048_576),
  maxDepth: z.number().int().positive().default(24),
  parseSymbols: z.boolean().default(true),
});

export const labConfigSchema = z.object({
  defaultTimeoutMs: z.number().int().positive().default(120_000),
  parallelWorkers: z.number().int().positive().default(4),
  flakeRepeatLimit: z.number().int().positive().default(25),
  mutationMaxMutants: z.number().int().positive().default(40),
});

export const telemetryConfigSchema = z.object({
  enabled: z.boolean().default(false),
});

export const loggingConfigSchema = z.object({
  level: z.enum(["error", "warn", "info", "debug", "trace"]).default("info"),
});

export const stackglassConfigSchema = z.object({
  history: historyConfigSchema.default({}),
  watch: watchConfigSchema.default({}),
  index: indexConfigSchema.default({}),
  lab: labConfigSchema.default({}),
  telemetry: telemetryConfigSchema.default({}),
  logging: loggingConfigSchema.default({}),
  ignore: z.array(z.string()).default([]),
});

export type StackglassConfig = z.infer<typeof stackglassConfigSchema>;

export const DEFAULT_CONFIG: StackglassConfig = stackglassConfigSchema.parse({});

export function configPath(root: string): string {
  return path.join(stackglassDir(root), "config.json");
}

export function localConfigPath(root: string): string {
  return path.join(stackglassDir(root), "local.json");
}

export function loadConfig(root: string): StackglassConfig {
  const file = configPath(root);
  if (!existsSync(file)) return DEFAULT_CONFIG;
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
    return stackglassConfigSchema.parse(raw);
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function writeConfig(root: string, config: StackglassConfig): void {
  mkdirSync(stackglassDir(root), { recursive: true });
  writeFileSync(configPath(root), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export function ensureProjectLayout(root: string): void {
  const dir = stackglassDir(root);
  mkdirSync(dir, { recursive: true });
  for (const name of ["history", "snapshots", "test-results", "contracts", "cache"]) {
    mkdirSync(path.join(dir, name), { recursive: true });
  }
  if (!existsSync(configPath(root))) writeConfig(root, DEFAULT_CONFIG);
  const gitignore = path.join(dir, ".gitignore");
  if (!existsSync(gitignore)) {
    writeFileSync(
      gitignore,
      ["local.json", "cache/", "history/", "*.db", "*.db-wal", "*.db-shm", "logs/"].join("\n") +
        "\n",
      "utf8",
    );
  }
}
