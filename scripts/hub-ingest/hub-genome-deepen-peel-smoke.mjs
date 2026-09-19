#!/usr/bin/env node
/**
 * G10140 / G10141 — Tip 1.0.39 peel consume: repeats (+ `if` filter), credential
 * effects (+ session cookie name), declared upstream forwards (with path params),
 * and narrow host-byte reasons.
 *
 * Proves Convert lifts CWL golds `40`–`47` into WebIR and projects them back
 * without inventing markup, loop runtimes, credential crypto, cookie values,
 * proxy targets, or a media type the origin never declared. Also proves
 * `@chrysalis/rewrite` executes a declared forward through an injected transport
 * instead of leaving it inert — and that with no transport it reports
 * inconclusive rather than inventing an upstream response.
 *
 * Gate: hub:genome-deepen-peel-smoke
 * Token: GENOME_DEEPEN_PEEL_OK
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { exportCwlFileToWebirJson } from "./export-cwl-webir.mjs";
import { listCwlModuleUses, listCwlRoutes, renderCwlRoutes } from "./hub-webir-routes.mjs";
import { loadWebir } from "./shared.mjs";
import { resolveCwlPillarRoot } from "./hub-cwl-language-pillar-smoke.mjs";

export const HUB_GENOME_DEEPEN_PEEL_SMOKE_KIND = "chrysalis.hub.genome-deepen-peel-smoke";
export const HUB_GENOME_DEEPEN_PEEL_SMOKE_SCHEMA_VERSION = 1;
export const GENOME_DEEPEN_PEEL_OK = "GENOME_DEEPEN_PEEL_OK";
export const CONVERT_GENOME_DEEPEN_PEEL = "CONVERT_GENOME_DEEPEN_PEEL";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function loadRewrite(repoRoot) {
  try {
    return await import("@chrysalis/rewrite");
  } catch {
    return import(pathToFileURL(join(repoRoot, "packages/rewrite/dist/index.js")).href);
  }
}

/**
 * @param {{ convertRoot?: string, cwlRoot?: string }} [opts]
 */
export async function runGenomeDeepenPeelSmoke(opts = {}) {
  const root = opts.convertRoot ? resolve(opts.convertRoot) : ROOT;
  const cwlRoot = resolveCwlPillarRoot({ cwlRoot: opts.cwlRoot });
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  const webir = await loadWebir();

  /**
   * Lift a language gold through Convert's WebIR path and project it back to CWL.
   * @param {string} name
   */
  async function peelGold(name) {
    const path = join(cwlRoot, "fixtures/language-gold", name, "routes.cwl");
    if (!existsSync(path)) return { text: null, routes: [], module: null, error: `missing ${name}` };
    const snapshot = await exportCwlFileToWebirJson(path);
    const raw = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
    const module = webir.moduleFromGoldenSnapshot(raw);
    const routes = listCwlRoutes(module);
    const text = renderCwlRoutes(routes, { moduleUses: listCwlModuleUses(module) }).text;
    return { text, routes, module, error: null };
  }

  /**
   * @param {string} id
   * @param {string} name
   * @param {(text: string, routes: object[]) => boolean} assertFn
   */
  async function checkGold(id, name, assertFn) {
    try {
      const peeled = await peelGold(name);
      if (peeled.error) {
        checks.push({ id, ok: false, detail: peeled.error });
        return;
      }
      const ok = assertFn(peeled.text, peeled.routes);
      checks.push({ id, ok, detail: ok ? `${name} peel` : peeled.text.slice(0, 300) });
    } catch (e) {
      checks.push({ id, ok: false, detail: String(e?.message ?? e).slice(0, 300) });
    }
  }

  // RFC-0031: the list surface is CWL; the markup comes back as a repeat statement,
  // never as unrolled or invented items.
  await checkGold("html-repeat", "40-html-repeat", (text) =>
    /repeat pops as pop html "<li>pop<\/li>";/.test(text) &&
    /return html "<h1>POPs<\/h1><ul>pops<\/ul>";/.test(text));

  await checkGold("html-repeat-item-fields", "41-html-repeat-fields", (text) =>
    /repeat sessions as s html ".*s\.user.*s\.site\.city.*";/.test(text) &&
    /load \{ sessions: "live" \}/.test(text));

  // RFC-0032: login intent is declared; hashing and the session store stay host-owned,
  // so the tags must survive without turning the handler into an unsupported-call hole.
  await checkGold("credential-session-effects", "42-auth-effects-v2", (text) =>
    /effects: auth\.verify, session\.mint;/.test(text) &&
    /effects: session\.revoke;/.test(text) &&
    /use urlencoded;/.test(text) &&
    !/unsupported-call/.test(text) &&
    !/hole/.test(text));

  // RFC-0032 deepen (1.0.38): mint/revoke may name the cookie — never a value.
  await checkGold("session-cookie-name", "46-session-cookie-name", (text) =>
    /effects: auth\.verify, session\.mint cookie sid;/.test(text) &&
    /effects: session\.revoke cookie sid;/.test(text) &&
    !/unsupported-call/.test(text) &&
    !/hole/.test(text));

  // RFC-0031 deepen (1.0.39): optional `if item.field` is a truthy filter only.
  await checkGold("html-repeat-if", "47-html-repeat-if", (text) =>
    /repeat sessions as s if s\.active html "<tr><td>s\.user<\/td><\/tr>";/.test(text) &&
    /return html "<table>sessions<\/table>";/.test(text) &&
    !/hole/.test(text));

  // RFC-0033: the destination is returned verbatim — no rewritten host, no
  // invented content-type (the upstream decides what it sends back).
  await checkGold("proxy-upstream-target", "43-proxy-upstream", (text) =>
    /proxy upstream "https:\/\/backend-services\.internal\/tower-status";/.test(text) &&
    /proxy upstream "https:\/\/backend-services\.internal\/provision";/.test(text) &&
    !/content-type/.test(text) &&
    !/hole/.test(text));

  // RFC-0033 deepen: `:param` segments stay in the target; a param the route does
  // not declare stays an honest hole rather than a guessed value.
  await checkGold("proxy-upstream-path-params", "45-proxy-upstream-params", (text) =>
    /proxy upstream "https:\/\/backend-services\.internal\/device\/:id\/status";/.test(text) &&
    /proxy upstream "https:\/\/backend-services\.internal\/sites\/:site\/towers\/:tower";/.test(text) &&
    /hole cwl:unknown-proxy-param:region;/.test(text));

  // RFC-0012 catalog: byte work is not proxy transfer, and the declared media type
  // survives next to the hole so Secure can read it.
  await checkGold("host-byte-reasons", "44-host-bytes-holes", (text) =>
    /content-type "image\/png";\s*\n\s*hole hub-cwl:binary-render;/.test(text) &&
    /hole hub-cwl:keypair-gen;/.test(text) &&
    !/hub-cwl:upstream-proxy/.test(text));

  // RFC-0024 / RFC-0029: the layout hole is declared beside the page, not instead
  // of it — the shared chrome is still origin markup in the return.
  await checkGold("layout-chrome-keeps-body", "36-layout-chrome", (text) =>
    /hole unsupported:opaque-script;/.test(text) &&
    /return html "<header class='top'><a href='\/cwl'>CWL<\/a><\/header><main>home<\/main>";/.test(text));

  // RFC-0030: the island comes back as `client ui`, with its event contract intact.
  await checkGold("page-island-client-ui", "38-html-page-island", (text) =>
    /client ui "device" \{/.test(text) &&
    /on resize \{ action "classify-device"; \}/.test(text) &&
    /return html/.test(text));

  // The declared forward must actually dispatch: CWL can only name the target,
  // so `@chrysalis/rewrite` performs it through a host-supplied transport.
  try {
    const peeled = await peelGold("45-proxy-upstream-params");
    const mod = peeled.module;
    let routeNodeId = null;
    for (const rid of mod.roots) {
      const n = mod.nodes.get(rid);
      if (n?.op === "route" && String(n.attrs?.path ?? "") === "/api/device/:id/status") {
        routeNodeId = rid;
        break;
      }
    }
    const { simulateHandler, DEFAULT_STUB_DB, DEFAULT_STUB_UPSTREAM } = await loadRewrite(root);
    const input = {
      method: "GET",
      path: "/api/device/dev-42/status",
      query: {},
      post: {},
      cookies: {},
      session: {},
      pathParams: { id: "dev-42" },
    };
    /** @type {string[]} */
    const seen = [];
    const performed = simulateHandler(mod, routeNodeId, input, DEFAULT_STUB_DB, {
      forward: (event) => {
        seen.push(event.target);
        return { status: 200, body: '{"state":"up"}' };
      },
    });
    const declaredOnly = simulateHandler(mod, routeNodeId, input, DEFAULT_STUB_DB, DEFAULT_STUB_UPSTREAM);
    const executedOk =
      seen.length === 1 &&
      seen[0] === "https://backend-services.internal/device/dev-42/status" &&
      performed.status === 200 &&
      performed.body === '{"state":"up"}' &&
      performed.errors.length === 0 &&
      performed.upstreamForwards.length === 1 &&
      performed.upstreamForwards[0].performed === true;
    checks.push({
      id: "upstream-forward-executes",
      ok: executedOk,
      detail: executedOk
        ? `forwarded ${seen[0]} status=${performed.status}`
        : `seen=${JSON.stringify(seen)} status=${performed.status} errors=${performed.errors.length}`,
    });
    // No transport configured: declare the forward, invent nothing.
    const honestOk =
      declaredOnly.body === "" &&
      declaredOnly.errors.length === 1 &&
      declaredOnly.upstreamForwards.length === 1 &&
      declaredOnly.upstreamForwards[0].performed === false;
    checks.push({
      id: "upstream-forward-no-invent",
      ok: honestOk,
      detail: honestOk
        ? "no transport: inconclusive, no invented body"
        : `body=${JSON.stringify(declaredOnly.body)} errors=${declaredOnly.errors.length}`,
    });
  } catch (e) {
    checks.push({
      id: "upstream-forward-executes",
      ok: false,
      detail: String(e?.message ?? e).slice(0, 300),
    });
  }

  const ok = checks.every((c) => c.ok);
  return {
    kind: HUB_GENOME_DEEPEN_PEEL_SMOKE_KIND,
    schemaVersion: HUB_GENOME_DEEPEN_PEEL_SMOKE_SCHEMA_VERSION,
    gate: "G10140",
    token: GENOME_DEEPEN_PEEL_OK,
    cwlTip: "1.0.39",
    ok,
    checks,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runGenomeDeepenPeelSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (report.ok) console.log(GENOME_DEEPEN_PEEL_OK);
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
