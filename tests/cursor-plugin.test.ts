import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const plugin = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

describe("cursor plugin at repository root", () => {
  it("uses the single-plugin Cursor layout", () => {
    const manifest = JSON.parse(
      readFileSync(path.join(plugin, ".cursor-plugin/plugin.json"), "utf8"),
    ) as { name: string; logo: string };
    expect(manifest.name).toBe("stackglass");
    expect(manifest.logo).toBe("assets/logo.svg");
    expect(existsSync(path.join(plugin, "assets/logo.svg"))).toBe(true);
    expect(existsSync(path.join(plugin, "assets/stackglass-mark.svg"))).toBe(true);
    expect(existsSync(path.join(plugin, ".cursor-plugin/marketplace.json"))).toBe(false);
    expect(existsSync(path.join(plugin, "apps/cursor-plugin"))).toBe(false);
  });

  it("ships rules, skills, commands, agents, hooks, and mcp", () => {
    expect(readdirSync(path.join(plugin, "rules")).filter((f) => f.endsWith(".mdc")).length).toBe(
      15,
    );
    expect(readdirSync(path.join(plugin, "skills")).length).toBeGreaterThanOrEqual(10);
    expect(existsSync(path.join(plugin, "commands/status.md"))).toBe(true);
    expect(existsSync(path.join(plugin, "agents/failure-investigator.md"))).toBe(true);
    expect(existsSync(path.join(plugin, "hooks/hooks.json"))).toBe(true);
    expect(existsSync(path.join(plugin, "mcp.json"))).toBe(true);
    expect(existsSync(path.join(plugin, "scripts/session-start.mjs"))).toBe(true);
    expect(existsSync(path.join(plugin, "scripts/stackglass-mcp.mjs"))).toBe(true);
  });

  it("is not an installable npm package", () => {
    const rootPkg = JSON.parse(readFileSync(path.join(plugin, "package.json"), "utf8")) as {
      bin?: unknown;
      private?: boolean;
    };
    const cliPkg = JSON.parse(readFileSync(path.join(plugin, "cli/package.json"), "utf8")) as {
      bin?: unknown;
    };
    const mcpPkg = JSON.parse(
      readFileSync(path.join(plugin, "servers/mcp/package.json"), "utf8"),
    ) as { bin?: unknown };
    const mcp = JSON.parse(readFileSync(path.join(plugin, "mcp.json"), "utf8")) as {
      mcpServers: { stackglass: { command: string; args: string[] } };
    };
    expect(rootPkg.private).toBe(true);
    expect(rootPkg.bin).toBeUndefined();
    expect(cliPkg.bin).toBeUndefined();
    expect(mcpPkg.bin).toBeUndefined();
    expect(mcp.mcpServers.stackglass.command).toBe("node");
    expect(mcp.mcpServers.stackglass.args[0]).toContain("scripts/stackglass-mcp.mjs");
  });

  it("generated docs do not tell people to npm link", () => {
    const install = readFileSync(
      path.join(plugin, "apps/docs/getting-started/installation.md"),
      "utf8",
    );
    const setup = readFileSync(path.join(plugin, "apps/docs/mcp/setup.md"), "utf8");
    expect(install).not.toMatch(/npm link/);
    expect(setup).not.toMatch(/npm link/);
    expect(install).toContain("node cli/dist/bin.js");
    expect(setup).toContain("node scripts/stackglass-mcp.mjs");
  });
});
