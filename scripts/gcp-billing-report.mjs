#!/usr/bin/env node
/**
 * Monthly GCP billing report — BigQuery export when available, else resource inventory.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

const PROJECT = process.env.CHRYSALIS_GCE_PROJECT ?? "chrysalis-dev-f5x6qv";
const BILLING_ACCOUNT = process.env.CHRYSALIS_BILLING_ACCOUNT ?? "01EA2A-7E22D6-7B7AAF";
const DATASET = process.env.CHRYSALIS_BILLING_DATASET ?? "billing_export";
const TABLE_SUFFIX = BILLING_ACCOUNT.replace(/-/g, "_");
const EXPORT_TABLE = `${PROJECT}.${DATASET}.gcp_billing_export_v1_${TABLE_SUFFIX}`;

function gcloudJson(args) {
  const out = execSync(`gcloud ${args.join(" ")}`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, CLOUDSDK_CORE_DISABLE_PROMPTS: "1" },
  });
  return out.trim();
}

function tryBqQuery(sql) {
  try {
    const out = execSync(`bq query --use_legacy_sql=false --format=json --nouse_cache "${sql.replace(/"/g, '\\"')}"`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024,
    });
    return JSON.parse(out || "[]");
  } catch {
    return null;
  }
}

function listInstances(project) {
  try {
    const out = gcloudJson([
      "compute",
      "instances",
      "list",
      `--project=${project}`,
      '--format=json(name,zone,machineType,status,scheduling.provisioningModel,guestAccelerators)',
    ]);
    return JSON.parse(out || "[]");
  } catch {
    return [];
  }
}

function estimateVmMonthly(machineTypeUrl, diskGb = 30) {
  const mt = (machineTypeUrl ?? "").split("/").pop() ?? "unknown";
  const compute = mt.includes("e2-small") ? 15 : mt.includes("e2-micro") ? 8 : 20;
  const disk = Math.round(diskGb * 0.1);
  return { machineType: mt, estimateUsd: compute + disk };
}

export async function runBillingReport(opts = {}) {
  const root = resolve(opts.repoRoot ?? repoRoot);
  const generatedAt = new Date().toISOString();
  const report = {
    kind: "chrysalis.billing.report",
    schemaVersion: 1,
    generatedAt,
    billingAccount: BILLING_ACCOUNT,
    currency: "USD",
    dataSource: "inventory",
    monthlyTotals: [],
    byProject: [],
    runningResources: [],
    estimates: { accountUsdPerMonth: null, chrysalisUsdPerMonth: null },
    links: {
      reports: `https://console.cloud.google.com/billing/${BILLING_ACCOUNT}/reports`,
      costTable: `https://console.cloud.google.com/billing/${BILLING_ACCOUNT}/reports/cost_table`,
      chrysalisProject: `https://console.cloud.google.com/billing/${BILLING_ACCOUNT}/reports?project=${PROJECT}`,
      exportSetup: `https://console.cloud.google.com/billing/${BILLING_ACCOUNT}/export/bigquery?project=${PROJECT}`,
    },
    notes: [],
  };

  const monthSql = `
SELECT
  invoice.month AS month,
  project.id AS project_id,
  ROUND(SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 2) AS total_usd
FROM \`${EXPORT_TABLE}\`
WHERE invoice.month >= FORMAT_DATE('%Y%m', DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH))
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC
`.trim();

  const accountSql = `
SELECT
  invoice.month AS month,
  ROUND(SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 2) AS total_usd
FROM \`${EXPORT_TABLE}\`
WHERE invoice.month >= FORMAT_DATE('%Y%m', DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH))
GROUP BY 1
ORDER BY 1 DESC
`.trim();

  const byProject = tryBqQuery(monthSql);
  const monthlyTotals = tryBqQuery(accountSql);

  if (monthlyTotals && monthlyTotals.length > 0) {
    report.dataSource = "bigquery";
    report.monthlyTotals = monthlyTotals;
    report.byProject = byProject ?? [];
    const latest = monthlyTotals[0];
    if (latest?.total_usd != null) {
      report.estimates.accountUsdPerMonth = Number(latest.total_usd);
    }
    const chrysalis = (byProject ?? []).filter((r) => r.project_id === PROJECT);
    if (chrysalis.length > 0) {
      report.estimates.chrysalisUsdPerMonth = chrysalis.reduce((s, r) => s + Number(r.total_usd ?? 0), 0);
    }
  } else {
    report.notes.push(
      "BigQuery billing export not populated yet. Run: pnpm run billing:export-setup then enable export in Console.",
    );
    const projects = ["chrysalis-dev-f5x6qv", "lte-pci-mapper-65450042-bbf71"];
    let accountEst = 0;
    let chrysalisEst = 0;
    for (const pid of projects) {
      const vms = listInstances(pid);
      for (const vm of vms) {
        const est = estimateVmMonthly(vm.machineType);
        const row = {
          project: pid,
          name: vm.name,
          zone: vm.zone?.split("/").pop(),
          machineType: est.machineType,
          status: vm.status,
          provisioningModel: vm.scheduling?.provisioningModel,
          accelerator: vm.guestAccelerators?.[0]?.acceleratorType ?? null,
          estimateUsdPerMonth: vm.status === "RUNNING" ? est.estimateUsd : 0,
        };
        report.runningResources.push(row);
        if (vm.status === "RUNNING") {
          accountEst += est.estimateUsd;
          if (pid === PROJECT) chrysalisEst += est.estimateUsd;
        }
      }
    }
    report.estimates.accountUsdPerMonth = accountEst;
    report.estimates.chrysalisUsdPerMonth = chrysalisEst;
    report.notes.push("VM-only estimates; lte-pci-mapper Cloud Functions/Firebase not included.");
  }

  const outDir = join(root, "reports/billing");
  mkdirSync(outDir, { recursive: true });
  const date = generatedAt.slice(0, 10);
  const jsonPath = join(outDir, `billing-report-${date}.json`);
  const mdPath = join(outDir, `billing-report-${date}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const md = renderMarkdown(report);
  writeFileSync(mdPath, md, "utf8");

  return { ok: true, report, jsonPath, mdPath };
}

function renderMarkdown(report) {
  const lines = [
    `# GCP billing report`,
    ``,
    `**Generated:** ${report.generatedAt}`,
    `**Source:** ${report.dataSource}`,
    `**Billing account:** ${report.billingAccount} (USD)`,
    ``,
  ];

  if (report.dataSource === "bigquery" && report.monthlyTotals.length > 0) {
    lines.push(`## Monthly totals (invoice)`, ``, `| Month | Total USD |`, `| --- | --- |`);
    for (const row of report.monthlyTotals) {
      lines.push(`| ${row.month} | $${row.total_usd} |`);
    }
    lines.push(``);
    if (report.byProject.length > 0) {
      lines.push(`## By project (latest months)`, ``, `| Month | Project | USD |`, `| --- | --- | --- |`);
      for (const row of report.byProject.slice(0, 30)) {
        lines.push(`| ${row.month} | ${row.project_id} | $${row.total_usd} |`);
      }
      lines.push(``);
    }
  } else {
    lines.push(
      `## Estimates (VM compute only)`,
      ``,
      `| Scope | Est. USD/month |`,
      `| --- | --- |`,
      `| Account (visible VMs) | ~$${report.estimates.accountUsdPerMonth} |`,
      `| Chrysalis dev | ~$${report.estimates.chrysalisUsdPerMonth} |`,
      ``,
    );
    if (report.runningResources.length > 0) {
      lines.push(`## Running resources`, ``, `| Project | VM | Type | Status | Est./mo |`, `| --- | --- | --- | --- | --- |`);
      for (const r of report.runningResources) {
        lines.push(`| ${r.project} | ${r.name} | ${r.machineType} | ${r.status} | ~$${r.estimateUsdPerMonth} |`);
      }
      lines.push(``);
    }
  }

  for (const n of report.notes) {
    lines.push(`> ${n}`);
  }
  lines.push(
    ``,
    `## Console`,
    `- [Reports](${report.links.reports})`,
    `- [Cost table](${report.links.costTable})`,
    `- [Chrysalis project](${report.links.chrysalisProject})`,
    `- [Enable BigQuery export](${report.links.exportSetup})`,
  );
  return `${lines.join("\n")}\n`;
}

async function main() {
  const result = await runBillingReport();
  console.log(
    JSON.stringify(
      {
        ok: result.ok,
        jsonPath: result.jsonPath,
        mdPath: result.mdPath,
        dataSource: result.report.dataSource,
        estimates: result.report.estimates,
        monthlyTotals: result.report.monthlyTotals,
      },
      null,
      2,
    ),
  );
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
