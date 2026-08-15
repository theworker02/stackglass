import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { Stackglass } from "@stackglass/core";

describe("performance thresholds", () => {
  it("indexes hundreds of files and ingests timeline events in bounds", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "sg-perf-"));
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(path.join(root, "package.json"), `{"name":"bench","version":"1.0.0"}`);
    for (let i = 0; i < 400; i++) {
      writeFileSync(path.join(root, "src", `f${i}.ts`), `export const n${i} = ${i};\n`);
    }
    const t0 = Date.now();
    const sg = await Stackglass.open(root, { watch: false });
    sg.index.build();
    const indexMs = Date.now() - t0;
    const t1 = Date.now();
    for (let i = 0; i < 200; i++) {
      sg.trace.record({ type: "file.changed", relatedFiles: [`src/f${i % 400}.ts`] });
    }
    sg.timeline({ limit: 50 });
    const timelineMs = Date.now() - t1;
    await sg.close();
    rmSync(root, { recursive: true, force: true });
    expect(indexMs).toBeLessThan(20_000);
    expect(timelineMs).toBeLessThan(5_000);
  });
});
