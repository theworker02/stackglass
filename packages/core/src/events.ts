type Handler<T> = (event: T) => void;

export class EventBus<TEvents extends Record<string, unknown>> {
  private readonly handlers = new Map<keyof TEvents, Set<Handler<unknown>>>();

  on<K extends keyof TEvents>(type: K, handler: Handler<TEvents[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as Handler<unknown>);
    return () => set.delete(handler as Handler<unknown>);
  }

  emit<K extends keyof TEvents>(type: K, event: TEvents[K]): void {
    const set = this.handlers.get(type);
    if (!set) return;
    for (const handler of set) handler(event);
  }

  removeAll(): void {
    this.handlers.clear();
  }
}

export type CoreEvents = {
  event: import("./protocol.ts").TimelineEvent;
  diagnostic: { level: "error" | "warn" | "info"; message: string };
  process: import("./protocol.ts").RuntimeProcess;
};
