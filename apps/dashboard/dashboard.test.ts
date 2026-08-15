import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

describe("dashboard shell", () => {
  it("renders empty and disconnected states without fake metrics", () => {
    const html = readFileSync(path.join(dir, "index.html"), "utf8");
    expect(html).toContain("Unavailable");
    expect(html).not.toMatch(/\b284\b/);
    expect(html).not.toContain("fake");
  });
});
