import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { countHoles } from "@chrysalis/webir";
import {
  buildCallEffectMap,
  buildHelperLiftAliasMap,
  ingestDirectory,
} from "../src/index.js";
import { ModuleBuilder } from "@chrysalis/webir";
import { convertPhpStatementsToBlock } from "../src/convert.js";
import { parseFile } from "@chrysalis/parser-bridge";

const TWIN_FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/lift-helper-lift-twin");
const GAP_FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/lift-helper-gap-probe");

describe("ingest: lift-shared-helpers (B2)", () => {
  it("buildHelperLiftAliasMap aliases twin_b to twin_a", async () => {
    const builder = new ModuleBuilder({ sourceApp: "test", chrysalisVersion: "1.0.0" });
    const bodies = new Map<string, import("@chrysalis/webir").NodeId>();
    for (const file of ["twin_a.php", "twin_b.php"] as const) {
      const ast = await parseFile(resolve(TWIN_FIXTURE, "lib", file));
      for (const stmt of ast.statements) {
        if (stmt.kind !== "FunctionDecl") continue;
        const rootId = convertPhpStatementsToBlock(builder, ast.file, stmt.body);
        bodies.set(stmt.name, rootId);
      }
    }
    const aliases = buildHelperLiftAliasMap(bodies, (id) => builder.get(id), { ignoreOrigin: true });
    expect(aliases.get("chrysalis_twin_b")).toBe("chrysalis_twin_a");
    expect(aliases.has("chrysalis_twin_a")).toBe(false);
  });

  it("gap-probe alpha/beta alias with semantic lift (B3)", async () => {
    const builder = new ModuleBuilder({ sourceApp: "gap", chrysalisVersion: "1.0.0" });
    const bodies = new Map<string, import("@chrysalis/webir").NodeId>();
    for (const file of ["scale_alpha.php", "scale_beta.php"] as const) {
      const ast = await parseFile(resolve(GAP_FIXTURE, "lib", file));
      for (const stmt of ast.statements) {
        if (stmt.kind !== "FunctionDecl") continue;
        bodies.set(stmt.name, convertPhpStatementsToBlock(builder, ast.file, stmt.body));
      }
    }
    const aliases = buildHelperLiftAliasMap(bodies, (id) => builder.get(id), { semantic: true });
    expect(aliases.get("chrysalis_scale_beta")).toBe("chrysalis_scale_alpha");
  });

  it("gap-probe alpha/beta are not aliased without semantic lift", async () => {
    const builder = new ModuleBuilder({ sourceApp: "gap", chrysalisVersion: "1.0.0" });
    const bodies = new Map<string, import("@chrysalis/webir").NodeId>();
    for (const file of ["scale_alpha.php", "scale_beta.php"] as const) {
      const ast = await parseFile(resolve(GAP_FIXTURE, "lib", file));
      for (const stmt of ast.statements) {
        if (stmt.kind !== "FunctionDecl") continue;
        bodies.set(stmt.name, convertPhpStatementsToBlock(builder, ast.file, stmt.body));
      }
    }
    const aliases = buildHelperLiftAliasMap(bodies, (id) => builder.get(id), { ignoreOrigin: true });
    expect(aliases.size).toBe(0);
    await expect(
      buildCallEffectMap(GAP_FIXTURE, undefined, { liftSharedHelpers: true }),
    ).resolves.toBeDefined();
  });

  it("lift-twin ingests with zero holes (default and lift + dedupe)", async () => {
    const base = await ingestDirectory(TWIN_FIXTURE);
    expect(countHoles(base)).toBe(0);
    const lifted = await ingestDirectory(TWIN_FIXTURE, {
      dedupeStructuralSubgraphs: true,
      liftSharedHelpers: true,
    });
    expect(countHoles(lifted)).toBe(0);
    expect(lifted.roots.length).toBe(2);
  });
});
