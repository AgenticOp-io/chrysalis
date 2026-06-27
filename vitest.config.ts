import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = dirname(fileURLToPath(import.meta.url));

/**
 * Tests import workspace packages by name (`@chrysalis/ingest`, etc.). Those
 * packages declare `main` as `dist/`, which is easy to forget to rebuild after
 * a source change and then cross-package tests silently use stale code. Point
 * Vitest at `src/` for packages on the parse → ingest → WebIR boundary (ingest
 * imports WebIR from workspace `dist/` unless aliased).
 */
export default defineConfig({
  resolve: {
    alias: {
      "@chrysalis/parser-bridge": resolve(root, "packages/parser-bridge/src/index.ts"),
      "@chrysalis/ingest": resolve(root, "packages/ingest/src/index.ts"),
      "@chrysalis/webir": resolve(root, "packages/webir/src/index.ts"),
      "@chrysalis/emit-hono": resolve(root, "packages/emit-hono/src/index.ts"),
      "@chrysalis/emit-fastify": resolve(root, "packages/emit-fastify/src/index.ts"),
      "@chrysalis/emit-shared": resolve(root, "packages/emit-shared/src/index.ts"),
      "@chrysalis/oracle": resolve(root, "packages/oracle/src/index.ts"),
      "@chrysalis/verify": resolve(root, "packages/verify/src/index.ts"),
      "@chrysalis/archaeology": resolve(root, "packages/archaeology/src/index.ts"),
      "@chrysalis/runtime-chimera": resolve(root, "packages/runtime-chimera/src/index.ts"),
      "@chrysalis/runtime-cwl": resolve(root, "packages/runtime-cwl/src/index.ts"),
      "@chrysalis/insight": resolve(root, "packages/insight/src/index.ts"),
      "@chrysalis/rewrite": resolve(root, "packages/rewrite/src/index.ts"),
      "@chrysalis/repair": resolve(root, "packages/repair/src/index.ts"),
      "@chrysalis/license": resolve(root, "packages/license/src/index.ts"),
    },
  },
  test: {
    include: ["packages/**/tests/**/*.test.ts"],
    globals: false,
    testTimeout: 15_000,
    /** Hub gold/completion subprocesses contend on shared fixtures when files run in parallel. */
    fileParallelism: false,
    passWithNoTests: true,
    /** Hub ingest scripts are Node CLIs; do not Vite-transform JSDoc-heavy .mjs (SyntaxError). */
    server: {
      deps: {
        external: [/\/scripts\//],
      },
    },
  },
});
