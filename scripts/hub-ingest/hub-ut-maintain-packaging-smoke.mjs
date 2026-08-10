#!/usr/bin/env node
/**
 * G9991 — Post–G9990 operator packaging maintain (D6440).
 * README → UT Canon; chrysalis chat ungated; convert-site skip paths; IDENT helper.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { toCwlIdent } from "./hub-webir-routes.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const checks = [];

function ok(name, cond, detail = "") {
  checks.push({ name, ok: !!cond, detail });
}

const readme = readFileSync(join(root, "README.md"), "utf8");
ok("readme-ut-canon", /UNIVERSAL-TRANSLATOR-CANON/.test(readme));
ok("readme-g9990", /G9990/.test(readme));

const pillarHome = readFileSync(join(root, "docs/CWL-PILLAR-HOME.md"), "utf8");
ok(
  "cwl-helix-spine-owned-by-cwl",
  /smoke:ut-spine/.test(pillarHome) && /does \*\*not\*\* own DNA/.test(pillarHome),
);
ok(
  "cwl-helix-cutover-script",
  existsSync(join(root, "scripts/hub-ingest/hub-cwl-helix-cutover-smoke.mjs")),
);
const pkgJson = readFileSync(join(root, "package.json"), "utf8");
ok("pkg-cwl-helix-cutover", /hub:cwl-helix-cutover-smoke/.test(pkgJson));
ok("pkg-cwl-ingest-matrix", /hub:cwl-ingest-matrix-smoke/.test(pkgJson));
ok("pkg-cwl-pin-smoke", /hub:cwl-pin-smoke/.test(pkgJson));
ok("pkg-webir-resolve-smoke", /hub:webir-resolve-smoke/.test(pkgJson));
ok("pkg-phoenix-controllers-smoke", /hub:phoenix-controllers-smoke/.test(pkgJson));
ok(
  "pkg-webir-from-cwl-dep",
  /"@chrysalis\/webir"\s*:\s*"file:\.\.\/chrysalis-cwl\/packages\/webir"/.test(pkgJson) ||
    /"@chrysalis\/webir"\s*:\s*"workspace:\*"/.test(pkgJson),
);
ok("pkg-link-webir-from-cwl", /link:webir-from-cwl/.test(pkgJson));
ok("pkg-webir-reverse-home-doc", existsSync(join(root, "docs/WEBIR-REVERSE-HOME.md")));
ok("pkg-convert-cwl-consume-doc", existsSync(join(root, "docs/CONVERT-CWL-CONSUME.md")));
ok("pkg-npmrc-example", existsSync(join(root, ".npmrc.example")));
ok("pkg-no-pilot-ut-spine", !/"pilot:ut-spine"/.test(pkgJson));
ok(
  "cwl-ingest-matrix-script",
  existsSync(join(root, "scripts/hub-ingest/hub-cwl-ingest-matrix-smoke.mjs")),
);

const binSrc = readFileSync(join(root, "packages/cli/src/bin.ts"), "utf8");
ok("cli-chat-subcommand", /\[\s*"chat"/.test(binSrc) || /case "chat"/.test(binSrc));
ok("cli-chat-license-ungated", /cmd === "chat"/.test(binSrc) && /runLicenseGate/.test(binSrc));
ok("cli-skip-http-path", /--skip-http-path/.test(binSrc));

ok("toCwlIdent-dots", toCwlIdent("config.json") === "config_json");
ok("toCwlIdent-nested", toCwlIdent("chrysalis.oracle-probe-routes.json").startsWith("chrysalis_"));

const chatSmoke = spawnSync(process.execPath, [join(root, "scripts/hub-ingest/hub-migration-chat-smoke.mjs")], {
  cwd: root,
  encoding: "utf8",
});
ok("migration-chat-smoke", (chatSmoke.status ?? 1) === 0, String(chatSmoke.status));

const distBin = join(root, "packages/cli/dist/bin.js");
ok("cli-dist-built", existsSync(distBin));
if (existsSync(distBin)) {
  const dist = readFileSync(distBin, "utf8");
  ok("cli-dist-has-chat", /\bchat\b/.test(dist) && /chrysalis-migration-chat/.test(dist));
}

const passed = checks.every((c) => c.ok);
console.log(
  JSON.stringify(
    {
      kind: "chrysalis.ut.maintain-packaging-smoke",
      schemaVersion: 1,
      gate: "G9991",
      ok: passed,
      checks,
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
process.exit(passed ? 0 : 1);
