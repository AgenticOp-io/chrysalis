import { describe, expect, test } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ingestDirectory } from "../src/index.js";

describe("ingest: extra PHP lowerings", () => {
  test("parse_url + getrandmax + microtime(true) + uniqid", async () => {
    const root = mkdtempSync(join(tmpdir(), "chrysalis-ingest-ex-"));
    try {
      mkdirSync(join(root, "pages"), { recursive: true });
      writeFileSync(
        join(root, "chrysalis.routes.json"),
        JSON.stringify({
          app: "ex",
          routes: [{ method: "GET", path: "/x", file: "pages/x.php", pathParams: [] }],
        }),
        "utf8",
      );
      writeFileSync(
        join(root, "pages/x.php"),
        `<?php
$a = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$b = getrandmax();
$c = microtime(true);
$d = uniqid("p_", true);
$e = microtime();
$f = parse_url("http://example.com/p?q=1");
$j = json_encode(["k" => "v"]);
echo htmlspecialchars($a . $b . $c . $d . $e . ($f["path"] ?? "") . $j);
`,
        "utf8",
      );

      const mod = await ingestDirectory(root);
      let parseUrlComponentCalls = 0;
      let parseUrlPartsCalls = 0;
      let getrandmaxLits = 0;
      let epochFloat = 0;
      let uniqidTime = 0;
      let dechexCalls = 0;
      let microtimeStringCalls = 0;
      let jsonEncodeCalls = 0;
      let objectLiteralCalls = 0;
      for (const [, n] of mod.nodes) {
        const callee = (n.attrs as { callee?: string }).callee;
        if (n.dialect === "data" && n.op === "call" && callee === "parseUrlComponent") {
          parseUrlComponentCalls++;
        }
        if (n.dialect === "data" && n.op === "call" && callee === "parseUrlParts") {
          parseUrlPartsCalls++;
        }
        if (n.dialect === "data" && n.op === "call" && callee === "microtimeString") {
          microtimeStringCalls++;
        }
        if (n.dialect === "data" && n.op === "call" && callee === "json_encode") {
          jsonEncodeCalls++;
        }
        if (n.dialect === "data" && n.op === "call" && callee === "__object_literal") {
          objectLiteralCalls++;
        }
        if (n.dialect === "data" && n.op === "call" && callee === "__dechex") {
          dechexCalls++;
        }
        if (n.dialect === "data" && n.op === "literal" && n.attrs.value === 2_147_483_647) {
          getrandmaxLits++;
        }
        if (n.dialect === "effect" && n.op === "time.now" && n.attrs.format === "epoch_float") {
          epochFloat++;
        }
        if (n.dialect === "effect" && n.op === "time.now" && n.attrs.format === "epoch_ms") {
          uniqidTime++;
        }
      }
      expect(parseUrlComponentCalls).toBe(1);
      expect(parseUrlPartsCalls).toBe(1);
      expect(microtimeStringCalls).toBe(1);
      expect(getrandmaxLits).toBe(1);
      expect(epochFloat).toBe(2);
      expect(uniqidTime).toBe(1);
      expect(dechexCalls).toBeGreaterThanOrEqual(2);
      expect(jsonEncodeCalls).toBe(1);
      expect(objectLiteralCalls).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("query_one folds static string concat to literal SQL", async () => {
    const root = mkdtempSync(join(tmpdir(), "chrysalis-ingest-sqlfold-"));
    try {
      mkdirSync(join(root, "lib"), { recursive: true });
      mkdirSync(join(root, "pages"), { recursive: true });
      writeFileSync(
        join(root, "lib/db.php"),
        `<?php
function query_one(string $sql, array $params = []): ?array {
  return null;
}
`,
        "utf8",
      );
      writeFileSync(
        join(root, "chrysalis.routes.json"),
        JSON.stringify({
          app: "sqlfold",
          routes: [{ method: "GET", path: "/q", file: "pages/q.php", pathParams: [] }],
        }),
        "utf8",
      );
      writeFileSync(
        join(root, "pages/q.php"),
        `<?php
require __DIR__ . "/../lib/db.php";
$row = query_one("SELECT " . "1 AS x", []);
echo "ok";
`,
        "utf8",
      );

      const mod = await ingestDirectory(root);
      const sqls: string[] = [];
      for (const [, n] of mod.nodes) {
        if (n.dialect === "effect" && n.op === "db.query") {
          sqls.push(String((n.attrs as { sql?: string }).sql ?? ""));
        }
      }
      expect(sqls.some((s) => s.includes("SELECT 1 AS x"))).toBe(true);
      expect(sqls.some((s) => s === "<dynamic>")).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("query_one folds left-associative multi-segment string concat for SQL", async () => {
    const root = mkdtempSync(join(tmpdir(), "chrysalis-ingest-sqlfold3-"));
    try {
      mkdirSync(join(root, "lib"), { recursive: true });
      mkdirSync(join(root, "pages"), { recursive: true });
      writeFileSync(
        join(root, "lib/db.php"),
        `<?php
function query_one(string $sql, array $params = []): ?array {
  return null;
}
`,
        "utf8",
      );
      writeFileSync(
        join(root, "chrysalis.routes.json"),
        JSON.stringify({
          app: "sqlfold3",
          routes: [{ method: "GET", path: "/q", file: "pages/q.php", pathParams: [] }],
        }),
        "utf8",
      );
      writeFileSync(
        join(root, "pages/q.php"),
        `<?php
require __DIR__ . "/../lib/db.php";
$row = query_one("WITH " . "t AS (SELECT 1) " . "SELECT * FROM t", []);
echo "ok";
`,
        "utf8",
      );

      const mod = await ingestDirectory(root);
      const sqls: string[] = [];
      for (const [, n] of mod.nodes) {
        if (n.dialect === "effect" && n.op === "db.query") {
          sqls.push(String((n.attrs as { sql?: string }).sql ?? ""));
        }
      }
      expect(sqls.some((s) => s.includes("WITH t AS (SELECT 1) SELECT * FROM t"))).toBe(true);
      expect(sqls.some((s) => s === "<dynamic>")).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
