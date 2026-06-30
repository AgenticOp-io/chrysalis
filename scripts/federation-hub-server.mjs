#!/usr/bin/env node
/** Local VMF federation hub — HTTP API over file-based registry (Phase 38 / G8530). */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadOpenLegacyIndex,
  loadRegistry,
  mergeFederationCorpus,
  mergeFederationWvb,
  publishFederationLeague,
  publishFederationArtifacts,
  submitFederationShard,
  submitFederationPayload,
  exportOpenLegacyBundle,
  syncRegistryFromOpenLegacyIndex,
  resolveFederationPaths,
} from "./site-port-federation-lib.mjs";

export const FEDERATION_HUB_API_KIND = "chrysalis.site-port-federation.hub-api.v1";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function sendJson(res, status, body) {
  const text = `${JSON.stringify(body, null, 2)}\n`;
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(text);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

/**
 * @param {object} opts
 * @param {string} opts.repoRoot
 */
export function createFederationHubHandler(opts) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);

  return async function federationHubHandler(req, res) {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const path = url.pathname;

    try {
      if (req.method === "GET" && path === "/api/vmf/health") {
        return sendJson(res, 200, {
          ok: true,
          kind: FEDERATION_HUB_API_KIND,
          service: "chrysalis-vmf-hub",
          repoRoot,
        });
      }

      if (req.method === "GET" && path === "/api/vmf/index") {
        syncRegistryFromOpenLegacyIndex(repoRoot);
        return sendJson(res, 200, loadOpenLegacyIndex(repoRoot));
      }

      if (req.method === "GET" && path === "/api/vmf/registry") {
        syncRegistryFromOpenLegacyIndex(repoRoot);
        const registry = loadRegistry(repoRoot);
        return sendJson(res, registry ? 200 : 404, registry ?? { ok: false, skip: "registry-missing" });
      }

      if (req.method === "GET" && path === "/api/vmf/bundle") {
        return sendJson(res, 200, exportOpenLegacyBundle(repoRoot).bundle);
      }

      if (req.method === "GET" && path === "/api/vmf/shorthand") {
        const shorthandPath = join(repoRoot, "reports/federation/shorthand/intelligence-shorthands.v1.json");
        if (!existsSync(shorthandPath)) {
          return sendJson(res, 404, { ok: false, skip: "shorthand-not-exported" });
        }
        return sendJson(res, 200, JSON.parse(readFileSync(shorthandPath, "utf8")));
      }

      if (req.method === "POST" && path === "/api/vmf/export-shorthand") {
        const { exportIntelligenceShorthands } = await import("./web-llm-export-shorthand.mjs");
        const { runWebLlmBuildShorthandHub } = await import("./web-llm-build-shorthand-hub.mjs");
        const exported = await exportIntelligenceShorthands({ repoRoot });
        const hub = await runWebLlmBuildShorthandHub({ repoRoot });
        return sendJson(res, exported.ok === true ? 200 : 400, { ok: exported.ok === true, exported, hub });
      }

      if (req.method === "GET" && path === "/api/vmf/league") {
        const paths = resolveFederationPaths(repoRoot);
        const jsonPath = join(paths.leagueDir, "leaderboard.v1.json");
        if (!existsSync(jsonPath)) {
          return sendJson(res, 404, { ok: false, skip: "league-not-published" });
        }
        return sendJson(res, 200, JSON.parse(readFileSync(jsonPath, "utf8")));
      }

      if (req.method === "POST" && path === "/api/vmf/submit-shard") {
        const body = await readBody(req);
        syncRegistryFromOpenLegacyIndex(repoRoot);
        if (body.portReport && body.shard && body.fixtureId) {
          const result = await submitFederationPayload({
            repoRoot,
            fixtureId: String(body.fixtureId),
            contributor: body.contributor ? String(body.contributor) : undefined,
            portReport: body.portReport,
            shard: body.shard,
            mode: "remote-payload",
          });
          return sendJson(res, result.ok === true ? 200 : 400, result);
        }
        const projectDir = body.projectDir ? resolve(String(body.projectDir)) : null;
        if (!projectDir) {
          return sendJson(res, 400, {
            ok: false,
            skip: "missing-payload",
            hint: "POST { fixtureId, contributor, portReport, shard } or { projectDir, ... }",
          });
        }
        const result = await submitFederationShard({
          repoRoot,
          projectDir,
          ...(body.fixtureId ? { fixtureId: String(body.fixtureId) } : {}),
          ...(body.contributor ? { contributor: String(body.contributor) } : {}),
        });
        return sendJson(res, result.ok === true ? 200 : 400, result);
      }

      if (req.method === "POST" && path === "/api/vmf/publish-all") {
        const result = await publishFederationArtifacts(repoRoot);
        return sendJson(res, result.ok === true ? 200 : 400, result);
      }

      if (req.method === "POST" && path === "/api/vmf/merge-corpus") {
        const result = await mergeFederationCorpus(repoRoot);
        return sendJson(res, result.ok === true ? 200 : 400, result);
      }

      if (req.method === "POST" && path === "/api/vmf/merge-wvb") {
        const result = await mergeFederationWvb(repoRoot);
        return sendJson(res, result.ok === true ? 200 : 400, result);
      }

      if (req.method === "POST" && path === "/api/vmf/publish-league") {
        const result = await publishFederationLeague(repoRoot);
        return sendJson(res, result.ok === true ? 200 : 400, result);
      }

      return sendJson(res, 404, { ok: false, skip: "not-found", path });
    } catch (e) {
      return sendJson(res, 500, { ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  };
}

/**
 * @param {object} [opts]
 * @param {number} [opts.port]
 * @param {string} [opts.repoRoot]
 * @param {string} [opts.host]
 */
export function startFederationHubServer(opts = {}) {
  const host = opts.host ?? "127.0.0.1";
  const port = opts.port ?? Number.parseInt(process.env.CHRYSALIS_FEDERATION_HUB_PORT ?? "19101", 10);
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const handler = createFederationHubHandler({ repoRoot });
  const server = createServer((req, res) => {
    handler(req, res).catch((e) => sendJson(res, 500, { ok: false, error: String(e) }));
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, host, () => {
      resolve({
        server,
        host,
        port,
        baseUrl: `http://${host}:${port}`,
        repoRoot,
      });
    });
  });
}

async function main() {
  const started = await startFederationHubServer();
  console.error(`[federation-hub] listening on ${started.baseUrl}`);
  console.error("[federation-hub] GET  /api/vmf/health /index /registry /bundle /shorthand /league");
  console.error("[federation-hub] POST /api/vmf/submit-shard /merge-corpus /merge-wvb /publish-league /publish-all /export-shorthand");
}

if (process.argv[1]?.includes("federation-hub-server")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
