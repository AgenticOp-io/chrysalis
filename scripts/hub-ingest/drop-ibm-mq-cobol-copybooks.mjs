#!/usr/bin/env node
/**
 * Copy licensed IBM MQ COBOL copybooks into the gitignored CLBS drop path.
 *
 * Source (Windows MQ Advanced for Developers install):
 *   <MQ_INSTALL>\Tools\cobol\copybook\CMQ*.cpy   (or no extension / .CPY)
 * z/OS ADCD equivalent: thlqual.SCSQCOBC(CMQ*)
 *
 * Usage:
 *   node scripts/hub-ingest/drop-ibm-mq-cobol-copybooks.mjs
 *   node scripts/hub-ingest/drop-ibm-mq-cobol-copybooks.mjs --from "C:\\Program Files\\IBM\\MQ\\Tools\\cobol\\copybook"
 *   set CHRYSALIS_MQ_COBOL_COPYBOOK=C:\\path\\to\\copybook
 *
 * Never invent stubs. Never git-add the dropped files.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DROP = join(ROOT, "fixtures/hub-cobol-clbs-mini/copybook");

/** CardDemo residual P0 set */
const NEED = ["CMQGMOV", "CMQPMOV", "CMQMDV", "CMQODV", "CMQV", "CMQTML"];

const DEFAULT_CANDIDATES = [
  process.env.CHRYSALIS_MQ_COBOL_COPYBOOK,
  "C:\\Program Files\\IBM\\MQ\\Tools\\cobol\\copybook",
  "C:\\Program Files\\IBM\\WebSphere MQ\\Tools\\cobol\\copybook",
  "C:\\Program Files (x86)\\IBM\\MQ\\Tools\\cobol\\copybook",
].filter(Boolean);

function parseFromArg(argv) {
  const i = argv.indexOf("--from");
  if (i >= 0 && argv[i + 1]) return resolve(argv[i + 1]);
  return null;
}

function listFiles(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir);
}

function findMember(dir, name) {
  const files = listFiles(dir);
  const upper = name.toUpperCase();
  const hits = files.filter((f) => {
    const base = basename(f).toUpperCase();
    return (
      base === upper ||
      base === `${upper}.CPY` ||
      base === `${upper}.CBL` ||
      base === `${upper}.COB` ||
      base.startsWith(`${upper}.`)
    );
  });
  return hits[0] ? join(dir, hits[0]) : null;
}

function main() {
  const fromArg = parseFromArg(process.argv.slice(2));
  const candidates = fromArg ? [fromArg] : DEFAULT_CANDIDATES;
  const srcDir = candidates.find((d) => existsSync(d));

  if (!srcDir) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          reason: "mq-copybook-dir-not-found",
          tried: candidates,
          hint: "Install IBM MQ Advanced for Developers (Windows), then re-run with --from <Tools\\cobol\\copybook>",
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  mkdirSync(DROP, { recursive: true });
  const copied = [];
  const missing = [];

  for (const name of NEED) {
    const src = findMember(srcDir, name);
    if (!src) {
      missing.push(name);
      continue;
    }
    const dest = join(DROP, `${name}.cpy`);
    copyFileSync(src, dest);
    copied.push({ name, from: src, to: dest, bytes: statSync(dest).size });
  }

  const report = {
    ok: missing.length === 0,
    sourceDir: srcDir,
    dropDir: DROP,
    copied,
    missing,
    next: [
      "pnpm run hub:cobol-residual-ledger",
      "pnpm run hub:cobol-best-fit-smoke",
      "git check-ignore -v fixtures/hub-cobol-clbs-mini/copybook/CMQMDV.cpy",
      "Do NOT git add CMQ*.cpy",
    ],
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(missing.length === 0 ? 0 : 2);
}

main();
