import { describe, expect, test } from "vitest";
import {
  aggregateEmittedHandlerImports,
  buildFastifyChrysalisHandlerImportsSource,
  buildHonoChrysalisHandlerImportsSource,
} from "../src/chrysalis-handler-imports.js";

describe("chrysalis-handler-imports barrel", () => {
  test("hono barrel exports Context and runtime symbols", () => {
    const agg = aggregateEmittedHandlerImports([
      {
        body: "",
        holes: [],
        effectNames: [],
        shape: "html",
        domainTypeImports: [],
        usesQueryAllWhereIn: false,
        usesChrysalisBatchHelpers: false,
        usesZod: false,
        usesPhpFqnNew: false,
        usesPhpDynamicNew: false,
      },
    ]);
    const src = buildHonoChrysalisHandlerImportsSource(agg);
    expect(src).toContain('export type { Context } from "hono"');
    expect(src).toContain("./runtime.js");
    expect(src).toContain("./db.js");
  });

  test("hono barrel can re-export runtime via facade module", () => {
    const agg = aggregateEmittedHandlerImports([
      {
        body: "",
        holes: [],
        effectNames: [],
        shape: "html",
        domainTypeImports: [],
        usesQueryAllWhereIn: false,
        usesChrysalisBatchHelpers: false,
        usesZod: false,
        usesPhpFqnNew: false,
        usesPhpDynamicNew: false,
      },
    ]);
    const src = buildHonoChrysalisHandlerImportsSource(agg, { runtimeFacadeModule: true });
    expect(src).toContain("./chrysalis-runtime-facade.js");
    expect(src).not.toContain('from "./runtime.js"');
  });

  test("fastify barrel exports Fastify types", () => {
    const agg = aggregateEmittedHandlerImports([
      {
        body: "",
        holes: [],
        effectNames: [],
        shape: "html",
        domainTypeImports: [],
        usesQueryAllWhereIn: false,
        usesChrysalisBatchHelpers: false,
        usesZod: false,
        usesPhpFqnNew: false,
        usesPhpDynamicNew: false,
      },
    ]);
    const src = buildFastifyChrysalisHandlerImportsSource(agg);
    expect(src).toContain("FastifyRequest");
    expect(src).toContain("./runtime.js");
  });

  test("fastify barrel can re-export runtime via facade module", () => {
    const agg = aggregateEmittedHandlerImports([
      {
        body: "",
        holes: [],
        effectNames: [],
        shape: "html",
        domainTypeImports: [],
        usesQueryAllWhereIn: false,
        usesChrysalisBatchHelpers: false,
        usesZod: false,
        usesPhpFqnNew: false,
        usesPhpDynamicNew: false,
      },
    ]);
    const src = buildFastifyChrysalisHandlerImportsSource(agg, { runtimeFacadeModule: true });
    expect(src).toContain("./chrysalis-runtime-facade.js");
  });
});
