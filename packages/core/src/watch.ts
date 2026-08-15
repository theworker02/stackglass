import { watch, type FSWatcher } from "chokidar";
import path from "node:path";
import type { StackglassConfig } from "./config.ts";
import { loadIgnore } from "./fs-scan.ts";
import { isSecretPath } from "./security.ts";
import { toPosix } from "./paths.ts";
import type { GlassTrace } from "./trace.ts";
import type { GlassIndex } from "./index-engine.ts";

export type ChangeKind = "source" | "test" | "config" | "manifest" | "docs" | "other";

export interface ClassifiedChange {
  path: string;
  kind: ChangeKind;
  event: "add" | "change" | "unlink";
}

export class GlassWatch {
  private watcher: FSWatcher | undefined;
  private timer: NodeJS.Timeout | undefined;
  private pending = new Map<string, ClassifiedChange>();
  onChange?: (changes: ClassifiedChange[]) => void;

  constructor(
    private readonly root: string,
    private readonly config: StackglassConfig,
    private readonly trace: GlassTrace,
    private readonly index: GlassIndex,
  ) {}

  start(): void {
    if (!this.config.watch.enabled || this.watcher) return;
    const ig = loadIgnore(this.root, this.config.ignore);
    this.watcher = watch(this.root, {
      ignoreInitial: true,
      persistent: true,
      ignored: (watchedPath) => {
        const rel = toPosix(path.relative(this.root, watchedPath));
        if (!rel || rel === ".") return false;
        if (rel.startsWith(".git/") || rel === ".git") return true;
        if (isSecretPath(rel)) return true;
        return ig.ignores(rel);
      },
      awaitWriteFinish: { stabilityThreshold: this.config.watch.debounceMs, pollInterval: 50 },
    });
    this.watcher.on("add", (p) => this.enqueue(p, "add"));
    this.watcher.on("change", (p) => this.flushFile(p, "change"));
    this.watcher.on("unlink", (p) => this.enqueue(p, "unlink"));
  }

  stop(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    const watcher = this.watcher;
    this.watcher = undefined;
    return watcher ? watcher.close() : Promise.resolve();
  }

  private flushFile(abs: string, event: ClassifiedChange["event"]): void {
    this.enqueue(abs, event);
  }

  private enqueue(abs: string, event: ClassifiedChange["event"]): void {
    const rel = toPosix(path.relative(this.root, abs));
    if (!rel || rel.startsWith("..")) return;
    const kind = classifyChange(rel);
    this.pending.set(rel, { path: rel, kind, event });
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.config.watch.debounceMs);
  }

  private flush(): void {
    const changes = [...this.pending.values()];
    this.pending.clear();
    if (changes.length === 0) return;
    this.index.invalidate();
    for (const change of changes) {
      const type =
        change.event === "add"
          ? "file.created"
          : change.event === "unlink"
            ? "file.deleted"
            : "file.changed";
      this.trace.record({
        type,
        relatedFiles: [change.path],
        metadata: { kind: change.kind },
      });
      if (change.kind === "config" || change.kind === "manifest") {
        this.trace.record({
          type: change.kind === "manifest" ? "dependency.changed" : "config.changed",
          relatedFiles: [change.path],
        });
      }
      this.trace.record({
        type: "watch.classified",
        relatedFiles: [change.path],
        metadata: { kind: change.kind },
      });
    }
    this.onChange?.(changes);
  }
}

function classifyChange(relative: string): ChangeKind {
  if (
    /(^|\/)package\.json$|(^|\/)cargo\.toml$|(^|\/)go\.mod$|(^|\/)pyproject\.toml$/i.test(relative)
  ) {
    return "manifest";
  }
  if (/(\.|_)(test|spec)(\.|\/)/i.test(relative) || /(^|\/)tests?\//i.test(relative)) return "test";
  if (/\.(md|mdx)$/i.test(relative) || relative.startsWith("docs/")) return "docs";
  if (
    /\.(ya?ml|toml|ini|json)$/i.test(relative) ||
    relative.startsWith(".github/") ||
    /\.config\./i.test(relative)
  ) {
    return "config";
  }
  return "source";
}
