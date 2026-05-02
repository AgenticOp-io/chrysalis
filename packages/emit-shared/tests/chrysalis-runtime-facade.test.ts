import { describe, expect, test } from "vitest";
import { buildChrysalisRuntimeFacadeModuleSource } from "../src/chrysalis-runtime-facade.js";

describe("chrysalis-runtime-facade", () => {
  test("re-exports runtime with stable header", () => {
    const src = buildChrysalisRuntimeFacadeModuleSource();
    expect(src).toContain('export * from "./runtime.js"');
    expect(src).toContain("DESIGN D272");
  });
});
