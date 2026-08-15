import { describe, expect, it } from "vitest";
import { Stackglass } from "@stackglass/core";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

describe("fixture repositories", () => {
  it("detects vitest in typescript-vitest", async () => {
    const sg = await Stackglass.open(path.join(repo, "fixtures/typescript-vitest"), {
      watch: false,
    });
    const fw = sg.lab.detectFrameworks();
    expect(fw.some((f) => f.id === "vitest")).toBe(true);
    await sg.close();
  });

  it("detects pytest", async () => {
    const sg = await Stackglass.open(path.join(repo, "fixtures/python-pytest"), { watch: false });
    expect(sg.lab.detectFrameworks().some((f) => f.id === "pytest")).toBe(true);
    await sg.close();
  });

  it("reads coverage without inventing files", async () => {
    const sg = await Stackglass.open(path.join(repo, "fixtures/coverage-project"), {
      watch: false,
    });
    const cov = sg.lab.coverage();
    expect(cov.availability).toBe("available");
    expect(cov.lines?.pct).toBe(84);
    await sg.close();
  });

  it("flags breaking contract field removal", async () => {
    const sg = await Stackglass.open(path.join(repo, "fixtures/contract-project"), {
      watch: false,
    });
    const changes = sg.lab.compareContracts({ id: 1, name: "a" }, { id: 1 });
    expect(changes.some((c) => c.kind === "property-removed" && c.breaking)).toBe(true);
    const compatible = sg.lab.compareContracts({ id: 1 }, { id: 1, extra: true });
    expect(compatible.some((c) => c.kind === "property-added" && !c.breaking)).toBe(true);
    await sg.close();
  });
});
