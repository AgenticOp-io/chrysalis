#!/usr/bin/env node
/**
 * Public hub /reports/ serving (G9700 / D6389) — demo dashboards reachable without auth.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

export const HUB_PUBLIC_REPORTS_KIND = "chrysalis.hub.public-reports-smoke";
export const HUB_PUBLIC_REPORTS_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runPublicReportsSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const dashPath = join(repoRoot, "reports/web-llm/operator-evidence/poc/index.html");
  const analyticsPath = join(repoRoot, "reports/web-llm/shorthand/is-live-analytics.v1.json");
  const operatorWeb = join(repoRoot, "scripts/chrysalis-operator-web.mjs");

  const fileChecks = {
    dashboardExists: existsSync(dashPath),
    analyticsExists: existsSync(analyticsPath),
    operatorWebExists: existsSync(operatorWeb),
    operatorWebServesReports: existsSync(operatorWeb)
      ? readFileSync(operatorWeb, "utf8").includes("resolvePublicReportPath")
      : false,
  };

  // Local ephemeral hub on a free port — prove /reports/ is public.
  const port = 19191 + Math.floor(Math.random() * 200);
  const child = spawn(
    process.execPath,
    [operatorWeb],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        CHRYSALIS_STATUS_PORT: String(port),
        CHRYSALIS_STATUS_BIND: "127.0.0.1",
        CHRYSALIS_STATUS_REPO: repoRoot,
        CHRYSALIS_OPERATOR_REPO: repoRoot,
        CHRYSALIS_HUB_RELOAD_STATIC: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let ready = false;
  for (let i = 0; i < 40; i++) {
    await wait(150);
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/config`);
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {
      /* retry */
    }
  }

  let reportStatus = 0;
  let reportTitleOk = false;
  let authNotRequired = false;
  if (ready) {
    const res = await fetch(`http://127.0.0.1:${port}/reports/web-llm/operator-evidence/poc/`);
    reportStatus = res.status;
    const text = await res.text();
    reportTitleOk = text.includes("IS Live Analytics");
    authNotRequired = reportStatus === 200;
  }

  try {
    child.kill("SIGTERM");
  } catch {
    /* ignore */
  }

  const checks = {
    ...fileChecks,
    hubReady: ready,
    reportHttp200: reportStatus === 200,
    reportTitleOk,
    authNotRequired,
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_PUBLIC_REPORTS_KIND,
    schemaVersion: HUB_PUBLIC_REPORTS_SCHEMA_VERSION,
    ok,
    checks,
    publicUrl: "https://hub.agenticop.io/reports/web-llm/operator-evidence/poc/",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPublicReportsSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-public-reports-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
