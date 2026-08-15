import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@stackglass/core": path.join(root, "packages/core/src/index.ts"),
      "@stackglass/mcp": path.join(root, "servers/mcp/src/index.ts"),
      "@stackglass/cli": path.join(root, "cli/src/index.ts"),
    },
  },
  test: {
    include: [
      "packages/**/*.test.ts",
      "cli/**/*.test.ts",
      "servers/**/*.test.ts",
      "apps/**/*.test.ts",
      "integration-tests/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "fixtures/**", "examples/**"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: "forks",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: ["packages/core/src/**/*.ts", "cli/src/**/*.ts", "servers/mcp/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/dist/**"],
    },
  },
});
