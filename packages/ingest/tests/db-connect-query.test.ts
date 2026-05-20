import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { countHoles, effectTagsSorted, walk } from "@chrysalis/webir";
import { ingestDirectory } from "../src/index.js";

describe("ingest: db_connect()->query lowering", () => {
  test("lowers chained db_connect()->query without db-query-unknown-receiver hole", async () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-db-connect-"));
    try {
      mkdirSync(join(dir, "lib"), { recursive: true });
      mkdirSync(join(dir, "pages"), { recursive: true });
      writeFileSync(
        join(dir, "lib", "db.php"),
        `<?php
function db_connect(): PDO {
  return new PDO("sqlite::memory:");
}
`,
        "utf8",
      );
      writeFileSync(
        join(dir, "pages", "p.php"),
        `<?php
require_once __DIR__ . '/../lib/db.php';
$stmt = db_connect()->query("SELECT id FROM items");
echo "ok";
`,
        "utf8",
      );
      writeFileSync(
        join(dir, "chrysalis.routes.json"),
        JSON.stringify({
          app: "db-connect-probe",
          routes: [{ method: "GET", path: "/x", file: "pages/p.php", pathParams: [] }],
        }),
        "utf8",
      );

      const mod = await ingestDirectory(dir);
      expect(countHoles(mod)).toBe(0);
      const dbReads: string[] = [];
      walk(mod, (n) => {
        if (n.dialect === "effect" && n.op === "db.query" && n.attrs.kind === "read") {
          dbReads.push(String(n.attrs.sql ?? ""));
        }
      });
      expect(dbReads.some((s) => /items/i.test(s))).toBe(true);
      const route = mod.nodes.get(mod.roots[0]!)!;
      const handler = mod.nodes.get(route.operands[0]!)!;
      expect(effectTagsSorted(handler.effects).some((t) => t.startsWith("db.read:"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
