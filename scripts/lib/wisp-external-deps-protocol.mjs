#!/usr/bin/env node
/**
 * External-call + API-key discovery protocol for WISP deepen (D6445).
 *
 * Before proposing deepen ×10 batches that touch vendors/hardware:
 *   1. Scan origin source (backend-services + Module_Manager) for external hosts,
 *      hardware protocols, and secret/env key references.
 *   2. Cross-check names against .env.example files (documented vs undeclared).
 *   3. Classify each secret: required | optional | unknown.
 *   4. Report presence locally without printing values; HSS remote env is
 *      unknown unless CHRYSALIS_HSS_ENV_PROBE=1 (future) — default honest.
 *   5. Emit operator briefing: missing keys, external hosts, hardware surfaces.
 *
 * Never invent substitute vendors (D6442). Missing key → document / honest skip.
 *
 *   pnpm run hub:fidelity-deepen-external-deps
 *   node scripts/lib/wisp-fidelity-deepen-cli.mjs --external-deps
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const EXTERNAL_DEPS_KIND = "chrysalis.wisp.external-deps";
export const EXTERNAL_DEPS_SCHEMA = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const DEFAULT_WISP_ROOT =
  process.env.CHRYSALIS_WISP_ROOT ??
  process.env.WISP_MODULE_DIR ??
  "C:/Users/david/AgenticOps/products/wisptools/Module_Manager";

/** Host suffixes treated as first-party (not external vendor). */
const FIRST_PARTY_HOST_RE =
  /(^|\.)(wisptools\.io|wisptools-production\.web\.app|localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i;

/** Env / import.meta names that look like secrets or vendor credentials. */
const SECRET_NAME_RE =
  /(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|PASS|CREDENTIAL|AUTH[_-]?KEY|PRIVATE[_-]?KEY|ACCESS[_-]?KEY|CLIENT[_-]?SECRET|WEBHOOK[_-]?SECRET|SERVICE[_-]?ACCOUNT|MONGO(?:DB)?_URI|DATABASE_URL|SNMP[_-]?COMMUNITY)/i;

/** Known vendor / hardware labels for operator briefing. */
const VENDOR_HINTS = [
  { re: /arcgis|esri|geocode\.arcgis/i, vendor: "arcgis", kind: "vendor-sdk" },
  { re: /nominatim|openstreetmap/i, vendor: "nominatim", kind: "external-http" },
  { re: /sendgrid/i, vendor: "sendgrid", kind: "external-http" },
  { re: /firebase|googleapis\.com\/identitytoolkit|securetoken\.google/i, vendor: "firebase", kind: "vendor-sdk" },
  { re: /gemini|generativelanguage\.googleapis/i, vendor: "gemini", kind: "external-http" },
  { re: /bandwidth\.com|bandwidth\.net/i, vendor: "bandwidth", kind: "external-http" },
  { re: /telnyx/i, vendor: "telnyx", kind: "external-http" },
  { re: /twilio/i, vendor: "twilio", kind: "external-http" },
  { re: /paypal/i, vendor: "paypal", kind: "external-http" },
  { re: /googleapis\.com|maps\.googleapis|google.*sas/i, vendor: "google", kind: "external-http" },
  { re: /federated.?wireless|google.?sas/i, vendor: "cbrs-sas", kind: "external-http" },
  { re: /mongodb(\+srv)?:\/\//i, vendor: "mongodb", kind: "datastore" },
  { re: /snmp/i, vendor: "snmp", kind: "hardware" },
  { re: /mikrotik|routeros/i, vendor: "mikrotik", kind: "hardware" },
  { re: /:161\b|:162\b/i, vendor: "snmp-port", kind: "hardware" },
];

const SKIP_DIR = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".svelte-kit",
  "coverage",
  "vendor",
  ".turbo",
]);

const SCAN_EXT = new Set([".js", ".ts", ".mjs", ".cjs", ".svelte", ".example", ".env", ".json"]);

/**
 * @param {object} [opts]
 */
export function resolveScanRoots(opts = {}) {
  const wispRoot = resolve(opts.wispRoot ?? DEFAULT_WISP_ROOT);
  const backendRoot = resolve(
    opts.backendRoot ?? process.env.CHRYSALIS_WISP_BACKEND ?? join(wispRoot, "..", "backend-services"),
  );
  return { wispRoot, backendRoot };
}

/**
 * @param {string} dir
 * @param {string[]} [acc]
 */
function walkSourceFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  let ents;
  try {
    ents = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const ent of ents) {
    if (SKIP_DIR.has(ent.name)) continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      walkSourceFiles(p, acc);
      continue;
    }
    const lower = ent.name.toLowerCase();
    const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".")) : "";
    if (
      SCAN_EXT.has(ext) ||
      lower === ".env" ||
      lower.endsWith(".env") ||
      lower.includes(".env.")
    ) {
      try {
        if (statSync(p).size > 2_000_000) continue;
      } catch {
        continue;
      }
      acc.push(p);
    }
  }
  return acc;
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function extractEnvExampleKeys(text) {
  /** @type {string[]} */
  const keys = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim().replace(/^#\s*/, "");
    if (!t || t.startsWith("#")) continue;
    const m = t.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (m) keys.push(m[1]);
  }
  return keys;
}

/**
 * @param {string} host
 */
function isFirstPartyHost(host) {
  return FIRST_PARTY_HOST_RE.test(String(host || "").toLowerCase());
}

/**
 * @param {string} url
 */
function classifyUrl(url) {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    const m = String(url).match(/https?:\/\/([^/\s"'`]+)/i);
    host = m ? m[1].split(":")[0] : "";
  }
  if (!host || isFirstPartyHost(host)) {
    return { kind: "first-party", vendor: "wisptools", host };
  }
  for (const h of VENDOR_HINTS) {
    if (h.re.test(url) || h.re.test(host)) {
      return { kind: h.kind, vendor: h.vendor, host };
    }
  }
  return { kind: "external-http", vendor: "unknown", host };
}

/**
 * Presence check never returns secret values.
 * @param {string} name
 * @returns {"present"|"missing"|"placeholder"}
 */
export function classifySecretPresence(name) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === "") return "missing";
  const v = String(raw).trim().toLowerCase();
  if (
    v.includes("your_") ||
    v.includes("changeme") ||
    v === "xxx" ||
    v.startsWith("replace") ||
    v.includes("<db_password>") ||
    v.includes("your_shared_secret")
  ) {
    return "placeholder";
  }
  return "present";
}

/**
 * @param {object} [opts]
 */
export function scanWispExternalDeps(opts = {}) {
  const { wispRoot, backendRoot } = resolveScanRoots(opts);
  const roots = [
    { root: "backend-services", abs: backendRoot },
    { root: "Module_Manager", abs: wispRoot },
  ].filter((r) => existsSync(r.abs));

  /** @type {Map<string, object>} */
  const secrets = new Map();
  /** @type {Map<string, object>} */
  const externals = new Map();
  /** @type {Map<string, object>} */
  const hardware = new Map();
  /** @type {Set<string>} */
  const documentedKeys = new Set();

  for (const r of roots) {
    for (const name of [".env.example", ".env.demo.example", ".env.single-use.example"]) {
      const p = join(r.abs, name);
      if (!existsSync(p)) continue;
      for (const k of extractEnvExampleKeys(readFileSync(p, "utf8"))) {
        documentedKeys.add(k);
      }
    }
  }
  // Also backend SENDGRID etc may only appear in code — still document from examples if present
  const backendExample = join(backendRoot, ".env.example");
  if (existsSync(backendExample)) {
    for (const k of extractEnvExampleKeys(readFileSync(backendExample, "utf8"))) {
      documentedKeys.add(k);
    }
  }

  const urlRe = /https?:\/\/[^\s"'`<>)\\]+/gi;
  const envRe =
    /(?:process\.env|import\.meta\.env)\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)|env\.([A-Za-z_][A-Za-z0-9_]*)/g;
  const hardwareRe =
    /\b(snmp|SNMP|mikrotik|MikroTik|RouterOS|netconf|NETCONF|ssh2|telnet|modbus|tr-069|TR069|acs[_-]?url)\b/g;

  for (const r of roots) {
    const files = walkSourceFiles(r.abs);
    for (const file of files) {
      let text;
      try {
        text = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      const rel = relative(r.abs, file).replace(/\\/g, "/");

      // URLs
      for (const m of text.matchAll(urlRe)) {
        let url = m[0].replace(/[),.;]+$/, "");
        if (url.length > 300) url = url.slice(0, 300);
        const cls = classifyUrl(url);
        if (cls.kind === "first-party") continue;
        const key = `${cls.kind}|${cls.vendor}|${cls.host}`;
        const prev = externals.get(key) || {
          kind: cls.kind,
          vendor: cls.vendor,
          host: cls.host,
          sampleUrls: [],
          files: [],
          hitCount: 0,
        };
        prev.hitCount += 1;
        if (prev.sampleUrls.length < 3 && !prev.sampleUrls.includes(url)) prev.sampleUrls.push(url);
        if (prev.files.length < 8) {
          const tag = `${r.root}/${rel}`;
          if (!prev.files.includes(tag)) prev.files.push(tag);
        }
        externals.set(key, prev);
      }

      // Secrets / env
      for (const m of text.matchAll(envRe)) {
        const name = m[1] || m[2];
        if (!name || !SECRET_NAME_RE.test(name)) continue;
        // Skip NODE_ENV noise unless secret-like (already filtered)
        const prev = secrets.get(name) || {
          name,
          documentedInEnvExample: documentedKeys.has(name),
          localPresence: "missing",
          files: [],
          hitCount: 0,
          requiredHint: "unknown",
        };
        prev.hitCount += 1;
        prev.documentedInEnvExample = documentedKeys.has(name);
        prev.localPresence = classifySecretPresence(name);
        if (prev.files.length < 10) {
          const tag = `${r.root}/${rel}`;
          if (!prev.files.includes(tag)) prev.files.push(tag);
        }
        // Heuristic required vs optional from .env.example comments is coarse —
        // treat undocumented as unknown; documented without "Optional" near name as required-ish
        if (documentedKeys.has(name)) prev.requiredHint = "documented";
        else prev.requiredHint = "undeclared-in-env-example";
        secrets.set(name, prev);
      }

      // Hardware protocol mentions
      for (const m of text.matchAll(hardwareRe)) {
        const token = String(m[1]).toLowerCase();
        const vendor =
          token.includes("snmp") || token === "snmp"
            ? "snmp"
            : token.includes("mikrotik") || token === "routeros"
              ? "mikrotik"
              : token.includes("tr") || token.includes("acs")
                ? "acs-tr069"
                : token;
        const key = vendor;
        const prev = hardware.get(key) || {
          kind: "hardware",
          vendor,
          files: [],
          hitCount: 0,
          note: "Device/protocol surface in source — deepen must not invent credentials",
        };
        prev.hitCount += 1;
        if (prev.files.length < 8) {
          const tag = `${r.root}/${rel}`;
          if (!prev.files.includes(tag)) prev.files.push(tag);
        }
        hardware.set(key, prev);
      }
    }
  }

  // Known high-value keys even if only in .env.example
  for (const name of documentedKeys) {
    if (!SECRET_NAME_RE.test(name)) continue;
    if (secrets.has(name)) continue;
    secrets.set(name, {
      name,
      documentedInEnvExample: true,
      localPresence: classifySecretPresence(name),
      files: ["(env.example only)"],
      hitCount: 0,
      requiredHint: "documented",
    });
  }

  const secretList = [...secrets.values()].sort((a, b) => a.name.localeCompare(b.name));
  const externalList = [...externals.values()].sort((a, b) =>
    `${a.vendor}${a.host}`.localeCompare(`${b.vendor}${b.host}`),
  );
  const hardwareList = [...hardware.values()].sort((a, b) => a.vendor.localeCompare(b.vendor));

  const missingSecrets = secretList.filter(
    (s) => s.localPresence === "missing" || s.localPresence === "placeholder",
  );
  const undeclaredSecrets = secretList.filter((s) => !s.documentedInEnvExample);

  /** Operator briefing — what to tell the human before deepen touches these surfaces. */
  const operatorBriefing = {
    summary: [
      `${externalList.length} external host/vendor surfaces`,
      `${hardwareList.length} hardware/protocol surfaces`,
      `${secretList.length} secret/env key references`,
      `${missingSecrets.length} missing or placeholder locally`,
      `${undeclaredSecrets.length} referenced in code but absent from .env.example`,
    ].join("; "),
    missingOrPlaceholderKeys: missingSecrets.map((s) => ({
      name: s.name,
      localPresence: s.localPresence,
      documentedInEnvExample: s.documentedInEnvExample,
      requiredHint: s.requiredHint,
      sampleFiles: s.files.slice(0, 3),
    })),
    undeclaredInEnvExample: undeclaredSecrets.map((s) => s.name),
    externalVendors: externalList.map((e) => ({
      vendor: e.vendor,
      kind: e.kind,
      host: e.host,
      hitCount: e.hitCount,
    })),
    hardware: hardwareList.map((h) => ({ vendor: h.vendor, hitCount: h.hitCount })),
    deepenRules: [
      "Do not invent vendor SDKs or alternate hosts (D6442 / D6441).",
      "If a deepen pass needs a missing key, mark honest residual and list the key name — never invent a key.",
      "Hardware (SNMP/MikroTik/ACS) probes must use source bodies; credentials live on devices or tenant settings, not invented.",
      "Local presence ≠ HSS production env; treat remote as unknown unless separately verified.",
    ],
  };

  return {
    kind: EXTERNAL_DEPS_KIND,
    schemaVersion: EXTERNAL_DEPS_SCHEMA,
    ok: true,
    generatedAt: new Date().toISOString(),
    roots: roots.map((r) => ({ root: r.root, path: r.abs })),
    documentedEnvExampleKeys: [...documentedKeys].sort(),
    secrets: secretList,
    externalCalls: externalList,
    hardware: hardwareList,
    operatorBriefing,
    protocol: {
      id: "wisp-external-deps-v1",
      decision: "D6445",
      steps: [
        "scan origin for https URLs, process.env/import.meta.env secrets, hardware tokens",
        "merge .env.example documented keys",
        "classify local presence without printing values",
        "emit operator briefing (missing keys + vendors + hardware)",
        "deepen batches must consult briefing before vendor/hardware probes",
      ],
    },
  };
}

/**
 * @param {object} [opts]
 */
export function runExternalDepsProtocol(opts = {}) {
  const report = scanWispExternalDeps(opts);
  const reportDir = join(scriptRoot, "reports/wisp");
  mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, "external-deps.v1.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");

  // Committed desk snapshot (names/hosts only — no secret values)
  const fixturePath = join(
    scriptRoot,
    "fixtures/hub-wisp-management/chrysalis.wisp-external-deps.v1.json",
  );
  const fixture = {
    kind: EXTERNAL_DEPS_KIND,
    schemaVersion: EXTERNAL_DEPS_SCHEMA,
    generatedAt: report.generatedAt,
    protocol: report.protocol,
    operatorBriefing: report.operatorBriefing,
    secrets: report.secrets.map((s) => ({
      name: s.name,
      documentedInEnvExample: s.documentedInEnvExample,
      localPresence: s.localPresence,
      requiredHint: s.requiredHint,
      hitCount: s.hitCount,
      files: s.files.slice(0, 5),
    })),
    externalCalls: report.externalCalls.map((e) => ({
      kind: e.kind,
      vendor: e.vendor,
      host: e.host,
      hitCount: e.hitCount,
      sampleUrls: e.sampleUrls,
      files: e.files.slice(0, 5),
    })),
    hardware: report.hardware,
    documentedEnvExampleKeys: report.documentedEnvExampleKeys,
  };
  writeFileSync(fixturePath, JSON.stringify(fixture, null, 2) + "\n");

  return { ...report, reportPath, fixturePath };
}

/**
 * Filter deepen candidate paths that likely need missing vendor keys.
 * @param {string} apiPath
 * @param {object} report
 */
export function externalRiskForApiPath(apiPath, report) {
  const p = String(apiPath || "").toLowerCase();
  /** @type {string[]} */
  const risks = [];
  if (/geocode|coverage|arcgis|map/.test(p)) {
    if (report.operatorBriefing.missingOrPlaceholderKeys.some((k) => /ARCGIS/i.test(k.name))) {
      risks.push("ARCGIS_API_KEY or PUBLIC_ARCGIS_API_KEY missing locally");
    }
  }
  if (/voice|sip|port-order/.test(p)) {
    if (report.operatorBriefing.missingOrPlaceholderKeys.some((k) => /VOICE|BANDWIDTH|TELNYX|TWILIO/i.test(k.name))) {
      risks.push("voice carrier / webhook secrets may be unset");
    }
  }
  if (/snmp|mikrotik|monitoring/.test(p)) {
    risks.push("hardware credentials are device/tenant-scoped — do not invent");
  }
  if (/branding|email|notif/.test(p)) {
    if (report.operatorBriefing.missingOrPlaceholderKeys.some((k) => /SENDGRID|SMTP|FIREBASE/i.test(k.name))) {
      risks.push("email/firebase secrets may be unset for outbound notify");
    }
  }
  return risks;
}

async function main() {
  const out = runExternalDepsProtocol();
  console.log(
    JSON.stringify(
      {
        ok: out.ok,
        kind: out.kind,
        schemaVersion: out.schemaVersion,
        operatorBriefing: out.operatorBriefing,
        secretCount: out.secrets.length,
        externalCallCount: out.externalCalls.length,
        hardwareCount: out.hardware.length,
        reportPath: out.reportPath,
        fixturePath: out.fixturePath,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1]?.includes("wisp-external-deps-protocol")) main();
