import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { ingestDirectory } from "../src/index.js";
import { countHoles, walk } from "@chrysalis/webir";

describe("dbFactoryReturnCallees manifest", () => {
  test("without manifest entry, static factory ->query is legacy:db-query-unknown-receiver", async () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-db-factory-"));
    try {
      mkdirSync(join(dir, "lib"), { recursive: true });
      mkdirSync(join(dir, "pages"), { recursive: true });
      writeFileSync(
        join(dir, "lib", "db.php"),
        `<?php
function db(): mysqli {
  return new mysqli();
}
`,
        "utf8",
      );
      writeFileSync(
        join(dir, "lib", "X.php"),
        `<?php
require_once __DIR__ . '/db.php';
class X {
  public static function conn(): mysqli { return db(); }
}
`,
        "utf8",
      );
      writeFileSync(
        join(dir, "pages", "p.php"),
        `<?php
require_once __DIR__ . '/../lib/X.php';
$r = X::conn()->query("SELECT 1");
`,
        "utf8",
      );
      writeFileSync(
        join(dir, "chrysalis.routes.json"),
        JSON.stringify({
          app: "db-factory-neg",
          routes: [{ method: "GET", path: "/x", file: "pages/p.php", pathParams: [] }],
        }),
        "utf8",
      );

      const mod = await ingestDirectory(dir);
      expect(countHoles(mod)).toBeGreaterThan(0);
      const reasons: string[] = [];
      walk(mod, (n) => {
        if (n.dialect === "data" && n.op === "hole" && typeof n.attrs.reason === "string") {
          reasons.push(n.attrs.reason);
        }
      });
      expect(reasons.some((r) => r.includes("legacy:db-query-unknown-receiver"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("with manifest entry, static factory ->query lowers to db.read", async () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-db-factory-pos-"));
    try {
      mkdirSync(join(dir, "lib"), { recursive: true });
      mkdirSync(join(dir, "pages"), { recursive: true });
      writeFileSync(
        join(dir, "lib", "db.php"),
        `<?php
function db(): mysqli {
  return new mysqli();
}
`,
        "utf8",
      );
      writeFileSync(
        join(dir, "lib", "X.php"),
        `<?php
require_once __DIR__ . '/db.php';
class X {
  public static function conn(): mysqli { return db(); }
}
`,
        "utf8",
      );
      writeFileSync(
        join(dir, "pages", "p.php"),
        `<?php
require_once __DIR__ . '/../lib/X.php';
$r = X::conn()->query("SELECT 1");
`,
        "utf8",
      );
      writeFileSync(
        join(dir, "chrysalis.routes.json"),
        JSON.stringify({
          app: "db-factory-pos",
          dbFactoryReturnCallees: ["X::conn"],
          routes: [{ method: "GET", path: "/x", file: "pages/p.php", pathParams: [] }],
        }),
        "utf8",
      );

      const mod = await ingestDirectory(dir);
      expect(countHoles(mod)).toBe(0);
      let sawDb = false;
      walk(mod, (n) => {
        if (n.dialect === "effect" && n.op === "db.query") {
          sawDb = true;
        }
      });
      expect(sawDb).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
