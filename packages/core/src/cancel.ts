export class CancellationToken {
  private aborted = false;
  private readonly listeners = new Set<() => void>();

  get isCancelled(): boolean {
    return this.aborted;
  }

  cancel(): void {
    if (this.aborted) return;
    this.aborted = true;
    for (const listener of this.listeners) listener();
    this.listeners.clear();
  }

  onCancel(listener: () => void): () => void {
    if (this.aborted) {
      listener();
      return () => undefined;
    }
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  throwIfCancelled(): void {
    if (this.aborted) {
      const error = new Error("Operation cancelled");
      error.name = "CancelledError";
      throw error;
    }
  }

  static none(): CancellationToken {
    return new CancellationToken();
  }

  static fromAbortSignal(signal: AbortSignal): CancellationToken {
    const token = new CancellationToken();
    if (signal.aborted) {
      token.cancel();
      return token;
    }
    signal.addEventListener("abort", () => token.cancel(), { once: true });
    return token;
  }

  toAbortSignal(): AbortSignal {
    const controller = new AbortController();
    this.onCancel(() => controller.abort());
    return controller.signal;
  }
}
