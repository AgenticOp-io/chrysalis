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
 *   CHRYSALIS_GH_PROJECT_TITLE  default: "Chrysalis"
 *   CHRYSALIS_GH_REPO            default: owner/chrysalis from repository.url
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
  const owner = process.env.CHRYSALIS_GH_PROJECT_OWNER ?? (m ? m[1] : "theorem6");
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
  const title = process.env.CHRYSALIS_GH_PROJECT_TITLE ?? "Chrysalis";
  const { owner, repoFull } = repoMeta();

  const probe = gh(["project", "list", "--owner", owner, "-L", "1"], { allowFail: true });
  if (probe.status !== 0) {
    process.stderr.write(probe.stderr || probe.stdout);
    if (/read:project|missing required scopes/i.test(probe.stderr)) {
      process.stderr.write(
        "\nGitHub CLI needs project scopes. Run:\n  gh auth refresh -s project,read:project\n",
      );
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
    ensureField(owner, projectNumber, "Lane", "SINGLE_SELECT", [
      "Lane A - Parser contract",
      "Lane B - Oracle depth",
      "Lane C - Verify UX",
      "Lane D - Hole economics",
      "Release / infra",
    ]);
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
  console.log("\nOpen the project:");
  if (url) console.log(`  ${url}`);
  console.log(`  gh project view ${projectNumber} --owner ${owner} --web`);
}

main();
