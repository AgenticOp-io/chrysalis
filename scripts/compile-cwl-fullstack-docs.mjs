#!/usr/bin/env node
/**
 * Compile per-queue CWL full-stack build docs into a single archived log.
 * Run once when consolidating docs/CWL-FULLSTACK-{NEXT-10,QUEUES}-*.md
 */
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = join(repoRoot, "docs");
const archiveDir = join(docsDir, "archive");
const outPath = join(archiveDir, "CWL-FULLSTACK-BUILD-LOG.md");

function queueNumFromNext10(name) {
  if (name === "CWL-FULLSTACK-NEXT-10.md") return 1;
  const m = /^CWL-FULLSTACK-NEXT-10-(\d+)\.md$/.exec(name);
  return m ? Number(m[1]) : null;
}

function rangeSortKey(name) {
  const m = /^CWL-FULLSTACK-QUEUES-(\d+)-(\d+)\.md$/.exec(name);
  if (m) return [Number(m[1]), Number(m[2])];
  if (name === "CWL-FULLSTACK-QUEUES-6-20.md") return [6, 20];
  if (name === "CWL-FULLSTACK-QUEUES-71-90.md") return [71, 90];
  if (name === "CWL-FULLSTACK-QUEUES-91-110.md") return [91, 110];
  if (name === "CWL-FULLSTACK-QUEUES-411-437.md") return [411, 437];
  return [9999, 9999];
}

async function main() {
  const all = await readdir(docsDir);
  const queueIndexFiles = all
    .filter((f) => f.startsWith("CWL-FULLSTACK-QUEUES-") && f.endsWith(".md"))
    .sort((a, b) => {
      const ka = rangeSortKey(a);
      const kb = rangeSortKey(b);
      return ka[0] - kb[0] || ka[1] - kb[1];
    });
  const next10Files = all
    .filter((f) => f.startsWith("CWL-FULLSTACK-NEXT-10") && f.endsWith(".md"))
    .sort((a, b) => (queueNumFromNext10(a) ?? 0) - (queueNumFromNext10(b) ?? 0));

  const lines = [
    "# CWL full-stack program — build log (archived)",
    "",
    "> **Compiled:** 2026-06-17",
    "> **Source:** `docs/CWL-FULLSTACK-QUEUES-*.md` and `docs/CWL-FULLSTACK-NEXT-10*.md`",
    "> **Status:** program **closed** at queue **437** (hub-completion schema **510**); **maintenance only**.",
    "> **Authority:** [`docs/CWL-FULLSTACK-PROGRAM.md`](../CWL-FULLSTACK-PROGRAM.md), [`docs/STRATEGIC-PLAN.md`](../STRATEGIC-PLAN.md).",
    "",
    "Per-queue step files were build-progress logs generated during the G1159–G4956 authoring program.",
    "They are preserved here for audit; do not add new per-queue markdown files.",
    "",
    "---",
    "",
    "## Part I — Queue range indexes",
    "",
  ];

  for (const file of queueIndexFiles) {
    const text = await readFile(join(docsDir, file), "utf8");
    const anchor = file.replace(/\.md$/, "").toLowerCase();
    lines.push(`<a id="${anchor}"></a>`, "", `## ${file}`, "", text.trim(), "", "---", "");
  }

  lines.push("## Part II — Per-queue steps", "");

  for (const file of next10Files) {
    const n = queueNumFromNext10(file);
    const text = await readFile(join(docsDir, file), "utf8");
    lines.push(`<a id="queue-${n}"></a>`, "", `## Queue ${n} (\`${file}\`)`, "", text.trim(), "", "---", "");
  }

  await mkdir(archiveDir, { recursive: true });
  await writeFile(outPath, `${lines.join("\n")}\n`, "utf8");
  console.log(
    JSON.stringify({
      ok: true,
      outPath,
      queueIndexCount: queueIndexFiles.length,
      next10Count: next10Files.length,
      bytes: Buffer.byteLength(lines.join("\n")),
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
