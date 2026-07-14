#!/usr/bin/env node
/**
 * G9960 — Universal Translator canon lock smoke (D6438).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const checks = [];

function ok(name, cond, detail = "") {
  checks.push({ name, ok: !!cond, detail });
}

const canon = join(root, "docs/UNIVERSAL-TRANSLATOR-CANON.md");
const knowledge = join(root, "docs/initiative-knowledge.v1.json");
const strategic = join(root, "docs/STRATEGIC-PLAN.md");
const design = join(root, "DESIGN.md");
const roadmap = join(root, "ROADMAP.md");

ok("canon-exists", existsSync(canon));
ok("knowledge-exists", existsSync(knowledge));
ok("canon-mentions-G9960", readFileSync(canon, "utf8").includes("G9960"));
ok("canon-mentions-D6438", readFileSync(canon, "utf8").includes("D6438"));
ok("canon-wisp-poc-only", /WISP Module_Manager is POC/i.test(readFileSync(canon, "utf8")));
ok("design-D6438", /D6438/.test(readFileSync(design, "utf8")));
ok("strategic-canon", /UNIVERSAL-TRANSLATOR-CANON/.test(readFileSync(strategic, "utf8")));
ok("roadmap-G9960", /G9960/.test(readFileSync(roadmap, "utf8")));

const kn = JSON.parse(readFileSync(knowledge, "utf8"));
ok("knowledge-kind", kn.kind === "chrysalis.initiative-knowledge");
ok("knowledge-north-star-ut", /universal/i.test(JSON.stringify(kn.northStar ?? {})));

const passed = checks.every((c) => c.ok);
console.log(
  JSON.stringify(
    {
      kind: "chrysalis.ut.canon-lock-smoke",
      schemaVersion: 1,
      gate: "G9960",
      ok: passed,
      checks,
    },
    null,
    2,
  ),
);
process.exit(passed ? 0 : 1);
