import { describe, expect, it } from "vitest";
import { Stackglass } from "@stackglass/core";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

describe("regression: secret files are not indexed", () => {
  it("does not include .env contents in the index or snapshot", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "sg-reg-"));
    mkdirSync(path.join(root, "src"));
    writeFileSync(path.join(root, "package.json"), `{"name":"r","version":"1.0.0"}`);
    writeFileSync(path.join(root, ".env"), "SECRET=super-secret-value\n");
    writeFileSync(path.join(root, "src/app.ts"), "export const x = 1;\n");
    const sg = await Stackglass.open(root, { watch: false });
    const index = sg.index.get();
    expect(index.files.some((f) => f.relativePath === ".env")).toBe(false);
    const snap = JSON.stringify(await sg.snapshot());
    expect(snap).not.toContain("super-secret-value");
    await sg.close();
  });
});
