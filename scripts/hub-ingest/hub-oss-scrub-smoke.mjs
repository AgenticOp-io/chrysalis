#!/usr/bin/env node
/**
 * OSS scrub packaging smoke (G10109) — tracked-tree secret / private-pack hygiene.
 * Closes the PUBLIC-ENGINE-CLAIM "no SA keys / .env / private pack in tree" check
 * for the **working tree** (not full git history — that remains an operator scrub).
 *
 * Gate: hub:oss-scrub-smoke
 * Docs: docs/PUBLIC-ENGINE-CLAIM.md · commercial/chrysalis-private-pack/07-oss-scrub-checklist.md
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Basename / path fragments that must not appear as tracked files. */
const FORBIDDEN_NAME_RE =
  /(^|[\\/])(\.env|\.env\.local|\.env\.production|credentials\.json|service[-_]?account.*\.json|firebase[-_]?adminsdk.*\.json|.*[-_]private[-_]?key\.pem|id_rsa|id_ed25519)([\\/]|$)/i;

/** Content patterns that fail when found in tracked text files (size-capped). */
const FORBIDDEN_CONTENT = [
  { id: "private-key-block", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { id: "google-sa-type", re: /"type"\s*:\s*"service_account"/ },
  { id: "aws-akia", re: /\bAKIA[0-9A-Z]{16}\b/ },
];

const SKIP_DIR = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  ".chrysalis-cobc",
  "vendor",
  "target",
  ".next",
  "build",
]);

const TEXT_EXT = new Set([
  ".md",
  ".mjs",
  ".js",
  ".cjs",
  ".ts",
  ".tsx",
  ".json",
  ".yml",
  ".yaml",
  ".env",
  ".txt",
  ".php",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".cs",
  ".rb",
  ".cbl",
  ".jcl",
  ".bms",
  ".cpy",
  ".sh",
  ".ps1",
  ".toml",
  ".xml",
  ".html",
  ".css",
  ".svg",
]);

/**
 * @param {string} dir
 * @param {string[]} out
 */
function walkTrackedish(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (SKIP_DIR.has(ent.name)) continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      walkTrackedish(p, out);
      continue;
    }
    if (!ent.isFile()) continue;
    out.push(p);
  }
}

/**
 * Prefer git ls-files when available; else walk (slower, includes untracked).
 * @returns {string[]}
 */
function listCandidateFiles() {
  const r = spawnSync("git", ["ls-files", "-z"], {
    cwd: ROOT,
    encoding: "buffer",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (r.status === 0 && r.stdout?.length) {
    const raw = r.stdout.toString("utf8");
    return raw
      .split("\0")
      .filter(Boolean)
      .map((rel) => join(ROOT, rel));
  }
  /** @type {string[]} */
  const out = [];
  walkTrackedish(ROOT, out);
  return out;
}

export async function runOssScrubSmoke() {
  /** @type {Array<{ id: string, ok: boolean, reason?: string }>} */
  const checks = [];
  /** @type {string[]} */
  const nameHits = [];
  /** @type {Array<{ file: string, id: string }>} */
  const contentHits = [];

  const files = listCandidateFiles();
  checks.push({
    id: "file-list",
    ok: files.length >= 100,
    reason: `files=${files.length}`,
  });

  for (const abs of files) {
    const rel = relative(ROOT, abs).split(sep).join("/");
    if (FORBIDDEN_NAME_RE.test(rel) || FORBIDDEN_NAME_RE.test(abs)) {
      nameHits.push(rel);
      continue;
    }
    // Engagement / private pack must not live inside the engine tree.
    if (
      /(^|\/)engagements\//i.test(rel) ||
      /(^|\/)chrysalis-private-pack\//i.test(rel)
    ) {
      nameHits.push(rel);
    }
  }

  checks.push({
    id: "forbidden-paths",
    ok: nameHits.length === 0,
    reason:
      nameHits.length === 0
        ? undefined
        : `hits=${nameHits.slice(0, 12).join(",")}`,
  });

  // Content scan — text-ish tracked files under 512 KiB.
  let scanned = 0;
  for (const abs of files) {
    const rel = relative(ROOT, abs).split(sep).join("/");
    const ext = rel.includes(".") ? `.${rel.split(".").pop()?.toLowerCase()}` : "";
    if (ext && !TEXT_EXT.has(ext) && !rel.endsWith("Dockerfile")) continue;
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (st.size > 512 * 1024) continue;
    let text;
    try {
      text = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    scanned += 1;
    for (const rule of FORBIDDEN_CONTENT) {
      if (rule.re.test(text)) {
        contentHits.push({ file: rel, id: rule.id });
      }
    }
  }

  checks.push({
    id: "forbidden-content",
    ok: contentHits.length === 0,
    reason:
      contentHits.length === 0
        ? `scanned=${scanned}`
        : contentHits
            .slice(0, 8)
            .map((h) => `${h.id}@${h.file}`)
            .join(","),
  });

  checks.push({
    id: "gitignore-env",
    ok: mustInclude(join(ROOT, ".gitignore"), ".env"),
  });

  checks.push({
    id: "private-pack-outside",
    ok: !existsSync(join(ROOT, "chrysalis-private-pack")) &&
      !existsSync(join(ROOT, "engagements")),
  });

  checks.push({
    id: "contributing-private",
    ok: mustInclude(
      join(ROOT, "CONTRIBUTING.md"),
      "private",
    ) || mustInclude(join(ROOT, "docs/PUBLIC-ENGINE-CLAIM.md"), "private adapters"),
  });

  checks.push({
    id: "public-claim-doc",
    ok: mustInclude(
      join(ROOT, "docs/PUBLIC-ENGINE-CLAIM.md"),
      "oss-scrub",
      "hub:oss-scrub-smoke",
    ),
  });

  const pkg = readFileSync(join(ROOT, "package.json"), "utf8");
  checks.push({
    id: "package-script",
    ok: pkg.includes("hub:oss-scrub-smoke"),
  });

  const ok = checks.every((c) => c.ok);
  const report = {
    kind: "chrysalis.hub.oss-scrub-smoke",
    schemaVersion: 1,
    ok,
    checks,
    failed: checks.filter((c) => !c.ok),
    nameHits: nameHits.slice(0, 50),
    contentHits: contentHits.slice(0, 50),
    note: "Working-tree / git ls-files scrub only — full history rewrite remains operator (07-oss-scrub-checklist.md)",
    generatedAt: new Date().toISOString(),
  };

  const outDir = join(ROOT, "reports/pilot-kit");
  try {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      join(outDir, "oss-scrub-smoke.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
  } catch {
    /* ignore */
  }

  return report;
}

/**
 * @param {string} path
 * @param {...string} needles
 */
function mustInclude(path, ...needles) {
  if (!existsSync(path)) return false;
  const t = readFileSync(path, "utf8");
  return needles.every((n) => t.includes(n));
}

async function main() {
  const r = await runOssScrubSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-oss-scrub-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
