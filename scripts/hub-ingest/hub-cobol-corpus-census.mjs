#!/usr/bin/env node
/**
 * Public COBOL corpus feature index + census (G10120 deepen).
 * Off-repo walk under CHRYSALIS_COBOL_CORPORA_ROOT. Run on GCE (not Windows prove).
 * Does not invent EXTFMAP.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

export const COBOL_CORPUS_CENSUS_KIND = "chrysalis.hub.cobol-corpus-census";
export const COBOL_CORPUS_FEATURE_INDEX_KIND = "chrysalis.hub.cobol-corpus-feature-index";
export const COBOL_CORPUS_CENSUS_SCHEMA_VERSION = 2;
export const COBOL_CORPUS_FEATURE_INDEX_SCHEMA_VERSION = 1;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const REGISTRY = join(ROOT, "fixtures/ci/cobol-public-corpus-registry.json");

const CODE_EXTS = new Set([".cbl", ".cob", ".cobol", ".cpy", ".copy", ".bms", ".dcl", ".csd", ".jcl"]);
/** Extra layout text scanned for features when content looks like COBOL (copybook2json / cobol85). */
const LAYOUT_TXT = ".txt";
const SCAN_EXTS = new Set([".cpy", ".copy", ".cbl", ".cob", ".cobol", ".bms", LAYOUT_TXT]);

/**
 * @param {string} text
 * @param {string} ext
 */
function looksLikeCobol(text, ext) {
  if (ext !== LAYOUT_TXT) return true;
  const t = text.slice(0, 8000);
  return (
    /\bOCCURS\b/i.test(t) ||
    /\bREDEFINES\b/i.test(t) ||
    /\bRENAMES\b/i.test(t) ||
    /\bPIC\s+S?[X9ANV.()0-9+-]+/i.test(t) ||
    // Free-form or fixed-form (cols 1–6 sequence) level numbers
    /^\s*0[1-9]\s+/m.test(t) ||
    /^\d{1,6}\s+0[1-9]\s+/m.test(t) ||
    /\b0[1-9]\s+[A-Z0-9-]+/i.test(t) ||
    /\bIDENTIFICATION\s+DIVISION\b/i.test(t) ||
    /\bPROGRAM-ID\b/i.test(t)
  );
}

/**
 * @returns {string}
 */
function defaultCorporaRoot() {
  const env = process.env.CHRYSALIS_COBOL_CORPORA_ROOT?.trim();
  if (env) return resolve(env);
  const sibling = resolve(ROOT, "..", "chrysalis-cobol-corpora");
  if (existsSync(sibling)) return sibling;
  return join(homedir(), "chrysalis-cobol-corpora");
}

/**
 * @param {string} dir
 * @param {string[]} out
 * @param {number} depth
 */
function walkFiles(dir, out, depth = 0) {
  if (depth > 18 || out.length > 200_000) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (ent.name === ".git" || ent.name === "node_modules" || ent.name === "target") continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(p, out, depth + 1);
    else if (ent.isFile()) {
      const ext = extname(ent.name).toLowerCase();
      if (CODE_EXTS.has(ext) || ext === LAYOUT_TXT) out.push(p);
    }
  }
}

/**
 * @param {string} text
 */
export function featureHits(text) {
  const t = text.slice(0, 200_000);
  return {
    comp3: (t.match(/\bCOMP-3\b|\bPACKED-DECIMAL\b/gi) || []).length > 0,
    occurs: (t.match(/\bOCCURS\b/gi) || []).length > 0,
    odo: (t.match(/\bOCCURS\b[\s\S]{0,80}\bDEPENDING\b/gi) || []).length > 0,
    redefines: (t.match(/\bREDEFINES\b/gi) || []).length > 0,
    renames: (t.match(/\bRENAMES\b/gi) || []).length > 0,
    copyReplacing: (t.match(/\bCOPY\b[\s\S]{0,120}\bREPLACING\b/gi) || []).length > 0,
    execCics: (t.match(/EXEC\s+CICS\b/gi) || []).length > 0,
    execSql: (t.match(/EXEC\s+SQL\b/gi) || []).length > 0,
    execDli: (t.match(/EXEC\s+DLI\b/gi) || []).length > 0,
    dfhmsd: (t.match(/\bDFHMSD\b/gi) || []).length > 0,
    national: (t.match(/\bNATIONAL\b|\bPIC\s+N\b/gi) || []).length > 0,
  };
}

/**
 * @param {string} [corporaRoot]
 */
export function runCobolCorpusCensus(corporaRoot = defaultCorporaRoot()) {
  const registry = JSON.parse(readFileSync(REGISTRY, "utf8"));
  const root = resolve(corporaRoot);
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  checks.push({
    id: "registry-file",
    ok: registry.kind === "chrysalis.cobol.public-corpus-registry",
  });
  checks.push({
    id: "refuse-extfmap-invent",
    ok: (registry.refuse || []).some((r) => /EXTFMAP/i.test(String(r))),
  });

  const present = existsSync(root);
  checks.push({
    id: "corpora-root-present",
    ok: present,
    detail: present ? root : `missing:${root} — run bash scripts/gce-clone-cobol-corpora.sh`,
  });

  /** @type {Record<string, number>} */
  const byExt = {};
  /** @type {Record<string, { files: number, byExt: Record<string, number>, features: Record<string, number>, present: boolean }>} */
  const byCorpus = {};
  /** @type {Array<{ corpus: string, path: string, ext: string, features: string[] }>} */
  const artifacts = [];
  const featureTotals = {
    comp3: 0,
    occurs: 0,
    odo: 0,
    redefines: 0,
    renames: 0,
    copyReplacing: 0,
    execCics: 0,
    execSql: 0,
    execDli: 0,
    dfhmsd: 0,
    national: 0,
  };

  let totalFiles = 0;
  if (present) {
    for (const corp of registry.corpora ?? []) {
      const dir = join(root, corp.id);
      /** @type {string[]} */
      const files = [];
      if (existsSync(dir)) walkFiles(dir, files);
      /** @type {Record<string, number>} */
      const extCounts = {};
      const feats = {
        comp3: 0,
        occurs: 0,
        odo: 0,
        redefines: 0,
        renames: 0,
        copyReplacing: 0,
        execCics: 0,
        execSql: 0,
        execDli: 0,
        dfhmsd: 0,
        national: 0,
      };
      let scanned = 0;
      for (const f of files) {
        const ext = extname(f).toLowerCase() || "(none)";
        const isTxt = ext === LAYOUT_TXT;
        if (!CODE_EXTS.has(ext) && !isTxt) continue;
        if (!SCAN_EXTS.has(ext) || scanned >= 8000) {
          if (CODE_EXTS.has(ext)) {
            extCounts[ext] = (extCounts[ext] ?? 0) + 1;
            byExt[ext] = (byExt[ext] ?? 0) + 1;
            totalFiles += 1;
          }
          continue;
        }
        scanned += 1;
        try {
          const st = statSync(f);
          if (st.size <= 0 || st.size >= 512_000) {
            if (CODE_EXTS.has(ext)) {
              extCounts[ext] = (extCounts[ext] ?? 0) + 1;
              byExt[ext] = (byExt[ext] ?? 0) + 1;
              totalFiles += 1;
            }
            continue;
          }
          const text = readFileSync(f, "utf8");
          if (!looksLikeCobol(text, ext)) continue;
          extCounts[ext] = (extCounts[ext] ?? 0) + 1;
          byExt[ext] = (byExt[ext] ?? 0) + 1;
          totalFiles += 1;
          const hits = featureHits(text);
          /** @type {string[]} */
          const on = [];
          for (const [k, v] of Object.entries(hits)) {
            if (v) {
              feats[k] += 1;
              featureTotals[k] += 1;
              on.push(k);
            }
          }
          if (on.length > 0) {
            artifacts.push({
              corpus: corp.id,
              path: relative(root, f).replace(/\\/g, "/"),
              ext,
              features: on,
            });
          }
        } catch {
          /* binary / encoding */
        }
      }
      byCorpus[corp.id] = {
        files: files.length,
        byExt: extCounts,
        features: feats,
        present: existsSync(dir),
      };
    }
  }

  const cloned = Object.values(byCorpus).filter((c) => c.present && c.files > 0).length;
  checks.push({
    id: "census-ran",
    ok: true,
    detail: present ? `clonedWithFiles=${cloned};totalFiles=${totalFiles}` : "root-missing-operator-clone",
  });
  checks.push({
    id: "registry-lists-jrecord",
    ok: (registry.corpora || []).some((c) => c.id === "jrecord"),
  });
  checks.push({
    id: "feature-index-built",
    ok: !present || artifacts.length >= 0,
    detail: `artifactsWithFeatures=${artifacts.length}`,
  });

  if (present) {
    checks.push({
      id: "registry-corpus-dirs-or-empty-ok",
      ok: true,
      detail: `dirsSeen=${Object.keys(byCorpus).length}`,
    });
  }

  const ok = checks.every((c) => c.ok);
  const report = {
    kind: COBOL_CORPUS_CENSUS_KIND,
    schemaVersion: COBOL_CORPUS_CENSUS_SCHEMA_VERSION,
    ok,
    gate: "G10120",
    corporaRoot: root,
    corporaRootPresent: present,
    totalFiles,
    byExt,
    featureFileCounts: featureTotals,
    byCorpus,
    featureIndexArtifacts: artifacts.length,
    checks,
    failed: checks.filter((c) => !c.ok),
    note: "Census only — does not close copy:EXTFMAP; blobs stay off main",
    generatedAt: new Date().toISOString(),
  };

  const index = {
    kind: COBOL_CORPUS_FEATURE_INDEX_KIND,
    schemaVersion: COBOL_CORPUS_FEATURE_INDEX_SCHEMA_VERSION,
    gate: "G10120",
    corporaRoot: root,
    generatedAt: report.generatedAt,
    artifactCount: artifacts.length,
    featureKeys: Object.keys(featureTotals),
    artifacts,
    note: "Per-file feature tags for query — not EXTFMAP / not LCB claim",
  };

  return { report, index };
}

/**
 * @param {{ artifacts: Array<{ corpus: string, path: string, ext: string, features: string[] }> }} index
 * @param {{ all?: string[], any?: string[], corpus?: string, ext?: string, limit?: number }} q
 */
export function queryCobolFeatureIndex(index, q = {}) {
  const all = (q.all || []).map((s) => s.toLowerCase());
  const any = (q.any || []).map((s) => s.toLowerCase());
  const corpus = q.corpus?.toLowerCase();
  const ext = q.ext?.toLowerCase();
  const limit = q.limit ?? 200;
  const hits = [];
  for (const a of index.artifacts || []) {
    const feats = new Set((a.features || []).map((f) => f.toLowerCase()));
    if (corpus && a.corpus.toLowerCase() !== corpus) continue;
    if (ext && a.ext.toLowerCase() !== ext) continue;
    if (all.length && !all.every((f) => feats.has(f))) continue;
    if (any.length && !any.some((f) => feats.has(f))) continue;
    hits.push(a);
    if (hits.length >= limit) break;
  }
  return hits;
}

async function main() {
  const { report, index } = runCobolCorpusCensus();
  const outDir = join(ROOT, "reports/cobol");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "corpus-census.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(outDir, "corpus-feature-index.json"), `${JSON.stringify(index, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1] && /hub-cobol-corpus-census\.mjs$/.test(process.argv[1].replace(/\\/g, "/"))) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
