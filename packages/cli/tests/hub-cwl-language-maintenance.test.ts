import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";

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

describe("hub cwl language maintenance", () => {
  it("cwl language maintenance gate (G6731)", () => {
    const gate = importGate(
      "scripts/hub-ingest/hub-cwl-language-maintenance-smoke.mjs",
      "runCwlLanguageMaintenanceGate",
    );
    expect(gate.ok).toBe(true);
    expect(gate.doc.ok).toBe(true);
    expect(gate.taxonomy.ok).toBe(true);
    expect(gate.b7.ok).toBe(true);
    expect(gate.b8.ok).toBe(true);
    expect(gate.b9.ok).toBe(true);
    expect(gate.b10.ok).toBe(true);
    expect(gate.b11.ok).toBe(true);
    expect(gate.b12.ok).toBe(true);
    expect(gate.b13.ok).toBe(true);
    expect(gate.b14.ok).toBe(true);
    expect(gate.b15.ok).toBe(true);
    expect(gate.b16.ok).toBe(true);
    expect(gate.b17.ok).toBe(true);
    expect(gate.b18.ok).toBe(true);
    expect(gate.b19.ok).toBe(true);
    expect(gate.b20.ok).toBe(true);
    expect(gate.b21.ok).toBe(true);
    expect(gate.b22.ok).toBe(true);
    expect(gate.b23.ok).toBe(true);
    expect(gate.b24.ok).toBe(true);
    expect(gate.b25.ok).toBe(true);
    expect(gate.b26.ok).toBe(true);
    expect(gate.b27.ok).toBe(true);
    expect(gate.b28.ok).toBe(true);
    expect(gate.b29.ok).toBe(true);
    expect(gate.b30.ok).toBe(true);
    expect(gate.b31.ok).toBe(true);
    expect(gate.b32.ok).toBe(true);
    expect(gate.b33.ok).toBe(true);
    expect(gate.b34.ok).toBe(true);
    expect(gate.b35.ok).toBe(true);
    expect(gate.b36.ok).toBe(true);
    expect(gate.b37.ok).toBe(true);
    expect(gate.b38.ok).toBe(true);
  }, 180_000);
});
