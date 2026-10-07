#!/usr/bin/env node
/**
 * G10140 / G10141 / G10142 — Tip 1.0.61 peel consume: repeats, credential effects,
 * CORS, rate, CSRF, auth, db, mail, cache (max-age/private/no-store/no-cache),
 * io host, session cookies, cookie purpose, same-site redirect, and the site
 * document shell.
 *
 * Proves Convert lifts CWL golds `40`–`79` into WebIR and projects them back
 * without inventing markup, limiter/CORS/CSRF/cache/HTTP-client engines,
 * cookie/token values, or proxy targets. Golds `40`–`79`. Tip `87`–`89`
 * (stream websocket / job.enqueue / UI events) are document facts via the tip
 * pin — host owns WS frames and job queues; no runtime invent. Tip `90`
 * (RFC-0038 Nest/LiveView/Flutter/onion/raw-SQL residuals) is document facts
 * only — never invent those façades. Also proves `@chrysalis/rewrite` executes
 * a declared forward through an injected transport.
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

  // RFC-0031 deepen (1.0.40): empty-collection markup.
  await checkGold("html-repeat-else", "48-html-repeat-else", (text) =>
    /repeat sessions as s if s\.active html "<tr><td>s\.user<\/td><\/tr>" else html "<tr><td>none<\/td><\/tr>";/.test(
      text,
    ) && !/hole/.test(text));

  // RFC-0031 deepen (1.0.41): one-level nested `outer.field`.
  await checkGold("html-repeat-nested", "49-html-repeat-nested", (text) =>
    /repeat regions as region html/.test(text) &&
    /repeat region\.towers as tower html "<li>tower\.id<\/li>";/.test(text) &&
    !/hole/.test(text));

  // RFC-0031 composition (1.0.42): nest + if/else.
  await checkGold("html-repeat-nested-filter", "50-html-repeat-nested-filter", (text) =>
    /else html "<p>no regions<\/p>";/.test(text) &&
    /repeat region\.towers as tower if tower\.up html "<li>tower\.id<\/li>" else html "<li>offline<\/li>";/.test(
      text,
    ) && !/hole/.test(text));

  // RFC-0032 deepen (1.0.43): cookie policy attrs — never a token value.
  await checkGold("session-cookie-attrs", "51-session-cookie-attrs", (text) =>
    /effects: auth\.verify, session\.mint cookie sid httponly secure path \/ samesite lax;/.test(text) &&
    /effects: session\.revoke cookie sid path \/;/.test(text) &&
    !/unsupported-call/.test(text) &&
    !/hole/.test(text));

  // RFC-0020 deepen (1.0.44): named CORS origin; bare remains *.
  await checkGold("cors-allow-origin", "52-cors-allow-origin", (text) =>
    /effects: cors\.allow origin https:\/\/app\.example\.com;/.test(text) &&
    /effects: cors\.allow;/.test(text) &&
    !/hole/.test(text));

  // RFC-0020 deepen (1.0.45): rate.limit rpm.
  await checkGold("rate-limit-rpm", "53-rate-limit-rpm", (text) =>
    /effects: rate\.limit rpm 60;/.test(text) &&
    /effects: rate\.limit;/.test(text) &&
    !/hole/.test(text));

  // RFC-0020 deepen (1.0.46): csrf cookie name — never the token.
  await checkGold("csrf-verify-cookie", "54-csrf-verify-cookie", (text) =>
    /effects: csrf\.verify cookie csrf;/.test(text) &&
    /effects: csrf\.verify;/.test(text) &&
    !/hole/.test(text));

  // RFC-0007 / RFC-0020 deepen (1.0.47): auth.require cookie name — never a value.
  await checkGold("auth-require-cookie", "55-auth-require-cookie", (text) =>
    /effects: auth\.require cookie sid;/.test(text) &&
    /effects: auth\.require;/.test(text) &&
    !/unsupported-call/.test(text) &&
    !/hole/.test(text));

  // RFC-0020 deepen (1.0.48): named db.read / db.write table.
  await checkGold("db-table-name", "56-db-table-name", (text) =>
    /effects: db\.read table users;/.test(text) &&
    /effects: auth\.require, db\.write table users;/.test(text) &&
    /effects: db\.read;/.test(text) &&
    !/hole/.test(text));

  // RFC-0020 deepen (1.0.49): named mail.send template.
  await checkGold("mail-send-template", "57-mail-send-template", (text) =>
    /effects: mail\.send template welcome;/.test(text) &&
    /effects: mail\.send;/.test(text) &&
    !/hole/.test(text));

  // RFC-0020 deepen (1.0.50): named CORS methods (+ origin).
  await checkGold("cors-allow-methods", "58-cors-allow-methods", (text) =>
    /effects: cors\.allow methods GET POST;/.test(text) &&
    /effects: cors\.allow origin https:\/\/app\.example\.com methods GET POST PUT;/.test(text) &&
    /effects: cors\.allow;/.test(text) &&
    !/hole/.test(text));

  // RFC-0020 deepen (1.0.51): cache.max-age (binary hole stays beside the declare).
  await checkGold("cache-max-age", "59-cache-max-age", (text) =>
    /effects: cache\.max-age 86400;/.test(text) &&
    /effects: cache\.max-age 0;/.test(text) &&
    /hole hub-cwl:binary-render;/.test(text));

  // RFC-0020 deepen (1.0.52): named io host — logical name only, no HTTP client.
  await checkGold("io-host", "60-io-host", (text) =>
    /effects: io host api\.example\.com;/.test(text) &&
    /effects: io;/.test(text) &&
    !/hole/.test(text));

  // RFC-0020 deepen (1.0.53): cors.allow credentials flag — host sets the header.
  await checkGold("cors-allow-credentials", "61-cors-allow-credentials", (text) =>
    /effects: cors\.allow origin https:\/\/app\.example\.com credentials;/.test(text) &&
    /effects: cors\.allow methods GET POST credentials;/.test(text) &&
    /effects: cors\.allow;/.test(text) &&
    !/hole/.test(text));

  // RFC-0020 deepen (1.0.54): session.read|write cookie name — never a token.
  await checkGold("session-access-cookie", "62-session-access-cookie", (text) =>
    /effects: session\.read cookie sid;/.test(text) &&
    /effects: session\.write cookie sid;/.test(text) &&
    /effects: session\.read;/.test(text) &&
    !/hole/.test(text));

  // RFC-0020 deepen (1.0.55): cache.private composes with cache.max-age.
  await checkGold("cache-private", "63-cache-private", (text) =>
    /effects: cache\.max-age 0, cache\.private;/.test(text) &&
    /effects: cache\.max-age 3600;/.test(text) &&
    !/cache\.private/.test(text.split("public")[1] ?? "") &&
    !/hole/.test(text));

  // RFC-0034 (1.0.56): closed cookie purposes; bare name and samesite none stay holes.
  await checkGold("cookie-purpose", "64-cookie-purpose", (text) =>
    /cookie theme purpose preference values light dark;/.test(text) &&
    /cookie sid purpose session;/.test(text) &&
    /effects: auth\.require cookie sid;/.test(text) &&
    /hole unsupported:tracking-cookie;/.test(text) &&
    !/samesite none/.test(text) &&
    !/cookie _ga;/.test(text));

  // RFC-0006 deepen (1.0.57): same-site redirect; off-site stays an open-redirect hole.
  await checkGold("redirect-same-origin", "65-redirect-same-origin", (text) =>
    /redirect "\/account";/.test(text) &&
    /redirect "\/home" status 301;/.test(text) &&
    /hole unsupported:open-redirect;/.test(text) &&
    !/evil\.example/.test(text));

  // RFC-0020 deepen (1.0.58): cache.no-store, including with cache.private.
  await checkGold("cache-no-store", "66-cache-no-store", (text) =>
    /effects: cache\.no-store, cache\.private;/.test(text) &&
    /effects: cache\.no-store;/.test(text) &&
    /effects: cache\.max-age 86400;/.test(text) &&
    !/hole/.test(text));

  // RFC-0020 deepen (1.0.59): cache.no-cache, including with cache.private.
  await checkGold("cache-no-cache", "67-cache-no-cache", (text) =>
    /effects: cache\.no-cache;/.test(text) &&
    /effects: cache\.no-cache, cache\.private;/.test(text) &&
    /effects: cache\.no-store;/.test(text) &&
    !/hole/.test(text));

  // RFC-0029 deepen (1.0.60): shared document shell fills the body slot.
  await checkGold("site-document", "68-site-document", (text) =>
    /hole unsupported:opaque-script;/.test(text) &&
    /header class=\\"top\\"/.test(text) &&
    /section class=\\"hero\\"/.test(text) &&
    /application\/ld\+json/.test(text));

  // RFC-0029 deepen (1.0.61): per-page head, page id, and active class.
  await checkGold("site-shell", "69-site-shell", (text) =>
    /<title>Home<\/title>/.test(text) &&
    /data-ao-page=\\"home\\"/.test(text) &&
    /ao-nav-link ao-nav-link-active/.test(text) &&
    /<title>Docs<\/title>/.test(text) &&
    /data-ao-page=\\"docs\\"/.test(text) &&
    /hole cwl:missing-head-slot;/.test(text) &&
    !/ao-layout\.js/.test(text));

  // RFC-0029 deepen (1.0.62 / gold 70): nav id is shared; the page decl name stays.
  await checkGold("site-nav-id", "70-site-nav-id", (text) =>
    /data-ao-page=\\"home\\"/.test(text) &&
    /data-ao-page=\\"docs\\"/.test(text) &&
    /data-ao-page=\\"about\\"/.test(text) &&
    /ao-nav-link ao-nav-link-active/.test(text) &&
    /ao-footer-link ao-footer-link-active/.test(text) &&
    !/data-ao-page=\\"paper_cwl\\"/.test(text) &&
    !/data-ao-page=\\"whitepaper\\"/.test(text) &&
    !/ao-layout\.js/.test(text));

  // RFC-0029 deepen (1.0.63 / gold 71): the host year stays a token. CWL does not read the clock.
  await checkGold("site-year", "71-site-year", (text) =>
    /<!-- cwl:year -->/.test(text) &&
    /<section class=\\"hero\\"><h1>Home<\/h1><\/section>/.test(text) &&
    /hole cwl:missing-year-slot;/.test(text) &&
    !/ao-layout\.js/.test(text));

  // RFC-0029 deepen (1.0.64 / gold 72): one nav list fills every header slot.
  await checkGold("site-nav-links", "72-site-nav-links", (text) =>
    /ao-nav-link ao-nav-link-active/.test(text) &&
    /href=\\"\/docs\.html\\"/.test(text) &&
    /ao-nav-cta ao-nav-link-active/.test(text) &&
    /hole cwl:missing-links-slot;/.test(text) &&
    !/ao-layout\.js/.test(text));

  // RFC-0029 deepen (1.0.65 / gold 73): device token, bounded drawer, named lists.
  await checkGold("site-shell-behavior", "73-site-shell-behavior", (text) =>
    /<!-- cwl:device -->/.test(text) &&
    /data-cwl-drawer=\\"1\\"/.test(text) &&
    /href=\\"\/method\.html\\"/.test(text) &&
    /ao-footer-link/.test(text) &&
    /hole cwl:missing-device-slot;/.test(text) &&
    /hole cwl:missing-drawer-target;/.test(text) &&
    /hole cwl:missing-links-slot;/.test(text) &&
    !/ao-layout\.js/.test(text));

  // RFC-0029 deepen (1.0.66 / gold 74): named stylesheet, image, and Firebase public root.
  await checkGold("site-assets", "74-site-assets", (text) =>
    /rel=\\"stylesheet\\" href=\\"\/agenticops\.css\\"/.test(text) &&
    /src=\\"\/logo\.svg\\"/.test(text) &&
    /cwl-host firebase=\\"agenticops\\" public=\\"\.\\" error=\\"\/404\.html\\"/.test(text) &&
    /hole cwl:missing-style-slot;/.test(text) &&
    /hole cwl:missing-image-slot;/.test(text) &&
    !/ao-layout\.js/.test(text));

  // RFC-0029 deepen (1.0.67 / gold 75): named script, same-site form, off-site anchor.
  await checkGold("site-page", "75-site-page", (text) =>
    /src=\\"\/site\.js\\" defer/.test(text) &&
    /method=\\"post\\" action=\\"\/contact\\"/.test(text) &&
    /target=\\"_blank\\" rel=\\"noopener\\"/.test(text) &&
    /href=\\"https:\/\/github\.com\/AgenticOp-io\\"/.test(text) &&
    /hole unsupported:offsite-form;/.test(text) &&
    /hole cwl:missing-script-slot;/.test(text) &&
    !/evil\.example/.test(text) &&
    !/ao-layout\.js/.test(text));

  // RFC-0029 deepen (1.0.68 / gold 76): the viewport cut is a declared fact. The language does not read it.
  await checkGold("site-device-below", "76-site-device-below", (text) =>
    /<!-- cwl:device -->/.test(text) &&
    /hole cwl:missing-device-slot;/.test(text) &&
    !/matchMedia/.test(text) &&
    !/max-width: 820px/.test(text));

  // RFC-0029 deepen (1.0.69 / gold 77): charset, viewport meta, title, description, canonical.
  await checkGold("document-identity", "77-site-document", (text) =>
    /meta charset=\\"utf-8\\"/.test(text) &&
    /name=\\"viewport\\" content=\\"width=device-width, initial-scale=1\\"/.test(text) &&
    /<title>Proof · AgenticOps<\/title>/.test(text) &&
    /name=\\"description\\" content=\\"Recorded traffic decides\.\\"/.test(text) &&
    /rel=\\"canonical\\" href=\\"https:\/\/agenticop\.io\/proof\.html\\"/.test(text) &&
    /hole cwl:missing-charset-slot;/.test(text) &&
    /hole cwl:missing-viewport-slot;/.test(text) &&
    /hole cwl:missing-title-slot;/.test(text) &&
    /hole cwl:missing-description-slot;/.test(text) &&
    /hole cwl:canonical-not-url;/.test(text) &&
    !/javascript:alert/.test(text));

  // RFC-0029 deepen (1.0.70 / gold 78): social card. JSON-LD stays in the head fragment.
  await checkGold("site-social", "78-site-social", (text) =>
    /name=\\"robots\\" content=\\"index, follow\\"/.test(text) &&
    /name=\\"author\\" content=\\"AgenticOps\\"/.test(text) &&
    /name=\\"theme-color\\" content=\\"#020208\\"/.test(text) &&
    /property=\\"og:image\\" content=\\"https:\/\/agenticop\.io\/logo\.svg\\"/.test(text) &&
    /name=\\"twitter:card\\" content=\\"summary_large_image\\"/.test(text) &&
    /application\/ld\+json/.test(text) &&
    /hole cwl:missing-meta-slot;/.test(text) &&
    /hole cwl:meta-theme;/.test(text) &&
    /hole cwl:meta-not-url;/.test(text) &&
    /hole cwl:meta-twitter-card;/.test(text) &&
    !/javascript:alert/.test(text) &&
    !/content=\\"red\\"/.test(text) &&
    !/content=\\"tracker\\"/.test(text));

  // RFC-0029 deepen (1.0.71 / gold 79): remaining head facts. Schema.org is not interpreted.
  await checkGold("site-head-rest", "79-site-head-rest", (text) =>
    /name=\\"keywords\\" content=\\"CWL, WebIR\\"/.test(text) &&
    /rel=\\"icon\\" href=\\"\/logo\.svg\\" type=\\"image\/svg\+xml\\"/.test(text) &&
    /rel=\\"apple-touch-icon\\" href=\\"\/logo\.svg\\"/.test(text) &&
    (text.match(/apple-touch-icon/g) || []).length === 1 &&
    /rel=\\"alternate\\" type=\\"text\/plain\\" href=\\"https:\/\/agenticop\.io\/llms\.txt\\" title=\\"LLM digest\\"/.test(text) &&
    /application\/ld\+json/.test(text) &&
    /\{\\"@context\\":\\"https:\/\/schema\.org\\",\\"@type\\":\\"WebPage\\"\}/.test(text) &&
    /rel=\\"preconnect\\" href=\\"https:\/\/fonts\.googleapis\.com\\" crossorigin/.test(text) &&
    /family=Inter&amp;display=swap/.test(text) &&
    /hole cwl:unknown-icon;/.test(text) &&
    /hole cwl:missing-icon-slot;/.test(text) &&
    /hole cwl:missing-alternate-slot;/.test(text) &&
    /hole cwl:missing-jsonld-slot;/.test(text) &&
    /hole cwl:missing-preconnect-slot;/.test(text) &&
    /hole cwl:preconnect-not-url;/.test(text) &&
    /hole cwl:alternate-not-url;/.test(text) &&
    /hole cwl:jsonld-not-json;/.test(text) &&
    /hole cwl:jsonld-closes-script;/.test(text) &&
    !/javascript:alert/.test(text) &&
    !/\nnot-json\n/.test(text) &&
    !/<\/script><script>/.test(text));

  // RFC-0036 (1.0.79 / gold 88): job enqueue intent only — name is a document id.
  // No queue engine invent. Golds 87/89 stay tip document facts (host owns WS/UI).
  await checkGold("job-enqueue", "88-job-enqueue", (text) =>
    /effects: job\.enqueue name nightly_digest;/.test(text) &&
    /effects: job\.enqueue, rate\.limit;/.test(text) &&
    !/unsupported-call/.test(text) &&
    !/hole/.test(text));

  // Tip 1.0.79 consume: golds 87–89 parse via ALWAYS-synced parser (no WS/queue invent).
  try {
    const { parseCwlModule } = await import(pathToFileURL(join(root, "scripts/hub-ingest/cwl-parser.mjs")).href);
    for (const name of ["87-stream-websocket", "88-job-enqueue", "89-ui-event-contracts"]) {
      const path = join(cwlRoot, "fixtures/language-gold", name, "routes.cwl");
      if (!existsSync(path)) {
        checks.push({ id: `tip-1.0.79-parse:${name}`, ok: false, detail: "missing" });
        continue;
      }
      const { readFileSync } = await import("node:fs");
      const mod = parseCwlModule(readFileSync(path, "utf8"), path);
      const ok = Boolean(mod.moduleName) && (mod.routes?.length ?? 0) >= 1;
      checks.push({
        id: `tip-1.0.79-parse:${name}`,
        ok,
        detail: ok ? `module=${mod.moduleName};routes=${mod.routes.length}` : "parse failed",
      });
    }
  } catch (e) {
    checks.push({
      id: "tip-1.0.79-parse",
      ok: false,
      detail: String(e?.message ?? e).slice(0, 300),
    });
  }

  // Tip 1.0.81 / RFC-0038: gold 90 framework residuals are document facts — catalogue only.
  // Do not invent Nest / LiveView / Flutter / onion / raw-SQL façades.
  try {
    const { parseCwlModule } = await import(pathToFileURL(join(root, "scripts/hub-ingest/cwl-parser.mjs")).href);
    const { CWL_FULLSTACK_HOLE_CATALOG, lookupFullstackHole } = await import(
      pathToFileURL(join(root, "scripts/hub-ingest/cwl-fullstack-holes.mjs")).href,
    );
    const path = join(cwlRoot, "fixtures/language-gold", "90-framework-residuals", "routes.cwl");
    if (!existsSync(path)) {
      checks.push({ id: "tip-1.0.81-parse:90-framework-residuals", ok: false, detail: "missing" });
    } else {
      const { readFileSync } = await import("node:fs");
      const src = readFileSync(path, "utf8");
      const mod = parseCwlModule(src, path);
      const reasons = [
        "unsupported:nest-di",
        "unsupported:liveview",
        "unsupported:flutter",
        "unsupported:middleware-onion",
        "unsupported:raw-sql",
        "unsupported:opaque-script",
      ];
      const parseOk =
        Boolean(mod.moduleName) &&
        (mod.routes?.length ?? 0) >= reasons.length &&
        reasons.every((r) => src.includes(`hole ${r};`));
      checks.push({
        id: "tip-1.0.81-parse:90-framework-residuals",
        ok: parseOk,
        detail: parseOk
          ? `module=${mod.moduleName};routes=${mod.routes.length}`
          : "parse/residual text failed",
      });
      const catalogOk = reasons.every(
        (r) => CWL_FULLSTACK_HOLE_CATALOG[r] != null && lookupFullstackHole(r) != null,
      );
      checks.push({
        id: "tip-1.0.81-catalog:rfc-0038",
        ok: catalogOk,
        detail: catalogOk ? "RFC-0038 residuals catalogued" : "missing catalog entries",
      });
    }
  } catch (e) {
    checks.push({
      id: "tip-1.0.81-framework-residuals",
      ok: false,
      detail: String(e?.message ?? e).slice(0, 300),
    });
  }

  // Tip 1.0.82 / RFC-0039: gold 91 DNA identity are document facts — parse + catalogue only.
  // Do not invent capability / browser runtimes.
  try {
    const { parseCwlModule } = await import(pathToFileURL(join(root, "scripts/hub-ingest/cwl-parser.mjs")).href);
    const { CWL_FULLSTACK_HOLE_CATALOG, lookupFullstackHole } = await import(
      pathToFileURL(join(root, "scripts/hub-ingest/cwl-fullstack-holes.mjs")).href,
    );
    const path = join(cwlRoot, "fixtures/language-gold", "91-dna-identity", "routes.cwl");
    if (!existsSync(path)) {
      checks.push({ id: "tip-1.0.82-parse:91-dna-identity", ok: false, detail: "missing" });
    } else {
      const { readFileSync } = await import("node:fs");
      const src = readFileSync(path, "utf8");
      const mod = parseCwlModule(src, path);
      const facts = [
        'replaces "https://legacy.example/invoice.php"',
        'from peel "php" at "legacy/invoice.php"',
        "capability cookies",
        "capability network-same-origin",
        "works without client",
      ];
      const refuseHoles = [
        "cwl:replaces-not-url",
        "cwl:peel-not-identity",
        "cwl:unknown-capability",
      ];
      const parseOk =
        Boolean(mod.moduleName) &&
        (mod.routes?.length ?? 0) >= 5 &&
        facts.every((f) => src.includes(f)) &&
        refuseHoles.every((r) => src.includes(`hole ${r};`));
      const invoice = (mod.routes ?? []).find((r) => r.name === "invoice" || r.path === "/invoice");
      const identityOk =
        invoice?.replaces === "https://legacy.example/invoice.php" &&
        invoice?.peel?.stack === "php" &&
        invoice?.peel?.at === "legacy/invoice.php" &&
        Array.isArray(invoice?.capabilities) &&
        invoice.capabilities.includes("cookies") &&
        invoice.capabilities.includes("network-same-origin") &&
        invoice?.worksWithoutClient === true;
      checks.push({
        id: "tip-1.0.82-parse:91-dna-identity",
        ok: parseOk && identityOk,
        detail:
          parseOk && identityOk
            ? `module=${mod.moduleName};routes=${mod.routes.length};dna-facts`
            : "parse/dna-identity facts failed",
      });
      const catalogOk = refuseHoles.every(
        (r) => CWL_FULLSTACK_HOLE_CATALOG[r] != null && lookupFullstackHole(r) != null,
      );
      checks.push({
        id: "tip-1.0.82-catalog:rfc-0039",
        ok: catalogOk,
        detail: catalogOk ? "RFC-0039 DNA identity holes catalogued" : "missing catalog entries",
      });
    }
  } catch (e) {
    checks.push({
      id: "tip-1.0.82-dna-identity",
      ok: false,
      detail: String(e?.message ?? e).slice(0, 300),
    });
  }

  // Tip 1.0.83 / RFC-0040: gold 92 progressive asset integrity are document facts — parse + catalogue only.
  // Do not invent JS/CSS runtime or Nest/LiveView/Flutter façades.
  try {
    const { parseCwlModule } = await import(pathToFileURL(join(root, "scripts/hub-ingest/cwl-parser.mjs")).href);
    const { CWL_FULLSTACK_HOLE_CATALOG, lookupFullstackHole } = await import(
      pathToFileURL(join(root, "scripts/hub-ingest/cwl-fullstack-holes.mjs")).href,
    );
    const path = join(cwlRoot, "fixtures/language-gold", "92-asset-integrity", "routes.cwl");
    if (!existsSync(path)) {
      checks.push({ id: "tip-1.0.83-parse:92-asset-integrity", ok: false, detail: "missing" });
    } else {
      const { readFileSync } = await import("node:fs");
      const src = readFileSync(path, "utf8");
      const mod = parseCwlModule(src, path);
      const facts = [
        'style "/app.css" integrity "sha384-Abcdefghijklmnopqrstuvwxyz0123456789+/=" crossorigin;',
        'script "/site.js" integrity "sha384-Abcdefghijklmnopqrstuvwxyz0123456789+/=" crossorigin;',
        'script "/editor.mjs" module integrity "sha384-Abcdefghijklmnopqrstuvwxyz0123456789+/=";',
        'style "/page.css" integrity "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";',
      ];
      const refuseHoles = ["cwl:bad-integrity", "cwl:bad-asset-url", "cwl:bad-asset-tail"];
      const site = (mod.layouts ?? []).find((l) => l.name === "site");
      const refuse = (mod.layouts ?? []).find((l) => l.name === "refuse");
      const editor = (mod.routes ?? []).find((r) => r.name === "editor" || r.path === "/editor");
      const parseOk =
        Boolean(mod.moduleName) &&
        facts.every((f) => src.includes(f)) &&
        refuseHoles.every((r) => src.includes(`hole ${r};`));
      const assetsOk =
        site?.styles?.[0]?.href === "/app.css" &&
        typeof site?.styles?.[0]?.integrity === "string" &&
        site?.styles?.[0]?.crossorigin === true &&
        site?.scripts?.some((s) => s.src === "/site.js" && s.integrity && s.crossorigin === true) &&
        site?.scripts?.some((s) => s.src === "/editor.mjs" && s.module === true && s.integrity) &&
        editor?.pageStyles?.[0]?.href === "/page.css" &&
        typeof editor?.pageStyles?.[0]?.integrity === "string" &&
        Array.isArray(refuse?.holes) &&
        refuseHoles.every((r) => refuse.holes.includes(r));
      checks.push({
        id: "tip-1.0.83-parse:92-asset-integrity",
        ok: parseOk && assetsOk,
        detail:
          parseOk && assetsOk
            ? `module=${mod.moduleName};layouts=${mod.layouts?.length};asset-facts`
            : "parse/asset-integrity facts failed",
      });
      const catalogOk = refuseHoles.every(
        (r) => CWL_FULLSTACK_HOLE_CATALOG[r] != null && lookupFullstackHole(r) != null,
      );
      checks.push({
        id: "tip-1.0.83-catalog:rfc-0040",
        ok: catalogOk,
        detail: catalogOk ? "RFC-0040 asset integrity holes catalogued" : "missing catalog entries",
      });
    }
  } catch (e) {
    checks.push({
      id: "tip-1.0.83-asset-integrity",
      ok: false,
      detail: String(e?.message ?? e).slice(0, 300),
    });
  }

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
    cwlTip: "1.0.83",
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
