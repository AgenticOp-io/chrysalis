#!/usr/bin/env node
/**
 * Shared WISP CWL fidelity-deepen harness (D6442).
 * Batch probe bodies live in wisp-fidelity-deepen-batches/; this module owns
 * syntax checks, auth, probe/firstId, refresh/mutate/apply, and report IO.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { firebaseDemoIdToken, liveRefreshWispApiGoldens } from "../lib/live-refresh-api-goldens.mjs";
import { liveMutateTraceGoldens } from "../lib/live-mutate-trace-goldens.mjs";
import { applyWispApiGoldenHandlers } from "../wisp-cwl-apply-api-golden-handlers.mjs";

export const DEEPEN_CATALOG_KIND = "chrysalis.wisp.fidelity-deepen-catalog";
export const DEFAULT_TENANT_ID = "6a166eb07089304417ec967a";
export const DEFAULT_BASE_URL = "https://hss.wisptools.io";
export const DEFAULT_CLIENT_FILES = [
  "fixtures/hub-wisp-management/wisp-cwl-client.js",
  "fixtures/hub-wisp-management/wisp-cwl-map.js",
  "fixtures/hub-wisp-management/wisp-cwl-modules.js",
];

export const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const catalogPath = join(
  scriptRoot,
  "fixtures/hub-wisp-management/chrysalis.wisp-fidelity-deepen-catalog.v1.json",
);

export function syntaxCheck(rel) {
  const r = spawnSync(process.execPath, ["--check", join(scriptRoot, rel)], { encoding: "utf8" });
  return { file: rel, ok: r.status === 0, stderr: (r.stderr || "").trim().slice(0, 400) };
}

export function syntaxCheckClients(files = DEFAULT_CLIENT_FILES) {
  return files.map(syntaxCheck);
}

export async function probe(method, baseUrl, headers, path, body, init = {}) {
  try {
    const hdrs = { ...headers };
    const raw = init.rawBody === true;
    if (raw) {
      delete hdrs["Content-Type"];
      delete hdrs["content-type"];
    }
    const r = await fetch(`${baseUrl}${path}`, {
      method,
      headers: hdrs,
      body: raw ? body : body != null ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(init.timeoutMs ?? 45_000),
      ...(init.fetchInit || {}),
    });
    const text = await r.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text.slice(0, 200) };
    }
    return { path, method, status: r.status, ok: r.status >= 200 && r.status < 300, body: parsed };
  } catch (e) {
    return { path, method, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function firstId(baseUrl, headers, listPath, keys = []) {
  const r = await fetch(`${baseUrl}${listPath}`, {
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) return { status: r.status, id: "", row: null, rows: [] };
  const body = await r.json();
  let rows = Array.isArray(body) ? body : [];
  if (!rows.length) {
    for (const k of keys) {
      if (Array.isArray(body[k]) && body[k].length) {
        rows = body[k];
        break;
      }
    }
  }
  const row = rows[0] || null;
  return {
    status: r.status,
    id: String(
      row?._id ||
        row?.id ||
        row?.group_id ||
        row?.plan_id ||
        row?.uid ||
        row?.userId ||
        "",
    ),
    row,
    rows,
  };
}

export async function authContext(opts = {}) {
  const tenantId =
    (opts.tenantId || process.env.CHRYSALIS_HSS_TENANT_ID || "").trim() || DEFAULT_TENANT_ID;
  const baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const demo = await firebaseDemoIdToken();
  const demoHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Tenant-ID": tenantId,
  };
  if (demo.ok && demo.idToken) demoHeaders.Authorization = `Bearer ${demo.idToken}`;
  // network.js ownership checks use req.user.email || body.email || X-User-Email
  if (demo.ok && demo.email) demoHeaders["X-User-Email"] = String(demo.email);

  let admin = { ok: false };
  let adminHeaders = null;
  if (opts.needAdmin !== false) {
    admin = await firebaseDemoIdToken({
      email: process.env.CHRYSALIS_WISP_PLATFORM_ADMIN_EMAIL || "admin@wisptools.io",
      password: process.env.CHRYSALIS_WISP_PLATFORM_ADMIN_PASSWORD || "WisptoolsAdmin2026!",
    });
    adminHeaders = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Tenant-ID": tenantId,
    };
    if (admin.ok && admin.idToken) adminHeaders.Authorization = `Bearer ${admin.idToken}`;
    if (admin.ok && admin.email) adminHeaders["X-User-Email"] = String(admin.email);
  }

  return { baseUrl, tenantId, demo, demoHeaders, admin, adminHeaders };
}

/**
 * @param {object} cfg
 * @param {string} cfg.kind
 * @param {string} cfg.batchId
 * @param {Array<{id:number,title:string}>} cfg.passes
 * @param {string[]} [cfg.refreshPaths]
 * @param {boolean} [cfg.needAdmin]
 * @param {(ctx: object) => Promise<Array<Record<string, unknown>>>} cfg.runProbes
 * @param {string} [cfg.note]
 * @param {(p: Record<string, unknown>) => Record<string, unknown>} [cfg.summarizeProbe]
 * @param {object} [cfg.opts]
 */
export async function runDeepenBatch(cfg) {
  const {
    kind,
    batchId,
    passes,
    refreshPaths = [],
    needAdmin = false,
    runProbes,
    note = "",
    summarizeProbe = defaultSummarizeProbe,
    opts = {},
  } = cfg;

  const startedAt = new Date().toISOString();
  const reportPath = join(scriptRoot, `reports/wisp/fidelity-deepen-${batchId}.json`);
  const syntax = syntaxCheckClients(opts.clientFiles || DEFAULT_CLIENT_FILES);
  if (!syntax.every((s) => s.ok)) {
    const report = {
      kind,
      schemaVersion: 1,
      ok: false,
      batchId,
      startedAt,
      finishedAt: new Date().toISOString(),
      syntax,
      note: "Syntax check failed — abort before live probes",
    };
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
    return report;
  }

  const auth = await authContext({ ...opts, needAdmin });
  let refresh = { ok: true, skipped: true };
  let mutate = { ok: true, skipped: true };
  if (!opts.skipLiveRefresh) {
    refresh = await liveRefreshWispApiGoldens({
      firebaseDemoLogin: true,
      discover: true,
      applyHandlers: true,
      paths: refreshPaths,
      ...opts,
    });
    mutate = await liveMutateTraceGoldens({
      firebaseDemoLogin: true,
      applyHandlers: true,
      ...opts,
    });
  }

  const ctx = {
    ...auth,
    stamp: Date.now(),
    probe: (method, path, body, init) =>
      probe(method, auth.baseUrl, body && init?.rawBody ? init.headers || auth.demoHeaders : auth.demoHeaders, path, body, init),
    firstId: (listPath, keys) => firstId(auth.baseUrl, auth.demoHeaders, listPath, keys),
    probeAs: (headers, method, path, body, init) =>
      probe(method, auth.baseUrl, headers, path, body, init),
  };
  // Prefer explicit helpers on ctx for batch modules
  ctx.probeDemo = (method, path, body, init) =>
    probe(method, auth.baseUrl, auth.demoHeaders, path, body, init);
  ctx.probeAdmin = (method, path, body, init) =>
    probe(method, auth.baseUrl, auth.adminHeaders || auth.demoHeaders, path, body, init);
  ctx.firstIdDemo = (listPath, keys) => firstId(auth.baseUrl, auth.demoHeaders, listPath, keys);
  ctx.firstIdAdmin = (listPath, keys) =>
    firstId(auth.baseUrl, auth.adminHeaders || auth.demoHeaders, listPath, keys);

  const probes = await runProbes(ctx);

  let applied = null;
  try {
    applied = applyWispApiGoldenHandlers({ includeTenantsPilot: false });
  } catch (e) {
    applied = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const report = {
    kind,
    schemaVersion: 1,
    ok: syntax.every((s) => s.ok),
    batchId,
    startedAt,
    finishedAt: new Date().toISOString(),
    passes,
    syntax,
    auth: {
      demo: auth.demo.ok === true,
      ...(needAdmin ? { admin: auth.admin.ok === true } : {}),
    },
    liveRefresh: { ok: refresh?.ok, written: refresh?.written },
    liveMutate: { ok: mutate?.ok, written: mutate?.written },
    probes,
    applied,
    note,
  };
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        batchId,
        auth: report.auth,
        probes: probes.map(summarizeProbe),
        reportPath,
      },
      null,
      2,
    ),
  );
  return report;
}

export function defaultSummarizeProbe(p) {
  return {
    pass: p.pass,
    ok: p.ok,
    status: p.status,
    action: p.action,
    note: p.note,
    create: p.create?.ok ?? p.create?.status,
    put: p.put?.ok ?? p.put?.action,
    del: p.del?.ok ?? p.del?.action,
    approve: p.approve?.ok ?? p.approve?.action,
    suspend: p.suspend?.ok ?? p.suspend?.status,
    activate: p.activate?.ok ?? p.activate?.status,
  };
}

export function loadCatalog() {
  if (!existsSync(catalogPath)) return null;
  return JSON.parse(readFileSync(catalogPath, "utf8"));
}

/**
 * Build a deepen desk queue: held residuals + API golden paths not yet claimed
 * by closed deepen passes, plus catalog candidateHints.
 */
export function buildDeepenCandidates(opts = {}) {
  const catalog = opts.catalog || loadCatalog();
  if (!catalog) {
    return { ok: false, error: `missing catalog: ${catalogPath}` };
  }
  const goldensIndex = join(
    scriptRoot,
    "fixtures/hub-wisp-management/chrysalis.wisp-api-goldens.v1.json",
  );
  /** @type {Set<string>} */
  const goldenPaths = new Set();
  if (existsSync(goldensIndex)) {
    const idx = JSON.parse(readFileSync(goldensIndex, "utf8"));
    for (const h of idx.routes || idx.handlers || idx.goldens || []) {
      if (h.path) goldenPaths.add(String(h.path));
    }
  }

  const claimed = new Set();
  for (const p of catalog.passes || []) {
    for (const path of p.apiPaths || []) claimed.add(path);
  }

  const held = (catalog.heldResiduals || []).map((h) => ({
    kind: "held-residual",
    ...h,
  }));

  const unclaimed = [...goldenPaths]
    .filter((p) => !claimed.has(p) && p.startsWith("/api/"))
    .sort()
    .slice(0, opts.limit ?? 40)
    .map((path) => ({
      kind: "unclaimed-golden-path",
      path,
      hint: "Present in API goldens; not listed on a closed deepen pass — probe before inventing UI",
    }));

  const hints = (catalog.candidateHints || []).map((h) => ({
    kind: "catalog-hint",
    ...h,
  }));

  return {
    ok: true,
    kind: "chrysalis.wisp.fidelity-deepen-candidates",
    schemaVersion: 1,
    closedThroughPass: catalog.closedThroughPass,
    nextBatchId: catalog.nextBatchId,
    nextPassRange: catalog.nextPassRange,
    workflow: [
      "1. Review candidates (held residuals + unclaimed goldens + hints)",
      "2. pnpm run hub:fidelity-deepen-source-doc — read backend-services (+ MM services)",
      "3. Live --probe only to verify deploy parity (do not invent bodies)",
      "4. AI proposes next ×10 pass defs + minimal CWL UI from source docs",
      "5. pnpm run hub:fidelity-deepen -- --batch <id>",
      "6. Stage/deploy + FUTURE §7 from report JSON",
    ],
    held,
    unclaimedGoldenPaths: unclaimed,
    catalogHints: hints,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Live-probe the deepen desk queue against HSS (GET + light OPTIONS).
 * Verifies deploy parity only — request bodies come from backend-services
 * via --source-doc (D6442). Do not invent mutate shapes from live trial-and-error.
 */
export async function probeDeepenCandidates(opts = {}) {
  const startedAt = new Date().toISOString();
  const candidates = buildDeepenCandidates({ limit: opts.limit ?? 40, catalog: opts.catalog });
  if (!candidates.ok) {
    return { ...candidates, startedAt, finishedAt: new Date().toISOString() };
  }

  const auth = await authContext({ ...opts, needAdmin: true });
  /** @type {Array<{path:string, kind:string, title?:string, get: object, adminGet?: object}>} */
  const probes = [];

  /** @type {Map<string, {kind:string, title?:string, note?:string}>} */
  const targets = new Map();
  for (const h of candidates.catalogHints || []) {
    const api = String(h.api || "");
    if (!api || api === "held") continue;
    targets.set(api, { kind: h.kind || "catalog-hint", title: h.title, note: h.note });
  }
  for (const u of candidates.unclaimedGoldenPaths || []) {
    if (!targets.has(u.path)) {
      targets.set(u.path, { kind: u.kind || "unclaimed-golden-path", note: u.hint });
    }
  }
  // Held residuals: re-check known paths from catalog
  const catalog = loadCatalog();
  for (const h of catalog?.heldResiduals || []) {
    const pass = (catalog.passes || []).find((p) => p.id === h.pass);
    const path = pass?.apiPaths?.[0];
    if (path && !targets.has(path)) {
      targets.set(path, {
        kind: "held-residual",
        title: h.title,
        note: h.blocker,
      });
    }
  }

  const paths = [...targets.keys()].slice(0, opts.limit ?? 40);
  for (const path of paths) {
    const meta = targets.get(path) || {};
    const get = await probe("GET", auth.baseUrl, auth.demoHeaders, path);
    let adminGet;
    if (auth.admin.ok && auth.adminHeaders) {
      adminGet = await probe("GET", auth.baseUrl, auth.adminHeaders, path);
    }
    probes.push({
      path,
      kind: meta.kind,
      title: meta.title,
      note: meta.note,
      get: {
        ok: get.ok,
        status: get.status,
        error: get.error,
        bodyPreview: summarizeBody(get.body),
      },
      ...(adminGet
        ? {
            adminGet: {
              ok: adminGet.ok,
              status: adminGet.status,
              error: adminGet.error,
              bodyPreview: summarizeBody(adminGet.body),
            },
          }
        : {}),
      triage: triageGet(get, adminGet),
    });
  }

  const report = {
    kind: "chrysalis.wisp.fidelity-deepen-candidates-probe",
    schemaVersion: 1,
    ok: true,
    startedAt,
    finishedAt: new Date().toISOString(),
    auth: { demo: auth.demo.ok === true, admin: auth.admin.ok === true },
    closedThroughPass: candidates.closedThroughPass,
    nextBatchId: candidates.nextBatchId,
    nextPassRange: candidates.nextPassRange,
    held: candidates.held,
    probeCount: probes.length,
    probes,
    viableForNextBatch: probes
      .filter((p) => p.triage === "live-200" || p.triage === "admin-200")
      .map((p) => ({ path: p.path, title: p.title, triage: p.triage, kind: p.kind })),
    honestUnavailable: probes
      .filter((p) => p.triage === "honest-404" || p.triage === "honest-auth" || p.triage === "honest-5xx")
      .map((p) => ({ path: p.path, title: p.title, triage: p.triage, kind: p.kind })),
    note: "Live GET desk probe — use viableForNextBatch + held when proposing n10i (D6442)",
  };

  const reportPath = join(scriptRoot, "reports/wisp/fidelity-deepen-candidates-probe.json");
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  report.reportPath = reportPath;
  return report;
}

function summarizeBody(body) {
  if (body == null) return null;
  if (typeof body !== "object") return String(body).slice(0, 120);
  if (Array.isArray(body)) return { type: "array", length: body.length };
  const keys = Object.keys(body).slice(0, 8);
  return {
    type: "object",
    keys,
    error: body.error || body.message || undefined,
  };
}

function triageGet(get, adminGet) {
  if (get?.ok) return "live-200";
  if (adminGet?.ok) return "admin-200";
  const status = get?.status ?? adminGet?.status;
  if (status === 401 || status === 403) return "honest-auth";
  if (status === 404) return "honest-404";
  if (status >= 500) return "honest-5xx";
  if (get?.error || adminGet?.error) return "honest-timeout-or-network";
  return "honest-other";
}
