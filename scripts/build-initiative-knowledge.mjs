#!/usr/bin/env node
/**
 * Refresh docs/initiative-knowledge.v1.json from archive INDEX + program headers.
 * Source of truth for "what we tried" — regenerate, do not hand-edit counts blindly.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "docs/initiative-knowledge.v1.json");

/** @typedef {{ id: string, name: string, era: string, status: string, intent: string, outcome: string, contributesTo: string, sources: string[] }} Initiative */

/** @type {Initiative[]} */
const initiatives = [
  // Engine spine
  { id: "pkg-ingest", name: "@chrysalis/ingest", era: "core", status: "active", intent: "PHP AST → WebIR with typed holes; UI asset/markup lift", outcome: "Mature PHP path; not multi-language ingest clone", contributesTo: "engine", sources: ["packages/ingest/README.md"] },
  { id: "pkg-webir", name: "@chrysalis/webir", era: "core", status: "active", intent: "Sole shared IR between ingest and emit", outcome: "Spine ships; fidelity lane-dependent", contributesTo: "engine", sources: ["packages/webir/README.md"] },
  { id: "pkg-verify", name: "@chrysalis/verify", era: "core", status: "active", intent: "Replay TraceCorpus; correctness dispose", outcome: "Authoritative; live customer rates need real jobs", contributesTo: "engine", sources: ["packages/verify/README.md"] },
  { id: "pkg-oracle", name: "@chrysalis/oracle (+ language recorders)", era: "core", status: "active", intent: "Capture redacted traces — app is the spec", outcome: "PHP strong; other recorders thinner", contributesTo: "engine", sources: ["packages/oracle/README.md"] },
  { id: "pkg-cli", name: "@chrysalis/cli", era: "core", status: "active", intent: "Orchestrate ingest/emit/verify/convert/chat", outcome: "Operator entrypoint", contributesTo: "engine", sources: ["packages/cli/README.md"] },
  { id: "pkg-cwl", name: "@chrysalis/cwl + emit-runtime-cwl + runtime-cwl", era: "cwl", status: "active", intent: "CWL text form of WebIR + Node preview runtime", outcome: "Simulator/holes honest; not full production fidelity", contributesTo: "cwl", sources: ["packages/cwl/README.md", "packages/runtime-cwl/README.md"] },
  { id: "pkg-web-llm", name: "@chrysalis/web-llm", era: "llm", status: "active", intent: "LLM proposes; verify disposes", outcome: "Assistive; never bypass verify", contributesTo: "ut", sources: ["packages/web-llm/README.md"] },
  { id: "pkg-repair", name: "@chrysalis/repair", era: "core", status: "active", intent: "Verify-gated repair of holes", outcome: "Exists; must stay verify-bound", contributesTo: "engine", sources: ["packages/repair/README.md"] },
  { id: "pkg-chimera", name: "@chrysalis/runtime-chimera", era: "core", status: "active", intent: "Dual-stack coexistence router", outcome: "Ships; cutover is project-specific", contributesTo: "engine", sources: ["packages/runtime-chimera/README.md"] },

  // PHP wedge
  { id: "php-wedge-p1", name: "PHP wedge Phase 1 (G5740–G5773)", era: "strategic-1", status: "closed", intent: "Laravel gaps, flagships, chimera cutover", outcome: "Gated closed; real apps still hole-heavy", contributesTo: "engine", sources: ["docs/PHP-WEDGE-PHASE-1.md", "docs/archive/INDEX.md"] },
  { id: "chimera-cutover-p1", name: "Chimera cutover Phase 1 (G5770)", era: "strategic-1", status: "closed", intent: "Dual-stack cutover evidence", outcome: "Phase gate closed", contributesTo: "engine", sources: ["docs/CHIMERA-CUTOVER-PHASE-1.md"] },
  { id: "ir-helper", name: "IR Helper Program (G7200)", era: "cwl-lang", status: "closed", intent: "PHP builtin/helper B-tier lifting", outcome: "Closed; deeper shapes still backlog", contributesTo: "engine", sources: ["docs/IR-HELPER-PROGRAM.md"] },

  // Multi-origin
  { id: "express-p4", name: "Second oracle Express Phase 4", era: "strategic-4", status: "closed", intent: "Node/Express live-oracle origin", outcome: "Chartered depth; not general Node stack", contributesTo: "hub", sources: ["docs/SECOND-ORACLE-ORIGIN-PHASE-4.md"] },
  { id: "matrix-601", name: "Extended matrix census 601/601", era: "post-46", status: "closed", intent: "Oracle-product census regression", outcome: "Count closed; refuse production-ready per pair", contributesTo: "hub", sources: ["docs/archive/INDEX.md"] },
  { id: "multi-origin-lift", name: "Multi-origin lift (G9840–G9880)", era: "2026-07", status: "closed", intent: "Svelte/Vue/Angular structural convert", outcome: "Smoke green; shells still holeful", contributesTo: "hub", sources: ["docs/MULTI-ORIGIN-LIFT-EXPANSION.md"] },

  // CWL language
  { id: "cwl-interchange-p3", name: "CWL interchange Phase 3", era: "strategic-3", status: "closed", intent: "CWL as interchange + OpenAPI", outcome: "Phase closed", contributesTo: "cwl", sources: ["docs/CWL-INTERCHANGE-PHASE-3.md"] },
  { id: "cwl-runtime-p5-6", name: "CWL runtime Phases 5–6", era: "strategic-5-6", status: "closed", intent: "Runtime scale + graduation", outcome: "Chartered; not universal cutover", contributesTo: "cwl", sources: ["docs/CWL-RUNTIME-PHASE-5.md"] },
  { id: "cwl-complete-lang", name: "CWL complete language (G7150)", era: "cwl-lang", status: "closed", intent: "Complete language on flagship charter", outcome: "Flagship complete", contributesTo: "cwl", sources: ["docs/CWL-LANGUAGE-PROGRAM.md"] },
  { id: "cwl-universal-lang", name: "CWL universal web language (G7390)", era: "phases-19-23", status: "closed", intent: "Verified authoring source for in-scope surfaces", outcome: "Does not replace DBs/Firebase/client SDKs", contributesTo: "cwl", sources: ["docs/CWL-UNIVERSAL-LANGUAGE-PROGRAM.md"] },
  { id: "cwl-full-web", name: "CWL full web language inbound (G7590)", era: "phase-25", status: "closed", intent: "All hub origins → CWL at evidence bar", outcome: "Inbound closed; outbound is UT", contributesTo: "cwl", sources: ["docs/CWL-FULL-WEB-LANGUAGE-PROGRAM.md"] },
  { id: "whole-site-cwl", name: "Whole-site CWL (G9400–G9450)", era: "2026-07", status: "closed", intent: "Site-scale convert proof", outcome: "Proof green; residuals continue", contributesTo: "cwl", sources: ["docs/WHOLE-SITE-CWL-CONVERSION.md"] },

  // Universal translator
  { id: "ut-program", name: "CWL universal translator Phase 26 (G7600–G7690)", era: "phase-26", status: "closed", intent: "N×N through CWL via composer charter", outcome: "Chartered edges only — not unchartered marketing matrix", contributesTo: "ut", sources: ["docs/CWL-UNIVERSAL-TRANSLATOR-PROGRAM.md"] },
  { id: "ut-parity", name: "UT inbound parity docs (G7590)", era: "phase-25", status: "closed", intent: "Document inbound route parity bar", outcome: "Regression subordinate of G7690", contributesTo: "ut", sources: ["docs/CWL-UNIVERSAL-TRANSLATOR-PARITY.md"] },

  // Hub / Migration OS
  { id: "migration-os-g8550", name: "Migration OS operator composite (G8550)", era: "phases-33-39", status: "active", intent: "Evidence + Open Legacy + VMF + IS + hit-rate", outcome: "Composite re-bumped; daily regression lane", contributesTo: "hub", sources: ["docs/MIGRATION-OS.md"] },
  { id: "intelligence-shorthand", name: "Intelligence Shorthand (G8560)", era: "migration-os", status: "closed", intent: "CPU-compact convert intelligence vs weighty LLM storage", outcome: "Spec/export closed; live rates need jobs", contributesTo: "ut", sources: ["docs/MIGRATION-OS.md"] },
  { id: "vmf-hub", name: "Verified Migration Federation (G8540)", era: "migration-os", status: "closed", intent: "Federated shard ingest + league", outcome: "Local/demo; crowd not proven", contributesTo: "hub", sources: ["docs/MIGRATION-OS.md"] },
  { id: "open-legacy", name: "Open Legacy wedge (G8520/G8570)", era: "migration-os", status: "closed", intent: "Site-port open-legacy → CWL", outcome: "Index wedge ≠ arbitrary CMS", contributesTo: "hub", sources: ["docs/MIGRATION-OS.md"] },

  // LLM / AI assist
  { id: "web-llm-p32", name: "Open web-LLM Phase 32", era: "phase-32", status: "closed", intent: "Trajectories + MCP; models propose, verify disposes", outcome: "Not a shipped foundation model", contributesTo: "ut", sources: ["docs/archive/INDEX.md"] },
  { id: "llm-convert-p42-43", name: "LLM-assisted + full convert (G8800–G8940)", era: "phase-42-43", status: "closed", intent: "LLM hole fills under WebIR/oracle", outcome: "Assistive only", contributesTo: "ut", sources: ["docs/LLM-CONVERT-FULL-PROGRAM.md"] },
  { id: "migration-chat", name: "Migration Chat + AI Assist (G9921–G9923)", era: "2026-07", status: "closed", intent: "Human+AI over same convert tools", outcome: "Smoke closed; LiteRT refused", contributesTo: "ut", sources: ["docs/AI-ASSIST.md"] },

  // WISP POC (explicitly not product)
  { id: "wisp-showcase", name: "WISP Module_Manager showcase lab", era: "wisp", status: "poc", intent: "Demonstrate CWL on a real operator app", outcome: "Many gates; still incomplete vs full Module_Manager; GenieACS OOS", contributesTo: "poc", sources: ["docs/WISP-CWL-FULLSTACK-PROGRAM.md"] },
  { id: "wisp-g7790-g9952", name: "WISP full-site through Firebase look (G7790–G9952)", era: "wisp", status: "poc", intent: "Replace/finish Module_Manager surfaces in CWL", outcome: "Deployable demo; not engine core", contributesTo: "poc", sources: ["ROADMAP.md"] },

  // Paused / honesty
  { id: "paused-production-idiomatic", name: "Per-pair production idiomaticity", era: "paused", status: "paused", intent: "Beyond oracle-product census", outcome: "Explicitly refused as closed by census", contributesTo: "paused", sources: ["docs/PAUSED-AND-MAINTENANCE.md"] },
  { id: "paused-wp-customer-oracle", name: "Customer-owned WordPress oracle", era: "paused", status: "paused", intent: "Real WP install as oracle", outcome: "Not default build", contributesTo: "paused", sources: ["docs/WORDPRESS-CUSTOMER-ORACLE.md"] },
  { id: "paused-commercial-launch", name: "Commercial license public launch", era: "paused", status: "paused", intent: "Vendor packaging launch", outcome: "Plumbing exists; not launched", contributesTo: "paused", sources: ["docs/COMMERCIAL.md"] },
  { id: "paused-genieacs", name: "GenieACS / invent maps FCAPS", era: "paused", status: "paused", intent: "Anti-goal — invent operator backends", outcome: "Permanently OOS (D6205)", contributesTo: "paused", sources: ["DESIGN.md"] },
];

function countWispScripts() {
  const scriptsDir = join(root, "scripts");
  /** @type {string[]} */
  const files = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/wisp/i.test(e.name)) files.push(p.slice(root.length + 1).replace(/\\/g, "/"));
    }
  };
  walk(scriptsDir);
  return files;
}

function parseArchiveIndex() {
  const p = join(root, "docs/archive/INDEX.md");
  if (!existsSync(p)) return [];
  const text = readFileSync(p, "utf8");
  /** @type {Array<{doc: string, section: string}>} */
  const docs = [];
  let section = "unknown";
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("## ")) section = line.slice(3).trim();
    const m = /\[`([^`]+\.md)`\]/.exec(line);
    if (m) docs.push({ doc: m[1], section });
  }
  return docs;
}

const wispScripts = countWispScripts();
const archiveDocs = parseArchiveIndex();

const artifact = {
  kind: "chrysalis.initiative-knowledge",
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  northStar: {
    product: "AI-assisted universal web translator",
    hub: "CWL over WebIR",
    loop: "oracle → WebIR → CWL → emit → verify (LLM/IS propose, verify dispose)",
    notProduct: "WISP Module_Manager (POC showcase only)",
  },
  stats: {
    initiativeCount: initiatives.length,
    wispScriptCount: wispScripts.length,
    archiveDocRefs: archiveDocs.length,
    byStatus: Object.fromEntries(
      ["active", "closed", "poc", "paused"].map((s) => [s, initiatives.filter((i) => i.status === s).length]),
    ),
    byContributesTo: Object.fromEntries(
      ["engine", "hub", "cwl", "ut", "poc", "paused"].map((s) => [
        s,
        initiatives.filter((i) => i.contributesTo === s).length,
      ]),
    ),
  },
  gapDiagnosis: {
    incompleteBecause: [
      "Closed programs ≠ production idiomatic cutover — most closes are chartered fixture/smoke bars",
      "601-pair census is oracle-product grade, not full-app rewrite",
      "WISP POC absorbed agent attention that should have stayed on engine + UT composer depth",
      "Multi-origin silver dominate; gold is fixture-narrow",
      "LLM/IS assist exists but autonomy without verify is refused by DESIGN §3",
    ],
    pathToUniversalTranslator: [
      "1. Keep WebIR + oracle verify as dispose authority (never raw string transpile)",
      "2. Treat CWL as hub: Lang A → lift → WebIR → CWL ↔ emit → Lang B",
      "3. Expand composer charter edges under hole budgets (G7690 regression + new chartered edges)",
      "4. Deepen origin lift (ingest adapters) where gold is weak — not more WISP chrome",
      "5. AI assist (chat + web-llm + IS) proposes fills; Migration OS / verify closes",
      "6. Extract generic convert tooling from WISP scripts into scripts/lib + packages — WISP stays fixtures/poc/",
    ],
  },
  initiatives,
  archiveDocs,
  wispScripts,
  extractMap: {
    "scripts/wisp-hole-metrics-lib.mjs": "scripts/lib/cwl-hole-metrics.mjs",
    "scripts/wisp-cwl-apply-surfaces-lib.mjs": "scripts/lib/cwl-apply-surfaces.mjs",
    "scripts/wisp-cwl-apply-module-routes-lib.mjs": "scripts/lib/cwl-route-lift.mjs",
    "scripts/wisp-cwl-bulk-lift-lib.mjs": "scripts/lib/cwl-bulk-svelte-lift.mjs",
    "scripts/wisp-cwl-api-oracle-contract.mjs": "scripts/lib/cwl-api-oracle-contract.mjs",
    "scripts/wisp-cwl-static-export.mjs": "scripts/lib/cwl-static-export.mjs",
    "scripts/wisp-scrub-markup-artifacts.mjs": "scripts/lib/scrub-cwl-markup-artifacts.mjs",
    "scripts/wisp-cwl-chimera-gateway.mjs": "scripts/lib/cwl-chimera-gateway.mjs",
    "scripts/wisp-cwl-gateway-config.mjs": "scripts/lib/cwl-gateway-config.mjs",
    "scripts/wisp-cwl-apply-client-redirects.mjs": "scripts/lib/cwl-apply-client-redirects.mjs",
    "scripts/wisp-cwl-css-lift.mjs": "scripts/lib/cwl-css-lift.mjs",
    "scripts/wisp-cwl-package-ui-lift.mjs": "scripts/lib/cwl-package-ui-lift.mjs",
    "scripts/wisp-cwl-svelte-native-convert.mjs": "scripts/lib/cwl-svelte-native-convert.mjs",
    "scripts/wisp-cwl-generate-api-proxy-cwl.mjs": "scripts/lib/cwl-generate-api-proxy.mjs",
    "scripts/wisp-cwl-hole-manifest.mjs": "scripts/lib/cwl-hole-manifest.mjs",
    "scripts/wisp-cwl-chimera-serve.mjs": "scripts/lib/cwl-chimera-serve.mjs",
    "scripts/wisp-svelte-static-server.mjs": "scripts/lib/spa-static-server.mjs",
  },
};

writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, outPath, ...artifact.stats }, null, 2));
