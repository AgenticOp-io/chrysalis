import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/tests/**/*.test.ts"],
    globals: false,
    testTimeout: 15_000,
    passWithNoTests: true,
  },
});
