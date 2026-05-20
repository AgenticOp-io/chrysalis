/**
 * Create (or reuse) a GitHub Project (v2), link it to this repository, and add
 * custom fields aligned with ROADMAP.md "Multi-lane program" + release ops.
 *
 * Prerequisites:
 *   - GitHub CLI: https://cli.github.com/
 *   - Token scopes: project, read:project
 *       gh auth refresh -s project,read:project
 *
 * Environment (optional):
 *   CHRYSALIS_GH_PROJECT_OWNER  default: parsed from package.json repository.url (GitHub owner)
 *   CHRYSALIS_GH_PROJECT_TITLE  default: "Chrysalis" (preset chrysalis) or "Web Platform Translation Program" (preset master)
 *   CHRYSALIS_GH_REPO            default: owner/chrysalis from repository.url
 *   CHRYSALIS_GH_PROJECT_PRESET  chrysalis | master (default: chrysalis)
 *       master = Web Platform Translation Program lanes + optional "Workstream" field (see docs/MASTER-PROGRAM.md)
 *   CHRYSALIS_GH_PROJECT_SEED_ITEMS  when preset=master: create §12 draft project items if missing (default: 1).
 *       Set to 0 to skip. Requires gh project scopes.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function gh(args, { allowFail = false } = {}) {
  const r = spawnSync("gh", args, { encoding: "utf8", cwd: ROOT });
  if (!allowFail && (r.status !== 0 || r.error)) {
    process.stderr.write(r.stderr || r.stdout || String(r.error));
    process.exit(r.status ?? 1);
  }
  return { status: r.status ?? 0, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function ghJson(args) {
  const { stdout, stderr, status } = gh([...args, "--format", "json"]);
  if (status !== 0) {
    process.stderr.write(stderr);
    process.exit(status);
  }
  const t = stdout.trim();
  if (!t) return null;
  return JSON.parse(t);
}

function repoMeta() {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const url = pkg.repository?.url;
  const m = typeof url === "string" ? url.match(/github\.com\/([^/]+)\/([^/.]+)/) : null;
  const owner = process.env.CHRYSALIS_GH_PROJECT_OWNER ?? (m ? m[1] : "AgenticOp-io");
  const repoShort = m ? m[2] : "chrysalis";
  const repoFull = process.env.CHRYSALIS_GH_REPO ?? `${owner}/${repoShort}`;
  return { owner, repoFull };
}

function projectList(owner) {
  const data = ghJson(["project", "list", "--owner", owner, "-L", "100"]);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.projects)) return data.projects;
  return [];
}

function fieldNames(owner, projectNumber) {
  const data = ghJson(["project", "field-list", String(projectNumber), "--owner", owner, "-L", "50"]);
  const fields = Array.isArray(data) ? data : data?.fields ?? [];
  return new Set(fields.map((f) => f?.name).filter(Boolean));
}

const PRESET_CHRYSALIS = "chrysalis";
const PRESET_MASTER = "master";

function projectPreset() {
  for (const arg of process.argv.slice(2)) {
    const m = /^--preset=(.+)$/.exec(arg.trim());
    if (m) {
      const v = m[1].trim().toLowerCase();
      if (v === PRESET_MASTER) return PRESET_MASTER;
      if (v === PRESET_CHRYSALIS) return PRESET_CHRYSALIS;
      process.stderr.write(`bootstrap-github-project: unknown --preset=${JSON.stringify(m[1])}\n`);
      process.exit(1);
    }
  }
  const raw = (process.env.CHRYSALIS_GH_PROJECT_PRESET ?? PRESET_CHRYSALIS).trim().toLowerCase();
  if (raw === PRESET_MASTER) return PRESET_MASTER;
  return PRESET_CHRYSALIS;
}

function defaultProjectTitle(preset) {
  if (preset === PRESET_MASTER) return "Web Platform Translation Program";
  return "Chrysalis";
}

function laneOptionsForPreset(preset) {
  if (preset === PRESET_MASTER) {
    return [
      "D0 - Charter and GitHub Project",
      "D1 - Chrysalis reference leg (PHP oracle WebIR emit verify)",
      "D2 - IR hub specification v0",
      "D3 - Second source profile",
      "D4 - Second emit target family",
      "D5 - Compatibility matrix product",
      "D6 - Enterprise connectors",
      "D7 - Continuous expansion",
    ];
  }
  return [
    "Lane A - Parser contract",
    "Lane B - Oracle depth",
    "Lane C - Verify UX",
    "Lane D - Hole economics",
    "Release / infra",
  ];
}

/** @type {{ title: string; body: string; lane: string; workstream: string; boardStatus: string }[]} */
const MASTER_PROGRAM_DRAFT_ISSUES = [
  {
    title: "D0 — Approve docs/MASTER-PROGRAM.md v1",
    body: "Legal + Architecture board. Charter: docs/MASTER-PROGRAM.md",
    lane: "D0 - Charter and GitHub Project",
    workstream: "Legal and trust",
    boardStatus: "Backlog",
  },
  {
    title: "D0 — Link sibling repos to Project",
    body:
      "Link these repositories on the WPTP GitHub Project (Settings → Linked repositories):\n\n" +
      "- https://github.com/theorem6/wptp-matrix (compatibility matrix, 24 edges; CI via Chrysalis `wptp:*-harness`)\n" +
      "- https://github.com/theorem6/wptp-ir (IR hub v0; `exportIrToWebIrBundleV0`)\n" +
      "- https://github.com/theorem6/wptp-emit-nextjs (silver Next.js emitter)\n" +
      "- https://github.com/theorem6/wptp-emit-hono / wptp-adapter-openapi / wptp-adapter-browser (bronze compose)\n\n" +
      "Evidence rows: `echo-api-composed-*-chrysalis-silver`, `openapi-composed-hono-chrysalis-silver`, D3/D4 harnesses in Chrysalis CI.",
    lane: "D0 - Charter and GitHub Project",
    workstream: "Matrix and product",
    boardStatus: "In progress",
  },
  {
    title: "D5 — wptp-matrix: link Project + keep CI green",
    body:
      "Repository: https://github.com/theorem6/wptp-matrix\n\n" +
      "- `npm run validate` (matrix.v0.json)\n" +
      "- `CHRYSALIS_ROOT` + `verify:harness` / Chrysalis `wptp:d3-silver-harness`, `wptp:silver-nextjs-harness`\n" +
      "- Quarterly: `pnpm run wptp:d7-audit` in Chrysalis (see docs/WPTP-D7-ONGOING.md)",
    lane: "D5 - Compatibility matrix product",
    workstream: "Matrix and product",
    boardStatus: "In progress",
  },
  {
    title: "D2 — wptp-ir: link Project + WebIR import contract",
    body:
      "Repository: https://github.com/theorem6/wptp-ir\n\n" +
      "- IR schema 0.1.0; import `chrysalis.webir.bundle@1.0.0`\n" +
      "- Chrysalis CI: `webir-bundle-to-wptp-ir` workflow + `scripts/verify-webir-bundle-wptp-ir.mjs`",
    lane: "D2 - IR hub specification v0",
    workstream: "IR hub",
    boardStatus: "In progress",
  },
  {
    title: "D1 — Confirm Chrysalis D1 exit checklist",
    body: "Map docs/MASTER-PROGRAM.md section 10 to ROADMAP.md and current CI/flagship status.",
    lane: "D1 - Chrysalis reference leg (PHP oracle WebIR emit verify)",
    workstream: "Chrysalis (D1)",
    boardStatus: "Backlog",
  },
  {
    title: "D2 — Publish IR hub repo skeleton",
    body: "Suggested name wptp-ir (or chosen). README must state purpose, invariants, non-goals (AGENTS.md pattern).",
    lane: "D2 - IR hub specification v0",
    workstream: "IR hub",
    boardStatus: "Backlog",
  },
  {
    title: "D2 — Define WebIR → IR v0 import mapping",
    body: "Technical design issue; link relevant DESIGN.md decision log entries.",
    lane: "D2 - IR hub specification v0",
    workstream: "IR hub",
    boardStatus: "Backlog",
  },
  {
    title: "D3 — Select second source profile",
    body: "OpenAPI vs browser trace vs other; include legal review sub-issue where needed.",
    lane: "D3 - Second source profile",
    workstream: "Adapters",
    boardStatus: "Backlog",
  },
  {
    title: "D4 — Select second emit target",
    body: "Business-driven choice; spike verify harness compatibility for the target family.",
    lane: "D4 - Second emit target family",
    workstream: "Emitters",
    boardStatus: "Backlog",
  },
  {
    title: "D5 — Matrix schema + website",
    body: "Public JSON + CI guard against false greens (see MASTER-PROGRAM).",
    lane: "D5 - Compatibility matrix product",
    workstream: "Matrix and product",
    boardStatus: "Backlog",
  },
  {
    title: "Standing — Quarterly matrix audit",
    body: "Recurring program hygiene; evidence-backed public matrix claims.",
    lane: "D7 - Continuous expansion",
    workstream: "Matrix and product",
    boardStatus: "Backlog",
  },
];

function shouldSeedMasterDraftItems(preset) {
  if (preset !== PRESET_MASTER) return false;
  const v = (process.env.CHRYSALIS_GH_PROJECT_SEED_ITEMS ?? "1").trim().toLowerCase();
  return v !== "0" && v !== "false" && v !== "no";
}

function shouldSeedMasterGithubIssues(preset) {
  if (preset !== PRESET_MASTER) return false;
  const v = (process.env.CHRYSALIS_GH_SEED_ISSUES ?? "1").trim().toLowerCase();
  return v !== "0" && v !== "false" && v !== "no";
}

/** @returns {Set<string>} */
function existingRepoIssueTitles(repoFull) {
  const r = gh(
    ["issue", "list", "--repo", repoFull, "--state", "all", "-L", "300", "--json", "title"],
    { allowFail: true },
  );
  if (r.status !== 0 || !r.stdout.trim()) return new Set();
  let data;
  try {
    data = JSON.parse(r.stdout);
  } catch {
    return new Set();
  }
  const arr = Array.isArray(data) ? data : [];
  const set = new Set();
  for (const row of arr) {
    if (typeof row?.title === "string") {
      const s = row.title.trim();
      if (s) set.add(s);
    }
  }
  return set;
}

function seedMasterProgramGithubIssues(repoFull) {
  const seen = existingRepoIssueTitles(repoFull);
  let created = 0;
  let skipped = 0;
  for (const row of MASTER_PROGRAM_DRAFT_ISSUES) {
    const title = row.title.trim();
    if (seen.has(title)) {
      skipped += 1;
      continue;
    }
    const body =
      `${row.body}\n\n---\n` +
      `**Program:** Web Platform Translation Program\n` +
      `**Lane:** ${row.lane}\n` +
      `**Workstream:** ${row.workstream}\n` +
      `**Board status:** ${row.boardStatus}\n` +
      `Charter: \`docs/MASTER-PROGRAM.md\` in \`theorem6/chrysalis\`.`;
    gh([
      "issue",
      "create",
      "--repo",
      repoFull,
      "--title",
      title,
      "--body",
      body,
    ]);
    seen.add(title);
    created += 1;
    console.log(`Created GitHub issue: ${title}`);
  }
  console.log(`\nMaster program GitHub issues: created ${created}, skipped (already present) ${skipped}.`);
}

/** @returns {Record<string, { id: string; options: Record<string, string> }>} */
function selectFieldsByName(owner, projectNumber) {
  const data = ghJson(["project", "field-list", String(projectNumber), "--owner", owner, "-L", "50"]);
  const arr = Array.isArray(data) ? data : data?.fields ?? [];
  /** @type {Record<string, { id: string; options: Record<string, string> }>} */
  const out = {};
  for (const f of arr) {
    if (!f?.options?.length || typeof f.id !== "string" || typeof f.name !== "string") continue;
    const options = {};
    for (const o of f.options) {
      if (typeof o?.name === "string" && typeof o?.id === "string") options[o.name] = o.id;
    }
    out[f.name] = { id: f.id, options };
  }
  return out;
}

/** @returns {Set<string>} */
function existingProjectItemTitles(owner, projectNumber) {
  const data = ghJson(["project", "item-list", String(projectNumber), "--owner", owner, "-L", "300"]);
  const items = data?.items ?? [];
  const set = new Set();
  for (const row of items) {
    const t = row?.content?.title ?? row?.title;
    if (typeof t === "string") {
      const s = t.trim();
      if (s) set.add(s);
    }
  }
  return set;
}

function optionOrDie(fieldLabel, fieldMeta, optionName) {
  const id = fieldMeta?.options?.[optionName];
  if (typeof id !== "string") {
    process.stderr.write(
      `bootstrap-github-project: missing ${fieldLabel} option ${JSON.stringify(optionName)}. ` +
        `Check gh project field-list for this project.\n`,
    );
    process.exit(1);
  }
  return id;
}

function seedMasterProgramDraftItems(owner, projectNumber, preset) {
  if (!shouldSeedMasterDraftItems(preset)) return;

  const projectId = ghJson(["project", "view", String(projectNumber), "--owner", owner, "--format", "json"])?.id;
  if (typeof projectId !== "string") {
    process.stderr.write("bootstrap-github-project: could not read project id from gh project view JSON.\n");
    process.exit(1);
  }

  const fields = selectFieldsByName(owner, projectNumber);
  const laneF = fields.Lane;
  const boardF = fields["Board status"];
  const workF = fields.Workstream;
  if (!laneF || !boardF) {
    process.stderr.write('bootstrap-github-project: expected custom fields "Lane" and "Board status".\n');
    process.exit(1);
  }
  if (!workF) {
    process.stderr.write('bootstrap-github-project: preset master expected "Workstream" field; skip seeding.\n');
    return;
  }

  const seen = existingProjectItemTitles(owner, projectNumber);
  let created = 0;
  let skipped = 0;

  for (const row of MASTER_PROGRAM_DRAFT_ISSUES) {
    if (seen.has(row.title.trim())) {
      skipped += 1;
      continue;
    }
    const createdItem = ghJson([
      "project",
      "item-create",
      String(projectNumber),
      "--owner",
      owner,
      "--title",
      row.title,
      "--body",
      row.body,
    ]);
    const itemId = typeof createdItem?.id === "string" ? createdItem.id : null;
    if (!itemId) {
      process.stderr.write(
        `bootstrap-github-project: item-create did not return id for ${JSON.stringify(row.title)}: ${JSON.stringify(createdItem)}\n`,
      );
      process.exit(1);
    }

    const laneOpt = optionOrDie("Lane", laneF, row.lane);
    const boardOpt = optionOrDie("Board status", boardF, row.boardStatus);
    const workOpt = optionOrDie("Workstream", workF, row.workstream);

    gh([
      "project",
      "item-edit",
      "--id",
      itemId,
      "--project-id",
      projectId,
      "--field-id",
      laneF.id,
      "--single-select-option-id",
      laneOpt,
    ]);
    gh([
      "project",
      "item-edit",
      "--id",
      itemId,
      "--project-id",
      projectId,
      "--field-id",
      boardF.id,
      "--single-select-option-id",
      boardOpt,
    ]);
    gh([
      "project",
      "item-edit",
      "--id",
      itemId,
      "--project-id",
      projectId,
      "--field-id",
      workF.id,
      "--single-select-option-id",
      workOpt,
    ]);

    seen.add(row.title.trim());
    created += 1;
    console.log(`Seeded draft item: ${row.title}`);
  }

  console.log(`\nMaster program draft items: created ${created}, skipped (already present) ${skipped}.`);
}

function ensureField(owner, projectNumber, name, dataType, singleSelectOptions) {
  const args = [
    "project",
    "field-create",
    String(projectNumber),
    "--owner",
    owner,
    "--name",
    name,
    "--data-type",
    dataType,
  ];
  if (dataType === "SINGLE_SELECT" && singleSelectOptions?.length) {
    args.push("--single-select-options", singleSelectOptions.join(","));
  }
  const r = gh(args, { allowFail: true });
  if (r.status !== 0 && !r.stderr.includes("already exists") && !r.stderr.includes("Name has already been taken")) {
    process.stderr.write(r.stderr || r.stdout);
    process.exit(r.status ?? 1);
  }
}

function main() {
  const preset = projectPreset();
  const title = process.env.CHRYSALIS_GH_PROJECT_TITLE ?? defaultProjectTitle(preset);
  const { owner, repoFull } = repoMeta();

  console.log(`bootstrap-github-project: preset=${preset} title=${title}`);

  if (shouldSeedMasterGithubIssues(preset)) {
    seedMasterProgramGithubIssues(repoFull);
  }

  const probe = gh(["project", "list", "--owner", owner, "-L", "1"], { allowFail: true });
  if (probe.status !== 0) {
    process.stderr.write(probe.stderr || probe.stdout);
    if (/read:project|missing required scopes/i.test(probe.stderr)) {
      process.stderr.write(
        "\nGitHub CLI needs project scopes to create the Project board. Run:\n" +
          "  gh auth refresh -s project,read:project\n" +
          "Then re-run:\n" +
          "  pnpm run github:project-bootstrap:master\n",
      );
      if (shouldSeedMasterGithubIssues(preset)) {
        process.stderr.write(
          "\nRepository issues for section 12 were created (or already existed) using repo scope.\n",
        );
      }
    }
    process.exit(probe.status || 1);
  }

  let projectNumber = null;
  for (const p of projectList(owner)) {
    if (p?.title === title && typeof p?.number === "number") {
      projectNumber = p.number;
      break;
    }
  }

  if (projectNumber == null) {
    const created = ghJson(["project", "create", "--owner", owner, "--title", title]);
    projectNumber = created?.number;
    if (typeof projectNumber !== "number") {
      console.error("bootstrap-github-project: could not parse project number from create response:", created);
      process.exit(1);
    }
    console.log(`Created project #${projectNumber} (${title}) for ${owner}`);
  } else {
    console.log(`Using existing project #${projectNumber} (${title}) for ${owner}`);
  }

  const linkR = gh(["project", "link", String(projectNumber), "--owner", owner, "--repo", repoFull], {
    allowFail: true,
  });
  if (linkR.status !== 0 && !/already linked|Linked/i.test(linkR.stderr + linkR.stdout)) {
    process.stderr.write(linkR.stderr || linkR.stdout);
    process.exit(linkR.status || 1);
  } else {
    console.log(`Linked project #${projectNumber} to ${repoFull}`);
  }

  const existing = fieldNames(owner, projectNumber);

  if (!existing.has("Lane")) {
    ensureField(owner, projectNumber, "Lane", "SINGLE_SELECT", laneOptionsForPreset(preset));
    console.log('Added field "Lane"');
  } else {
    console.log('Field "Lane" already present');
  }

  if (!existing.has("Board status")) {
    ensureField(owner, projectNumber, "Board status", "SINGLE_SELECT", [
      "Backlog",
      "In progress",
      "Blocked",
      "Done",
    ]);
    console.log('Added field "Board status"');
  } else {
    console.log('Field "Board status" already present');
  }

  if (preset === PRESET_MASTER && !existing.has("Workstream")) {
    ensureField(owner, projectNumber, "Workstream", "SINGLE_SELECT", [
      "Chrysalis (D1)",
      "IR hub",
      "Adapters",
      "Emitters",
      "Verify harness",
      "Matrix and product",
      "Legal and trust",
    ]);
    console.log('Added field "Workstream"');
  } else if (preset === PRESET_MASTER) {
    console.log('Field "Workstream" already present');
  }

  const v = gh(["project", "view", String(projectNumber), "--owner", owner, "--format", "json"], {
    allowFail: true,
  });
  let url = null;
  if (v.status === 0 && v.stdout.trim()) {
    try {
      url = JSON.parse(v.stdout).url;
    } catch {
      /* ignore */
    }
  }
  seedMasterProgramDraftItems(owner, projectNumber, preset);

  console.log("\nOpen the project:");
  if (url) console.log(`  ${url}`);
  console.log(`  gh project view ${projectNumber} --owner ${owner} --web`);
}

main();
