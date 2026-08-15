import { randomUUID } from "node:crypto";
import type { EventType, TimelineEvent, TimelineQuery } from "./protocol.ts";
import { sanitizeMetadata } from "./security.ts";
import type { GlassStorage } from "./storage.ts";
import type { EventBus, CoreEvents } from "./events.ts";

export class GlassTrace {
  constructor(
    private readonly storage: GlassStorage,
    private readonly bus: EventBus<CoreEvents>,
    private readonly origin = "stackglass",
  ) {}

  record(partial: {
    type: EventType;
    origin?: string;
    relatedFiles?: string[];
    relatedProcess?: string;
    result?: string;
    durationMs?: number;
    metadata?: Record<string, unknown>;
  }): TimelineEvent {
    const event: TimelineEvent = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      type: partial.type,
      origin: partial.origin ?? this.origin,
      relatedFiles: (partial.relatedFiles ?? []).map((f) => f.replaceAll("\\", "/")),
      relatedProcess: partial.relatedProcess,
      result: partial.result,
      durationMs: partial.durationMs,
      metadata: sanitizeMetadata(partial.metadata ?? {}),
    };
    this.storage.insertEvent(event);
    this.bus.emit("event", event);
    return event;
  }

  query(query: TimelineQuery = {}): TimelineEvent[] {
    return this.storage.queryEvents({
      since: query.since,
      until: query.until,
      limit: query.limit,
      types: query.eventTypes,
      file: query.file,
    });
  }
}
