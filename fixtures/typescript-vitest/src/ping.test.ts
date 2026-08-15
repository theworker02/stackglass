import { expect, it } from "vitest";
import { ping } from "../src/ping.ts";
it("pings", () => expect(ping()).toBe("pong"));
