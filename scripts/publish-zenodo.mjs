#!/usr/bin/env node
/**
 * Publish AgenticOp / Chrysalis **documentation only** to Zenodo (no repo code).
 *
 * Bundle: landing copy, whitepaper, Intelligence Shorthand specs — markdown only.
 * Does NOT upload git archives, packages/, generated emits, or any source tree.
 *
 * Token: https://zenodo.org/account/settings/applications/tokens/new/
 * Scopes: deposit:write, deposit:actions
 *
 *   pnpm run publish:zenodo              # dry-run (bundle + print metadata)
 *   pnpm run publish:zenodo -- --publish # upload and publish (needs ZENODO_TOKEN)
 *   pnpm run publish:zenodo -- --publish --sandbox
 */
import { createReadStream, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const args = process.argv.slice(2);
const doPublish = args.includes("--publish");
const useSandbox = args.includes("--sandbox") || process.env.CHRYSALIS_ZENODO_SANDBOX === "1";

const zenodoBase = useSandbox ? "https://sandbox.zenodo.org" : "https://zenodo.org";
const token = process.env.ZENODO_TOKEN || process.env.ZENODO_ACCESS_TOKEN;

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version =
  process.env.CHRYSALIS_ZENODO_VERSION ||
  `${pkg.version}-${new Date().toISOString().slice(0, 10)}`;

/** Markdown-only; never add repo roots, packages/, or generated trees. */
const DOCS_ONLY_FILES = [
  "agenticop-site/index.md",
  "agenticop-site/whitepaper.md",
  "docs/INTELLIGENCE-SHORTHAND.md",
  "docs/INTELLIGENCE-SHORTHAND-PROTOCOL.md",
];

function ensureBundle() {
  const outDir = join(root, "reports", "zenodo");
  mkdirSync(outDir, { recursive: true });
  const zipName = `agenticop-cwl-is-docs-${version}.zip`;
  const zipPath = join(outDir, zipName);

  for (const rel of DOCS_ONLY_FILES) {
    if (!existsSync(join(root, rel))) {
      throw new Error(`publish-zenodo: missing doc ${rel}`);
    }
  }

  const readmePath = join(outDir, "README.txt");
  writeFileSync(
    readmePath,
    [
      "AgenticOp — CWL and Intelligence Shorthand (documentation only)",
      `Version: ${version}`,
      `Generated: ${new Date().toISOString()}`,
      "",
      "This archive contains markdown documentation only. No Chrysalis source code.",
      "Engine (MIT): https://github.com/AgenticOp-io/chrysalis",
      "Site: https://agenticop.io",
      "",
      "Files:",
      ...DOCS_ONLY_FILES.map((f) => `  - ${f}`),
    ].join("\n"),
    "utf8",
  );

  if (existsSync(zipPath)) unlinkSync(zipPath);

  const paths = [readmePath, ...DOCS_ONLY_FILES.map((f) => join(root, f))];
  const psPaths = paths.map((p) => `'${p.replace(/'/g, "''")}'`).join(", ");
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path ${psPaths} -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force"`,
    { stdio: "inherit" },
  );

  return { zipPath, zipName };
}

function authHeaders(json = true) {
  const h = { Authorization: `Bearer ${token}` };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

async function zenodoFetch(path, options = {}) {
  const url = `${zenodoBase}/api${path}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { message: text };
  }
  if (!res.ok) {
    const msg = body.message || body.errors?.map((e) => e.message).join("; ") || text;
    throw new Error(`Zenodo ${res.status} ${path}: ${msg}`);
  }
  return body;
}

function buildMetadata() {
  const creatorName = process.env.CHRYSALIS_ZENODO_CREATOR_NAME || "Peterson, David";
  const affiliation = process.env.CHRYSALIS_ZENODO_AFFILIATION || "AgenticOp";
  const description = [
    "Documentation-only deposition for Chrysalis Web Language (CWL) and Intelligence Shorthand (IS).",
    "",
    "Verified web migration: models propose; oracle capture and verify replay dispose.",
    "Intelligence Shorthand externalizes verified behavior at tiers T3–T5 so agents",
    "skip heavyweight LLM calls when coverage already exists.",
    "",
    "This record does not include Chrysalis source code. The open-source engine lives at",
    "https://github.com/AgenticOp-io/chrysalis (MIT). Practice site: https://agenticop.io",
  ].join("\n");

  return {
    metadata: {
      title: `CWL and Intelligence Shorthand — AgenticOp technical documentation (${version})`,
      upload_type: "publication",
      publication_type: "other",
      description,
      creators: [{ name: creatorName, affiliation }],
      keywords: [
        "Chrysalis Web Language",
        "CWL",
        "Intelligence Shorthand",
        "web migration",
        "verify replay",
        "oracle capture",
        "agentic workflows",
        "legacy modernization",
      ],
      license: "cc-by-4.0",
      access_right: "open",
      version,
      notes: "Documentation only; no software source code in this upload.",
      related_identifiers: [
        {
          identifier: "https://github.com/AgenticOp-io/chrysalis",
          relation: "isSupplementedBy",
          resource_type: "software",
        },
        {
          identifier: "https://agenticop.io",
          relation: "isPublishedBy",
          resource_type: "other",
        },
        {
          identifier: "https://agenticop.io/whitepaper.html",
          relation: "isPublishedBy",
          resource_type: "other",
        },
      ],
    },
  };
}

async function uploadFile(bucketUrl, zipPath, zipName) {
  const url = `${bucketUrl}/${encodeURIComponent(zipName)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
    },
    body: createReadStream(zipPath),
    duplex: "half",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Zenodo upload ${res.status}: ${text}`);
  }
}

async function main() {
  const { zipPath, zipName } = ensureBundle();
  console.log(`bundle (docs only): ${zipPath}`);
  console.log(`files: ${DOCS_ONLY_FILES.join(", ")}`);

  if (!doPublish) {
    console.log("");
    console.log("dry-run: metadata preview:");
    console.log(JSON.stringify(buildMetadata(), null, 2));
    console.log("");
    console.log(`To publish: $env:ZENODO_TOKEN='<token>'; pnpm run publish:zenodo -- --publish`);
    return;
  }

  if (!token) {
    console.error(
      [
        "ZENODO_TOKEN is not set.",
        "",
        "Create a token at:",
        `  ${zenodoBase}/account/settings/applications/tokens/new/`,
        "Scopes: deposit:write, deposit:actions",
        "",
        "Then run:",
        "  $env:ZENODO_TOKEN='<token>'; pnpm run publish:zenodo -- --publish",
      ].join("\n"),
    );
    process.exit(1);
  }

  console.log(`zenodo: ${zenodoBase}`);

  const deposition = await zenodoFetch("/deposit/depositions", {
    method: "POST",
    headers: authHeaders(),
    body: "{}",
  });
  const depositionId = deposition.id;
  const bucketUrl = deposition.links.bucket;
  console.log(`deposition: ${depositionId}`);

  await uploadFile(bucketUrl, zipPath, zipName);
  console.log(`uploaded: ${zipName}`);

  await zenodoFetch(`/deposit/depositions/${depositionId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(buildMetadata()),
  });
  console.log("metadata: updated");

  const published = await zenodoFetch(`/deposit/depositions/${depositionId}/actions/publish`, {
    method: "POST",
    headers: authHeaders(false),
  });

  const recordUrl =
    published.links?.record_html ||
    published.record_url ||
    `${zenodoBase}/record/${published.record_id || published.id}`;
  const doi = published.doi || published.metadata?.doi;
  console.log("");
  console.log("Published to Zenodo (documentation only).");
  if (doi) console.log(`DOI: ${doi}`);
  console.log(`Record: ${recordUrl}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
