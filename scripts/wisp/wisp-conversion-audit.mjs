import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveWispModuleRoot } from "../lib/wisp-origin-paths.mjs";

export const WISP_CONVERSION_AUDIT_KIND = "chrysalis.wisp-conversion-audit";
export const WISP_CONVERSION_AUDIT_SCHEMA_VERSION = 1;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultFixture = join(repoRoot, "fixtures/hub-wisp-management");
const invalidActionNames = new Set([
  "if",
  "setTimeout",
  "preventDefault",
  "stopPropagation",
  "goto",
]);

function walk(root, predicate, out = []) {
  if (!existsSync(root)) return out;
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, predicate, out);
    else if (predicate(path)) out.push(path);
  }
  return out;
}

function count(source, pattern) {
  return (source.match(pattern) ?? []).length;
}

function attrs(tag) {
  const out = {};
  for (const match of tag.matchAll(/\b([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    out[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return out;
}

function buttonWired(tag, body) {
  const a = attrs(tag);
  if (/\bclass\s*=\s*["'][^"']*\bwizard-step\b/i.test(tag)) return true;
  if ((a.type || "").toLowerCase() === "submit" || (a.type || "").toLowerCase() === "reset")
    return true;
  if (
    a["data-cwl-nav"] != null ||
    a["data-cwl-action"] != null ||
    a["data-cwl-set"] != null ||
    a["data-cwl-toggle"] != null ||
    a["data-cwl-shell-open"] != null ||
    a["data-cwl-on-click"] != null ||
    Object.keys(a).some((name) => /^data-cwl-on-[a-z]+$/.test(name)) ||
    a["data-action"] != null
  )
    return true;
  const className = a.class || "";
  const delegatedClasses = new Set([
    "wizard-trigger",
    "wizard-item",
    "wizard-step",
    "dropdown-toggle",
    "close-btn",
    "close-button",
    "modal-close",
    "nav-btn",
    "back-button",
    "btn-back",
    "module-back-btn",
    "action-btn",
    "control-btn",
    "module-control-btn",
    "tab-btn",
    "toggle-btn",
    "btn-icon",
    "btn-primary",
    "btn-small",
  ]);
  if (
    className
      .split(/\s+/)
      .filter(Boolean)
      .some((name) => name.startsWith("cwl-") || delegatedClasses.has(name))
  )
    return true;
  if (
    /(?:^|\s)(?:cwl-|wizard-trigger|wizard-item|wizard-step|dropdown-toggle|close-btn|close-button|modal-close|nav-btn|back-button|btn-back|module-back-btn|action-btn|control-btn|module-control-btn|tab-btn|toggle-btn|btn-icon|btn-primary|btn-small|wisp-wizard-(?:close|cancel))(?:\s|$)/.test(
      className,
    )
  )
    return true;
  const label = String(body).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return (
    /^(?:×|✕|close|cancel|previous|next|←|→)$/i.test(label) ||
    /view|detail|voice|sip|edit|settings|deploy|add|create|new|approved|filter|toggle|layer|advanced|statistics|map type|device management|👁|✏|🚀|➕|📷/i.test(
      `${label} ${a.title || ""} ${a["aria-label"] || ""}`,
    )
  );
}

function routeFromPageFile(root, file) {
  const rel = relative(root, dirname(file)).replace(/\\/g, "/");
  if (!rel || rel === ".") return "/";
  return `/${rel}`
    .replace(/\/\[\.\.\.([^\]]+)\]/g, "/:$1*")
    .replace(/\/\[([^\]]+)\]/g, "/:$1")
    .replace(/\/\([^/]+\)/g, "");
}

function normalizeRoute(path) {
  return String(path)
    .replace(/\/+$/, "")
    .replace(/:[A-Za-z_][\w-]*/g, ":param") || "/";
}

function scriptClassification(path) {
  const name = path.replace(/\\/g, "/");
  if (/wisp-cwl-one-pass\.mjs$/.test(name)) return "canonical";
  if (/scripts\/lib\/(?:cwl-|convert-origin|source-corpus|wisp-conversion-audit)/.test(name))
    return "library";
  if (/smoke|verify|audit|report/.test(name)) return "verification";
  if (/deploy|gateway|serve/.test(name)) return "deployment";
  if (/apply-|phase\d|deepen|batch\d|restart|fill-holes/.test(name)) return "legacy-mutator";
  if (/build|generate|extract|sync/.test(name)) return "generator";
  return "support";
}

export function auditWispConversion(opts = {}) {
  const fixtureDir = resolve(opts.fixtureDir ?? defaultFixture);
  const staticRoot = resolve(opts.staticRoot ?? join(fixtureDir, "cwl-static-export"));
  const routesPath = resolve(opts.routesPath ?? join(fixtureDir, "routes.cwl"));
  const clientPath = resolve(opts.clientPath ?? join(fixtureDir, "wisp-cwl-client.js"));
  const wispRoot = resolve(
    opts.wispRoot ??
      resolveWispModuleRoot(process.env.CHRYSALIS_WISP_ROOT ?? process.env.WISP_MODULE_DIR),
  );
  const routesSource = existsSync(routesPath) ? readFileSync(routesPath, "utf8") : "";
  const clientSource = existsSync(clientPath) ? readFileSync(clientPath, "utf8") : "";
  const htmlFiles = walk(staticRoot, (path) => path.endsWith(".html"));

  const pages = [];
  const actionCounts = {};
  const invalidActions = [];
  const inertControls = [];
  const emptyShells = [];
  const runtimeHydratedShells = [];
  let controls = 0;
  let wiredControls = 0;
  let forms = 0;
  let shells = 0;
  let holes = 0;
  let residue = 0;

  for (const file of htmlFiles) {
    const source = readFileSync(file, "utf8");
    const path = `/${relative(staticRoot, dirname(file)).replace(/\\/g, "/")}`.replace(
      /\/\.$/,
      "/",
    );
    holes += count(source, /\bdata-cwl-hole=/g);
    residue +=
      count(source, /\son:[A-Za-z][\w:|.-]*=/g) +
      count(source, /\{[#/:](?:if|each)\b/g) +
      count(source, /\bgoto\s*\(/g);
    forms += count(source, /<form\b/gi);

    for (const match of source.matchAll(/\bdata-cwl-action="([^"]+)"/g)) {
      const action = match[1];
      actionCounts[action] = (actionCounts[action] ?? 0) + 1;
      if (invalidActionNames.has(action)) invalidActions.push({ path, action });
    }
    for (const match of source.matchAll(/\bdata-cwl-on-[a-z]+="action:([^"]+)"/g)) {
      const action = match[1];
      actionCounts[action] = (actionCounts[action] ?? 0) + 1;
      if (invalidActionNames.has(action)) invalidActions.push({ path, action });
    }

    for (const match of source.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)) {
      controls++;
      if (buttonWired(match[0], match[1])) wiredControls++;
      else {
        inertControls.push({
          path,
          label: match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 80),
          tag: match[0].slice(0, 240),
        });
      }
    }

    for (const match of source.matchAll(
      /\bdata-cwl-(?:modal|wizard|nav)-shell="([^"]+)"/gi,
    )) {
      shells++;
      const window = source.slice(match.index ?? 0, (match.index ?? 0) + 12_000);
      if (!/<(?:button|form|input|select|textarea|a|nav)\b/i.test(window)) {
        const shell = { path, shell: match[1] };
        if (
          /\bensureOverlayChrome\s*\(/.test(clientSource) &&
          /data-cwl-(?:modal|wizard|nav)-shell/.test(clientSource)
        )
          runtimeHydratedShells.push(shell);
        else emptyShells.push(shell);
      }
    }
    pages.push({ path, bytes: Buffer.byteLength(source) });
  }

  const sourceRouteRoot = join(wispRoot, "src/routes");
  const sourcePageFiles = walk(sourceRouteRoot, (path) => /[\\/]\+page\.svelte$/.test(path));
  const sourceRoutes = sourcePageFiles.map((file) => routeFromPageFile(sourceRouteRoot, file));
  const outputRoutes = [
    ...routesSource.matchAll(/@page\s+GET\s+"([^"]+)"/g),
  ].map((match) => match[1]);
  const outputNormalized = new Set(outputRoutes.map(normalizeRoute));
  const missingRoutes = sourceRoutes.filter((path) => !outputNormalized.has(normalizeRoute(path)));

  const sourceFiles = walk(join(wispRoot, "src"), (path) => path.endsWith(".svelte"));
  const sourceCensus = {
    svelteFiles: sourceFiles.length,
    pageFiles: sourcePageFiles.length,
    buttons: 0,
    eventDirectives: 0,
    functions: 0,
    apiCalls: 0,
    modalReferences: 0,
  };
  for (const file of sourceFiles) {
    const source = readFileSync(file, "utf8");
    sourceCensus.buttons += count(source, /<button\b/gi);
    sourceCensus.eventDirectives += count(source, /\son:[A-Za-z][\w:|.-]*=/g);
    sourceCensus.functions += count(
      source,
      /\b(?:function\s+[A-Za-z_$][\w$]*|const\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?\()/g,
    );
    sourceCensus.apiCalls += count(source, /\b(?:fetch|apiRequest)\s*\(/g);
    sourceCensus.modalReferences += count(source, /<(?:[A-Z]\w*(?:Modal|Wizard|Menu))\b/g);
  }

  const scriptFiles = walk(join(repoRoot, "scripts"), (path) => /wisp/i.test(path) && /\.mjs$/.test(path));
  const scriptInventory = {};
  for (const file of scriptFiles) {
    const kind = scriptClassification(file);
    (scriptInventory[kind] ??= []).push(relative(repoRoot, file).replace(/\\/g, "/"));
  }

  const hardFailures = {
    holes,
    residue,
    invalidActions: invalidActions.length,
    emptyShells: emptyShells.length,
    missingRoutes: missingRoutes.length,
  };
  const report = {
    kind: WISP_CONVERSION_AUDIT_KIND,
    schemaVersion: WISP_CONVERSION_AUDIT_SCHEMA_VERSION,
    ok: Object.values(hardFailures).every((value) => value === 0),
    generatedAt: new Date().toISOString(),
    paths: { wispRoot, routesPath, staticRoot, clientPath },
    source: sourceCensus,
    output: {
      pages: pages.length,
      routes: outputRoutes.length,
      controls,
      wiredControls,
      inertControls: inertControls.length,
      controlCoverage: controls ? Number((wiredControls / controls).toFixed(4)) : 1,
      forms,
      shells,
      holes,
      residue,
      clientBytes: Buffer.byteLength(clientSource),
    },
    hardFailures,
    missingRoutes,
    invalidActions,
    emptyShells,
    runtimeHydratedShells,
    inertControls,
    actionCounts,
    scriptInventory: Object.fromEntries(
      Object.entries(scriptInventory).map(([key, files]) => [key, files.sort()]),
    ),
  };

  const reportPath = resolve(opts.reportPath ?? join(repoRoot, "reports/wisp/wisp-conversion-audit.json"));
  const markdownPath = resolve(
    opts.markdownPath ?? join(repoRoot, "reports/wisp/wisp-conversion-audit.md"),
  );
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(markdownPath, renderAuditMarkdown(report), "utf8");
  return { ...report, reportPath, markdownPath };
}

function renderAuditMarkdown(report) {
  const lines = [
    "# WISP conversion audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Result",
    "",
    `- Status: ${report.ok ? "PASS" : "FAIL"}`,
    `- Source Svelte files: ${report.source.svelteFiles}`,
    `- Source page routes: ${report.source.pageFiles}`,
    `- Exported pages: ${report.output.pages}`,
    `- Controls: ${report.output.wiredControls}/${report.output.controls} classified as wired (${(
      report.output.controlCoverage * 100
    ).toFixed(2)}%)`,
    `- Potential inert controls: ${report.output.inertControls}`,
    `- Invalid converted actions: ${report.hardFailures.invalidActions}`,
    `- Empty shells: ${report.hardFailures.emptyShells}`,
    `- Missing source routes: ${report.hardFailures.missingRoutes}`,
    `- Holes/residue: ${report.output.holes}/${report.output.residue}`,
    "",
    "## Invalid converted actions",
    "",
    ...(report.invalidActions.length
      ? report.invalidActions.map((row) => `- \`${row.path}\`: \`${row.action}\``)
      : ["- None"]),
    "",
    "## Missing routes",
    "",
    ...(report.missingRoutes.length ? report.missingRoutes.map((path) => `- \`${path}\``) : ["- None"]),
    "",
    "## Potential inert controls",
    "",
    ...(report.inertControls.length
      ? report.inertControls
          .slice(0, 200)
          .map((row) => `- \`${row.path}\`: ${row.label || "(unlabelled button)"}`)
      : ["- None"]),
    "",
    "## Script inventory summary",
    "",
    ...Object.entries(report.scriptInventory).map(
      ([kind, files]) => `- ${kind}: ${files.length}`,
    ),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = auditWispConversion();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}
