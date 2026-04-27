import { describe, expect, test } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { effectTagsSorted } from "@chrysalis/webir";
import { ingestDirectory } from "../src/index.js";

describe("ingest: route-file call effects", () => {
  test("merges effects from a same-file top-level function into the handler", async () => {
    const root = mkdtempSync(join(tmpdir(), "chrysalis-ingest-"));
    try {
      mkdirSync(join(root, "pages"), { recursive: true });
      writeFileSync(
        join(root, "chrysalis.routes.json"),
        JSON.stringify({
          app: "test-app",
          routes: [
            {
              method: "GET",
              path: "/x",
              file: "pages/x.php",
              pathParams: [],
            },
          ],
        }),
        "utf8",
      );
      writeFileSync(
        join(root, "pages/x.php"),
        `<?php
function row_from_users() {
  return query_one("SELECT id FROM users WHERE id = 1", []);
}
$r = row_from_users();
echo "ok";
`,
        "utf8",
      );

      const mod = await ingestDirectory(root);
      expect(mod.roots.length).toBe(1);
      const route = mod.nodes.get(mod.roots[0]!)!;
      const handler = mod.nodes.get(route.operands[0]!)!;
      expect(effectTagsSorted(handler.effects)).toEqual(["db.read:users"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("merges effects from vendor helper functions when lib does not override", async () => {
    const root = mkdtempSync(join(tmpdir(), "chrysalis-ingest-"));
    try {
      mkdirSync(join(root, "pages"), { recursive: true });
      mkdirSync(join(root, "vendor", "acme"), { recursive: true });
      writeFileSync(
        join(root, "chrysalis.routes.json"),
        JSON.stringify({
          app: "test-app",
          routes: [
            {
              method: "GET",
              path: "/x",
              file: "pages/x.php",
              pathParams: [],
            },
          ],
        }),
        "utf8",
      );
      writeFileSync(
        join(root, "vendor/acme/helpers.php"),
        `<?php
function vendor_row_from_users() {
  return query_one("SELECT id FROM users WHERE id = 1", []);
}
`,
        "utf8",
      );
      writeFileSync(
        join(root, "pages/x.php"),
        `<?php
$r = vendor_row_from_users();
echo "ok";
`,
        "utf8",
      );

      const mod = await ingestDirectory(root);
      expect(mod.roots.length).toBe(1);
      const route = mod.nodes.get(mod.roots[0]!)!;
      const handler = mod.nodes.get(route.operands[0]!)!;
      expect(effectTagsSorted(handler.effects)).toEqual(["db.read:users"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("namespaced vendor FunctionDecl matches FQN call without tail widening", async () => {
    const root = mkdtempSync(join(tmpdir(), "chrysalis-ingest-"));
    try {
      mkdirSync(join(root, "pages"), { recursive: true });
      mkdirSync(join(root, "vendor", "acme"), { recursive: true });
      writeFileSync(
        join(root, "chrysalis.routes.json"),
        JSON.stringify({
          app: "test-app",
          routes: [
            {
              method: "GET",
              path: "/x",
              file: "pages/x.php",
              pathParams: [],
            },
          ],
        }),
        "utf8",
      );
      writeFileSync(
        join(root, "vendor/acme/helpers.php"),
        `<?php
namespace Acme\\Helpers;

function ns_row_from_users() {
  return query_one("SELECT id FROM users WHERE id = 1", []);
}
`,
        "utf8",
      );
      writeFileSync(
        join(root, "pages/x.php"),
        `<?php
$r = \\Acme\\Helpers\\ns_row_from_users();
echo "ok";
`,
        "utf8",
      );

      const mod = await ingestDirectory(root);
      expect(mod.roots.length).toBe(1);
      const route = mod.nodes.get(mod.roots[0]!)!;
      const handler = mod.nodes.get(route.operands[0]!)!;
      expect(effectTagsSorted(handler.effects)).toEqual(["db.read:users"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("resolves fully-qualified call to vendor helper keyed by short name", async () => {
    const root = mkdtempSync(join(tmpdir(), "chrysalis-ingest-"));
    try {
      mkdirSync(join(root, "pages"), { recursive: true });
      mkdirSync(join(root, "vendor", "acme"), { recursive: true });
      writeFileSync(
        join(root, "chrysalis.routes.json"),
        JSON.stringify({
          app: "test-app",
          routes: [
            {
              method: "GET",
              path: "/x",
              file: "pages/x.php",
              pathParams: [],
            },
          ],
        }),
        "utf8",
      );
      writeFileSync(
        join(root, "vendor/acme/helpers.php"),
        `<?php
function fq_vendor_row() {
  return query_one("SELECT id FROM users WHERE id = 1", []);
}
`,
        "utf8",
      );
      writeFileSync(
        join(root, "pages/x.php"),
        `<?php
$r = \\Acme\\Helpers\\fq_vendor_row();
echo "ok";
`,
        "utf8",
      );

      const mod = await ingestDirectory(root);
      expect(mod.roots.length).toBe(1);
      const route = mod.nodes.get(mod.roots[0]!)!;
      const handler = mod.nodes.get(route.operands[0]!)!;
      expect(effectTagsSorted(handler.effects)).toEqual(["db.read:users"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("prefers lib helper over vendor helper for same function name", async () => {
    const root = mkdtempSync(join(tmpdir(), "chrysalis-ingest-"));
    try {
      mkdirSync(join(root, "lib"), { recursive: true });
      mkdirSync(join(root, "pages"), { recursive: true });
      mkdirSync(join(root, "vendor", "acme"), { recursive: true });
      writeFileSync(
        join(root, "chrysalis.routes.json"),
        JSON.stringify({
          app: "test-app",
          routes: [
            {
              method: "GET",
              path: "/x",
              file: "pages/x.php",
              pathParams: [],
            },
          ],
        }),
        "utf8",
      );
      writeFileSync(
        join(root, "vendor/acme/helpers.php"),
        `<?php
function shared_helper() {
  return query_one("SELECT id FROM users WHERE id = 1", []);
}
`,
        "utf8",
      );
      writeFileSync(
        join(root, "lib/helpers.php"),
        `<?php
function shared_helper() {
  exec_sql("UPDATE users SET name = 'x' WHERE id = 1", []);
  return 1;
}
`,
        "utf8",
      );
      writeFileSync(
        join(root, "pages/x.php"),
        `<?php
shared_helper();
echo "ok";
`,
        "utf8",
      );

      const mod = await ingestDirectory(root);
      expect(mod.roots.length).toBe(1);
      const route = mod.nodes.get(mod.roots[0]!)!;
      const handler = mod.nodes.get(route.operands[0]!)!;
      expect(effectTagsSorted(handler.effects)).toEqual(["db.write:users"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
