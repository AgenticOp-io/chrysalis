import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { WEB_LLM_BENCHMARK_KIND, WEB_LLM_BENCHMARK_SCHEMA_VERSION } from "./kinds.js";
import type { WebVerifyBenchmark, WebVerifyBenchmarkCase } from "./types.js";

export type BuildWebVerifyBenchmarkOptions = {
  repoRoot: string;
  includeWispUiAnchors?: boolean;
};

function listFixtureDirs(repoRoot: string): string[] {
  const fixturesRoot = join(repoRoot, "fixtures");
  if (!existsSync(fixturesRoot)) return [];
  /** @type {string[]} */
  const dirs = [];
  for (const name of readdirSync(fixturesRoot)) {
    const abs = join(fixturesRoot, name);
    try {
      if (statSync(abs).isDirectory()) dirs.push(name);
    } catch {
      /* skip */
    }
  }
  return dirs.sort();
}

function tierForFixture(name: string): WebVerifyBenchmarkCase["tier"] {
  if (name.includes("wisp") || name.includes("flagship") || name.includes("pilot")) return "oracle";
  if (name.includes("probe") || name.includes("tiny")) return "structural";
  return "structural";
}

function taskForFixture(name: string): WebVerifyBenchmarkCase["task"] {
  if (name.includes("wisp")) return "ui-parity";
  if (name.includes("wordpress") || name.includes("hub-")) return "migrate";
  return "verify";
}

function loadRoutesCases(repoRoot: string, fixture: string): WebVerifyBenchmarkCase[] {
  const routesPath = join(repoRoot, "fixtures", fixture, "chrysalis.routes.json");
  if (!existsSync(routesPath)) return [];
  const json = JSON.parse(readFileSync(routesPath, "utf8"));
  const routes = json.routes ?? [];
  /** @type {WebVerifyBenchmarkCase[]} */
  const cases = [];
  let i = 0;
  for (const route of routes) {
    const method = String(route.method ?? "GET").toUpperCase();
    const path = String(route.path ?? "/");
    cases.push({
      id: `${fixture}-${method}-${path.replace(/[^a-zA-Z0-9]+/g, "_")}-${i++}`,
      fixture,
      path,
      method,
      task: taskForFixture(fixture),
      tier: tierForFixture(fixture),
      tags: ["routes-json", fixture],
    });
  }
  return cases;
}

function loadWispStaticExportCases(repoRoot: string): WebVerifyBenchmarkCase[] {
  const manifestPath = join(
    repoRoot,
    "fixtures/hub-wisp-management/chrysalis.wisp-cwl-static-export.v1.json",
  );
  if (!existsSync(manifestPath)) return [];
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const pages = manifest.routes ?? manifest.pages ?? manifest.exported ?? [];
  /** @type {WebVerifyBenchmarkCase[]} */
  const cases = [];
  let i = 0;
  for (const page of pages) {
    const path = typeof page === "string" ? page : page.path;
    if (!path) continue;
    cases.push({
      id: `wisp-static-${String(path).replace(/[^a-zA-Z0-9]+/g, "_")}-${i++}`,
      fixture: "hub-wisp-management",
      path: String(path),
      method: "GET",
      task: "ui-parity" as const,
      tier: "showcase" as const,
      tags: ["wisp", "cwl-static-export"],
    });
  }
  return cases;
}

function loadPhase41SemanticCases(repoRoot: string): WebVerifyBenchmarkCase[] {
  const fixtures = [
    "hub-js-semantic-req-res",
    "hub-js-semantic-calls",
    "hub-js-semantic-sql",
    "hub-gold-js-middleware",
    "hub-python-semantic-req-res",
    "hub-python-semantic-sql",
  ];
  /** @type {WebVerifyBenchmarkCase[]} */
  const cases = [];
  for (const fixture of fixtures) {
    for (const c of loadRoutesCases(repoRoot, fixture)) {
      cases.push({
        ...c,
        task: "migrate" as const,
        tier: "structural" as const,
        tags: [...(c.tags ?? []), "phase41", "js-semantic"],
      });
    }
  }
  return cases;
}

function loadWispUiAnchorCases(repoRoot: string): WebVerifyBenchmarkCase[] {
  const manifestPath = join(repoRoot, "fixtures/hub-wisp-management/chrysalis.wisp-ui-parity.v1.json");
  if (!existsSync(manifestPath)) return [];
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const anchors = manifest.anchors ?? [];
  /** @type {WebVerifyBenchmarkCase[]} */
  const cases = [];
  for (const anchor of anchors) {
    cases.push({
      id: `wisp-anchor-${String(anchor.path).replace(/[^a-zA-Z0-9]+/g, "_")}`,
      fixture: "hub-wisp-management",
      path: String(anchor.path),
      method: "GET",
      task: "ui-parity" as const,
      tier: "showcase" as const,
      tags: ["wisp", "ui-parity", "anchor"],
    });
  }
  return cases;
}

export function buildWebVerifyBenchmark(opts: BuildWebVerifyBenchmarkOptions): WebVerifyBenchmark {
  const repoRoot = opts.repoRoot;
  /** @type {WebVerifyBenchmarkCase[]} */
  const cases = [];
  const seen = new Set<string>();

  for (const fixture of listFixtureDirs(repoRoot)) {
    for (const c of loadRoutesCases(repoRoot, fixture)) {
      const key = `${c.fixture}:${c.method}:${c.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cases.push(c);
    }
  }

  for (const c of loadWispStaticExportCases(repoRoot)) {
    const key = `${c.fixture}:${c.method}:${c.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cases.push(c);
  }

  if (opts.includeWispUiAnchors !== false) {
    for (const c of loadWispUiAnchorCases(repoRoot)) {
      const key = `${c.fixture}:${c.method}:${c.path}`;
      const existing = cases.find((x) => `${x.fixture}:${x.method}:${x.path}` === key);
      if (existing) {
        const tags = new Set([...(existing.tags ?? []), ...(c.tags ?? [])]);
        existing.tags = [...tags];
        if (c.task === "ui-parity") existing.task = c.task;
        if (c.tier === "showcase") existing.tier = c.tier;
        continue;
      }
      seen.add(key);
      cases.push(c);
    }
  }

  for (const c of loadPhase41SemanticCases(repoRoot)) {
    const key = `${c.fixture}:${c.method}:${c.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cases.push(c);
  }

  cases.sort((a, b) => a.id.localeCompare(b.id));

  const tiers: WebVerifyBenchmark["tiers"] = {};
  const tasks: WebVerifyBenchmark["tasks"] = {};
  for (const c of cases) {
    tiers[c.tier] = (tiers[c.tier] ?? 0) + 1;
    tasks[c.task] = (tasks[c.task] ?? 0) + 1;
  }

  return {
    kind: WEB_LLM_BENCHMARK_KIND,
    schemaVersion: WEB_LLM_BENCHMARK_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    caseCount: cases.length,
    cases,
    tiers,
    tasks,
  };
}

export function summarizeWebVerifyBenchmark(benchmark: WebVerifyBenchmark) {
  return {
    kind: benchmark.kind,
    schemaVersion: benchmark.schemaVersion,
    caseCount: benchmark.caseCount,
    tiers: benchmark.tiers,
    tasks: benchmark.tasks,
    ok: benchmark.caseCount >= 50,
  };
}
