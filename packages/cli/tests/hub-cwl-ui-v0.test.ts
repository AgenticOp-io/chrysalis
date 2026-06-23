import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function importGate(relPath: string, fn: string, opts: Record<string, unknown> = {}) {
  const r = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { ${fn} as gate } from "./${relPath.replace(/\\/g, "/")}"; console.log(JSON.stringify(await gate(${JSON.stringify(opts)})));`,
    ],
    { cwd: ROOT, encoding: "utf8", timeout: 600_000 },
  );
  return JSON.parse(r.trim());
}

test("cwl ui v0 parser: return ui element tree (RFC-0017)", async () => {
  const { parseCwlModule } = await import(resolve(ROOT, "scripts/hub-ingest/cwl-parser.mjs"));
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(resolve(ROOT, "fixtures/hub-gold-cwl-ui-v0/routes.cwl"), "utf8");
  const mod = parseCwlModule(src, "routes.cwl");
  const demo = mod.routes.find((r) => r.path === "/ui-v0");
  expect(demo?.body.kind).toBe("ui");
  expect(demo?.body.tree?.kind).toBe("element");
  expect(demo?.body.tree?.tag).toBe("main");
  const named = mod.routes.find((r) => r.path === "/ui-v0/:name");
  expect(named?.handlerPathParams).toEqual(["name"]);
});

test("cwl phase 15 entry smoke (G7101)", () => {
  const gate = importGate(
    "scripts/hub-ingest/hub-cwl-phase15-entry-smoke.mjs",
    "runCwlPhase15EntryGate",
  );
  expect(gate.ok).toBe(true);
});

test("cwl ui v0 smoke (G7111)", () => {
  const gate = importGate("scripts/hub-ingest/hub-cwl-ui-v0-smoke.mjs", "runCwlUiV0Gate");
  expect(gate.ok).toBe(true);
}, 300_000);
