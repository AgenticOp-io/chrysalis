import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { domainTypesByTable, emitTypes, runArchaeology } from "@chrysalis/archaeology";
import { ingestDirectory } from "@chrysalis/ingest";
import { emit } from "../src/index.js";

const FIXTURE = resolve(__dirname, "../../../fixtures/tiny-blog");
const FIXTURE_SCHEMA = resolve(__dirname, "../../../fixtures/tiny-blog/schema.sql");
const GOLDEN_LOGIN = resolve(__dirname, "golden/tiny-blog-login.ts");

describe("golden emitted TypeScript", () => {
  test("login handler matches golden fixture", async () => {
    const mod = await ingestDirectory(FIXTURE);
    const schemaReport = runArchaeology({ schemaPath: FIXTURE_SCHEMA });
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-golden-"));
    try {
      mkdirSync(resolve(out, "src"), { recursive: true });
      writeFileSync(resolve(out, "src/domain.ts"), emitTypes(schemaReport), "utf8");
      await emit({
        module: mod,
        outDir: out,
        schemaReport,
        domainTypesByTable: domainTypesByTable(schemaReport),
        provenanceRoot: FIXTURE,
      });
      const actual = readFileSync(resolve(out, "src/handlers/login.ts"), "utf8");
      const expected = readFileSync(GOLDEN_LOGIN, "utf8");
      expect(actual).toBe(expected);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  test("login handler with emitSharedRuntimeImports matches golden fixture", async () => {
    const mod = await ingestDirectory(FIXTURE);
    const schemaReport = runArchaeology({ schemaPath: FIXTURE_SCHEMA });
    const out = mkdtempSync(resolve(tmpdir(), "chrysalis-golden-sri-"));
    try {
      mkdirSync(resolve(out, "src"), { recursive: true });
      writeFileSync(resolve(out, "src/domain.ts"), emitTypes(schemaReport), "utf8");
      await emit({
        module: mod,
        outDir: out,
        schemaReport,
        domainTypesByTable: domainTypesByTable(schemaReport),
        provenanceRoot: FIXTURE,
        emitStrategy: { emitSharedRuntimeImports: true },
      });
      const actual = readFileSync(resolve(out, "src/handlers/login.ts"), "utf8");
      const expected = readFileSync(GOLDEN_LOGIN, "utf8").replace(
        '} from "../runtime.js";',
        '} from "../chrysalis-runtime-imports.js";',
      );
      expect(actual).toBe(expected);
      expect(readFileSync(resolve(out, "src/chrysalis-runtime-imports.ts"), "utf8")).toContain(
        'from "./runtime.js"',
      );
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
