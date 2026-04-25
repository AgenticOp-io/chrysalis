import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = dirname(fileURLToPath(import.meta.url));

/**
 * Tests import workspace packages by name (`@chrysalis/ingest`, etc.). Those
 * packages declare `main` as `dist/`, which is easy to forget to rebuild after
 * a source change and then cross-package tests silently use stale code. Point
 * Vitest at `src/` for packages that sit on the PHP parse → ingest boundary.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@chrysalis/parser-bridge": resolve(root, "packages/parser-bridge/src/index.ts"),
      "@chrysalis/ingest": resolve(root, "packages/ingest/src/index.ts"),
    },
  },
  test: {
    include: ["packages/**/tests/**/*.test.ts"],
    globals: false,
    testTimeout: 15_000,
    passWithNoTests: true,
  },
});
