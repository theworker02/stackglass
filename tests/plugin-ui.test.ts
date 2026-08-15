import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HELP, parseArgs } from "../cli/src/index.ts";
import { dashboardHtml } from "../cli/src/dashboard-ui.ts";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

describe("plugin UI navigation contract", () => {
  it("CLI help lists dashboard and glasslab commands used by the UI", () => {
    expect(HELP).toContain("dashboard");
    expect(HELP).toContain("timeline");
    expect(HELP).toContain("test flakes");
    const parsed = parseArgs(["node", "glass", "status"]);
    expect(parsed.rest[0]).toBe("status");
  });

  it("dashboard HTML inlines the Stackglass mark symbol", () => {
    const html = dashboardHtml();
    expect(html).toContain('id="mark"');
    expect(html).toContain('href="#mark"');
    expect(html).toContain("STACKGLASS");
  });

  it("docs and dashboard shells use the synced logo asset", () => {
    const docs = readFileSync(path.join(root, "apps/docs/.vitepress/config.ts"), "utf8");
    const home = readFileSync(path.join(root, "apps/docs/index.md"), "utf8");
    const dash = readFileSync(path.join(root, "apps/dashboard/index.html"), "utf8");
    expect(docs).toContain('logo: "/logo.svg"');
    expect(home).toContain("src: /logo.svg");
    expect(dash).toContain('src="/logo.svg"');
  });
});
