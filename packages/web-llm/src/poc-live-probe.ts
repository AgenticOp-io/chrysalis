import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type WispAnchorProbe = {
  path: string;
  ok: boolean;
  status: number;
  missing: string[];
  bodyLength: number;
};

export type WispLiveProbeResult = {
  ok: boolean;
  skip?: string;
  baseUrl: string | null;
  strict: boolean;
  probes: WispAnchorProbe[];
};

export type WispAnchorSpec = {
  path: string;
  required: string[];
  minLength?: number;
};

export function resolveWispDemoBaseUrl(repoRoot: string): string | null {
  const catalogPath = join(repoRoot, "fixtures/web-llm/chrysalis.web-llm-poc-scenarios.v1.json");
  if (existsSync(catalogPath)) {
    const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as { demoUrl?: string };
    if (catalog.demoUrl) return catalog.demoUrl.replace(/\/$/, "");
  }
  const manifestPath = join(repoRoot, "fixtures/hub-wisp-management/wisp-demo-manifest.v1.json");
  if (!existsSync(manifestPath)) return null;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    gce?: { lastKnownNatIp?: string; port?: number; baseUrlPattern?: string };
  };
  const ip = manifest.gce?.lastKnownNatIp;
  const port = manifest.gce?.port ?? 19100;
  if (!ip) return null;
  const pattern = manifest.gce?.baseUrlPattern ?? "http://{natIp}:{port}";
  return pattern.replace("{natIp}", ip).replace("{port}", String(port)).replace(/\/$/, "");
}

export function loadWispAnchorSpecs(repoRoot: string): WispAnchorSpec[] {
  const path = join(repoRoot, "fixtures/hub-wisp-management/chrysalis.wisp-ui-parity.v1.json");
  if (!existsSync(path)) return [];
  const manifest = JSON.parse(readFileSync(path, "utf8")) as { anchors?: WispAnchorSpec[] };
  return manifest.anchors ?? [];
}

export function isWispPocLiveStrict(): boolean {
  return process.env.CHRYSALIS_WISP_POC_LIVE === "1";
}

export async function probeWispGceLiveAnchors(
  repoRoot: string,
  opts: { strict?: boolean; fetchFn?: typeof fetch } = {},
): Promise<WispLiveProbeResult> {
  const strict = opts.strict ?? isWispPocLiveStrict();
  const fetchFn = opts.fetchFn ?? fetch;
  const baseUrl = resolveWispDemoBaseUrl(repoRoot);
  if (!baseUrl) {
    return { ok: !strict, skip: "no-demo-url", baseUrl: null, strict, probes: [] };
  }
  const specs = loadWispAnchorSpecs(repoRoot);
  if (specs.length === 0) {
    return { ok: !strict, skip: "no-anchor-specs", baseUrl, strict, probes: [] };
  }

  /** @type {WispAnchorProbe[]} */
  const probes = [];
  let ok = true;
  try {
    for (const spec of specs) {
      const res = await fetchFn(`${baseUrl}${spec.path}`);
      const body = await res.text();
      const missing = spec.required.filter((token) => !body.includes(token));
      const minLength = spec.minLength ?? 0;
      const probeOk = res.status === 200 && missing.length === 0 && body.length >= minLength;
      if (!probeOk) ok = false;
      probes.push({
        path: spec.path,
        ok: probeOk,
        status: res.status,
        missing,
        bodyLength: body.length,
      });
    }
  } catch (err) {
    if (strict) {
      return {
        ok: false,
        baseUrl,
        strict,
        probes,
        skip: err instanceof Error ? err.message : "gce-fetch-failed",
      };
    }
    return { ok: true, skip: "gce-unreachable", baseUrl, strict, probes };
  }

  if (!ok && !strict) {
    return { ok: true, skip: "gce-probe-soft-fail", baseUrl, strict, probes };
  }
  return { ok, baseUrl, strict, probes };
}
