/**
 * Translation Hub operator documentation catalog — served at /docs/:id, /docs/:file.md, /:file.md, and #/guide.
 */
import { existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** @typedef {{ id: string, title: string, category: string, file: string }} HubOperatorDocEntry */

/** @type {readonly HubOperatorDocEntry[]} */
export const HUB_OPERATOR_DOC_CATALOG = [
  { id: "hub-install", title: "Demo install & walkthrough", category: "Hub", file: "docs/HUB-DEMO-INSTALL.md" },
  { id: "hub-connectivity", title: "SSH & connectivity", category: "Hub", file: "docs/HUB-CONNECTIVITY.md" },
  { id: "hub-server-install", title: "Hub server install", category: "Hub", file: "docs/HUB-SERVER-INSTALL.md" },
  { id: "migration-os", title: "Migration OS", category: "Migration OS", file: "docs/MIGRATION-OS.md" },
  { id: "site-to-cwl-llm", title: "Site → CWL → LLM", category: "Migration OS", file: "docs/SITE-TO-CWL-LLM-PROGRAM.md" },
  { id: "site-port-federation", title: "Verified Migration Federation", category: "Migration OS", file: "docs/SITE-PORT-FEDERATION-PROGRAM.md" },
  { id: "migration-evidence", title: "Migration Evidence POC", category: "Migration OS", file: "docs/MIGRATION-EVIDENCE-POC-PROGRAM.md" },
  { id: "intelligence-shorthand", title: "Intelligence Shorthand", category: "Migration OS", file: "docs/INTELLIGENCE-SHORTHAND.md" },
  { id: "intelligence-shorthand-protocol", title: "IS runtime protocol", category: "Migration OS", file: "docs/INTELLIGENCE-SHORTHAND-PROTOCOL.md" },
  { id: "open-web-llm", title: "Open web-LLM program", category: "Migration OS", file: "docs/OPEN-WEB-LLM-PROGRAM.md" },
  { id: "open-web-llm-poc", title: "Web-LLM agent POC", category: "Migration OS", file: "docs/OPEN-WEB-LLM-POC.md" },
  { id: "llm-assisted-convert", title: "LLM-assisted convert", category: "Migration OS", file: "docs/LLM-ASSISTED-CONVERT-PROGRAM.md" },
  { id: "llm-convert-full", title: "LLM convert full program", category: "Migration OS", file: "docs/LLM-CONVERT-FULL-PROGRAM.md" },
  { id: "full-matrix-oracle", title: "Full matrix oracle", category: "Migration OS", file: "docs/FULL-MATRIX-ORACLE-PROGRAM.md" },
  { id: "web-llm-training", title: "Web-LLM training recipe", category: "Migration OS", file: "docs/WEB-LLM-TRAINING-RECIPE.md" },
  { id: "web-verify-benchmark", title: "Web Verify Benchmark (WVB)", category: "Migration OS", file: "docs/WEB-VERIFY-BENCHMARK.md" },
  { id: "cwl", title: "CWL overview", category: "Migration OS", file: "docs/CWL.md" },
  { id: "cwl-rfc", title: "CWL RFC index", category: "Migration OS", file: "docs/CWL-RFC.md" },
  { id: "strategic-plan", title: "Strategic plan (locked)", category: "Governance", file: "docs/STRATEGIC-PLAN.md" },
  { id: "paused-and-maintenance", title: "Paused & maintenance index", category: "Governance", file: "docs/PAUSED-AND-MAINTENANCE.md" },
  { id: "roadmap", title: "Roadmap (active)", category: "Governance", file: "ROADMAP.md" },
  { id: "whitepaper", title: "Whitepaper", category: "Engine & CLI", file: "docs/WHITEPAPER.md" },
  { id: "use-cases", title: "Use cases", category: "Engine & CLI", file: "docs/USE-CASES.md" },
  { id: "installation", title: "Installation", category: "Engine & CLI", file: "docs/INSTALLATION.md" },
  { id: "user-guide", title: "User guide (CLI)", category: "Engine & CLI", file: "docs/USER-GUIDE.md" },
  { id: "how-to", title: "How-to cookbook", category: "Engine & CLI", file: "docs/HOW-TO.md" },
  { id: "operations", title: "Operations", category: "Engine & CLI", file: "docs/OPERATIONS.md" },
  { id: "deployment", title: "Deployment", category: "Engine & CLI", file: "docs/DEPLOYMENT.md" },
  { id: "administration", title: "Administration", category: "Engine & CLI", file: "docs/ADMINISTRATION.md" },
  { id: "gce-local-verify", title: "GCE test runner", category: "Engine & CLI", file: "docs/GCE-LOCAL-VERIFY.md" },
  { id: "gce-gpu-lab", title: "GCE GPU lab", category: "Engine & CLI", file: "docs/GCE-GPU-LAB.md" },
  { id: "windows-compat", title: "Windows vs Linux", category: "Engine & CLI", file: "docs/WINDOWS-COMPAT.md" },
  { id: "commercial", title: "Commercial offering", category: "Hub & commercial", file: "docs/COMMERCIAL.md" },
  { id: "agenticop", title: "AgenticOp practice", category: "Hub & commercial", file: "docs/AGENTICOP.md" },
  { id: "github-project", title: "GitHub Project", category: "Hub & commercial", file: "docs/GITHUB_PROJECT.md" },
  { id: "multi-repo-workspace", title: "Multi-repo workspace", category: "Hub & commercial", file: "docs/MULTI-REPO-WORKSPACE.md" },
  { id: "design", title: "DESIGN.md", category: "Architecture", file: "DESIGN.md" },
  { id: "agents", title: "AGENTS.md", category: "Architecture", file: "AGENTS.md" },
  { id: "roadmap-archive", title: "Roadmap archive", category: "Architecture", file: "ROADMAP-ARCHIVE.md" },
  { id: "docs-index", title: "Documentation index", category: "Architecture", file: "docs/README.md" },
  { id: "wisp-cwl-fullstack", title: "WISP CWL fullstack program", category: "WISP showcase", file: "docs/WISP-CWL-FULLSTACK-PROGRAM.md" },
  { id: "wisp-cwl-ui-parity", title: "WISP CWL UI parity", category: "WISP showcase", file: "docs/WISP-CWL-UI-PARITY-PROGRAM.md" },
  { id: "wisp-production", title: "WISP production completion", category: "WISP showcase", file: "docs/WISP-PRODUCTION-COMPLETION-PROGRAM.md" },
  { id: "archive-index", title: "Archive index", category: "Archive", file: "docs/archive/INDEX.md" },
  { id: "strategic-plan-shipped-log", title: "Strategic plan ship log", category: "Archive", file: "docs/archive/STRATEGIC-PLAN-SHIPPED-LOG.md" },
  { id: "cwl-fullstack-build-log", title: "CWL full-stack build log", category: "Archive", file: "docs/archive/CWL-FULLSTACK-BUILD-LOG.md" },
  { id: "master-program", title: "WPTP master program", category: "Archive", file: "docs/MASTER-PROGRAM.md" },
  { id: "code-of-conduct", title: "Code of conduct", category: "Community", file: "CODE_OF_CONDUCT.md" },
  { id: "contributing", title: "Contributing", category: "Community", file: "CONTRIBUTING.md" },
  { id: "security", title: "Security", category: "Community", file: "SECURITY.md" },
];

const byId = new Map(HUB_OPERATOR_DOC_CATALOG.map((d) => [d.id, d]));

/** @type {Map<string, string>} slug → catalog id */
const slugToId = new Map();
for (const entry of HUB_OPERATOR_DOC_CATALOG) {
  const normFile = entry.file.replace(/\\/g, "/");
  slugToId.set(entry.id, entry.id);
  slugToId.set(normFile, entry.id);
  slugToId.set(basename(normFile), entry.id);
  slugToId.set(`docs/${basename(normFile)}`, entry.id);
}

/** @param {string} slug */
function normalizeDocSlug(slug) {
  return decodeURIComponent(String(slug))
    .replace(/\/$/, "")
    .replace(/^\//, "")
    .replace(/\\/g, "/");
}

/** @param {string} slug */
export function resolveHubOperatorDocId(slug) {
  const raw = normalizeDocSlug(slug);
  if (!raw) return null;
  const direct = slugToId.get(raw);
  if (direct) return direct;
  const base = basename(raw);
  if (slugToId.has(base)) return slugToId.get(base) ?? null;
  if (raw.endsWith(".md")) {
    for (const entry of HUB_OPERATOR_DOC_CATALOG) {
      const norm = entry.file.replace(/\\/g, "/");
      if (norm === raw || norm.endsWith(`/${raw}`) || basename(norm) === base) {
        return entry.id;
      }
    }
  }
  return byId.has(raw) ? raw : null;
}

/** @param {string} idOrSlug */
export function resolveHubOperatorDoc(idOrSlug) {
  const id = byId.has(idOrSlug) ? idOrSlug : resolveHubOperatorDocId(idOrSlug);
  if (!id) return null;
  const entry = byId.get(id);
  if (!entry) return null;
  const abs = join(scriptRoot, entry.file);
  if (!existsSync(abs)) return { entry, abs: null };
  return { entry, abs };
}

/** @returns {Record<string, string>} */
export function hubOperatorDocAliasMap() {
  /** @type {Record<string, string>} */
  const aliases = {};
  for (const entry of HUB_OPERATOR_DOC_CATALOG) {
    const norm = entry.file.replace(/\\/g, "/");
    const base = basename(norm);
    aliases[entry.id] = entry.id;
    aliases[norm] = entry.id;
    aliases[base] = entry.id;
    aliases[`docs/${base}`] = entry.id;
    aliases[`./${base}`] = entry.id;
    aliases[`./${norm}`] = entry.id;
    aliases[`../${norm}`] = entry.id;
  }
  return aliases;
}

/** @type {readonly string[]} */
export const HUB_OPERATOR_DOC_CATEGORY_ORDER = [
  "Migration OS",
  "Hub",
  "Engine & CLI",
  "Governance",
  "WISP showcase",
  "Hub & commercial",
  "Architecture",
  "Archive",
  "Community",
];

/** @param {Record<string, HubOperatorDocEntry[]>} groups */
export function sortedHubOperatorDocCategories(groups) {
  const keys = Object.keys(groups);
  return keys.sort((a, b) => {
    const ia = HUB_OPERATOR_DOC_CATEGORY_ORDER.indexOf(a);
    const ib = HUB_OPERATOR_DOC_CATEGORY_ORDER.indexOf(b);
    const ra = ia < 0 ? 999 : ia;
    const rb = ib < 0 ? 999 : ib;
    return ra - rb || a.localeCompare(b);
  });
}

/** @returns {Record<string, HubOperatorDocEntry[]>} */
export function groupHubOperatorDocsByCategory() {
  /** @type {Record<string, HubOperatorDocEntry[]>} */
  const groups = {};
  for (const doc of HUB_OPERATOR_DOC_CATALOG) {
    if (!groups[doc.category]) groups[doc.category] = [];
    groups[doc.category].push(doc);
  }
  return groups;
}
