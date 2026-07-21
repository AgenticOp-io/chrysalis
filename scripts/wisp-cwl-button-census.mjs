#!/usr/bin/env node
/**
 * Exhaustive button inventory for the converted WISP module surfaces.
 *
 * This complements cwl-surface-census.mjs: that gate audits action names,
 * while this report records every literal <button>, including controls wired
 * by navigation, state toggles, shell openers, form submission, or delegated
 * client inference.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stripBalancedDivs } from "./lib/cwl-surface-census.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_EXPORT = join(REPO, "fixtures", "hub-wisp-management", "cwl-static-export");
const DEFAULT_OUT = join(REPO, "reports", "wisp", "wisp-button-census.json");

const EXPLICIT_WIRING = [
  "data-cwl-nav",
  "data-cwl-action",
  "data-cwl-set",
  "data-cwl-toggle",
  "data-cwl-shell-open",
  "data-cwl-on-click",
  // Island-delegated wiring: wisp-cwl-modules.js listens for these on plan panels.
  "data-plan-action",
  "data-action",
  // Map selection panel actions (showAssetDetail) — delegated click handler.
  "data-map-asset-action",
];

const DELEGATED_CLASSES =
  /\b(tab-btn|wizard-step|wizard-item|module-back-btn|wisp-back-btn|back-button|back-btn|btn-back|close-btn|close-button|modal-close|alert-close|dropdown-toggle)\b/i;
const INFERRED_TEXT =
  /view|detail|edit|settings|deploy|add|create|new|approved?|reject|authorize|filter|search|camera|scan|qr|voice|sip|toggle|layer|advanced|statistics|map type|device management|close|cancel|previous|next|back|refresh|reload|save|submit|apply|delete|remove|transfer|print|export|download|geocode|update|photos?|pay|mark read|got it|done|deactivate|resolve|assign|start|complete|use|select|requirements|analy[sz]e|purchase order|patch feature|launch wizard|wizards|fit to screen/i;

function walkHtml(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(path, out);
    else if (entry.name.endsWith(".html")) out.push(path);
  }
  return out;
}

function attrsFromTag(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    const name = match[1].toLowerCase();
    if (name === "button") continue;
    attrs[name] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

function cleanText(html) {
  return String(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#x?[0-9a-f]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function moduleForPage(page) {
  const parts = page.split("/").filter(Boolean);
  const moduleIndex = parts.indexOf("modules");
  return moduleIndex >= 0 ? parts[moduleIndex + 1] || "modules-index" : parts[0] || "root";
}

function routeExists(nav, routePages) {
  if (!nav || !nav.startsWith("/")) return null;
  const path = nav.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  if (routePages.has(path)) return true;
  if (/^\/modules\/(?:inventory|hardware|work-orders|customers|sites|help-desk)\/[^/]+(?:\/edit)?$/.test(path)) {
    return true; // Firebase 404 detail router + GCE dynamic route support.
  }
  return false;
}

function classify(attrs, label) {
  if ("disabled" in attrs || attrs["aria-disabled"] === "true") return "disabled";
  const wiring = [
    ...EXPLICIT_WIRING.filter((name) => name in attrs),
    ...Object.keys(attrs).filter((name) => /^data-cwl-on-[a-z]+$/.test(name)),
  ];
  if (wiring.length) return "explicit";
  if ((attrs.type || "").toLowerCase() === "submit") return "submit";
  if (DELEGATED_CLASSES.test(attrs.class || "")) return "delegated";
  const semantic = `${label} ${attrs.title || ""} ${attrs["aria-label"] || ""}`;
  if (INFERRED_TEXT.test(semantic)) return "inferred";
  if (!label && /data-cwl-bind/.test(JSON.stringify(attrs))) return "runtime-label";
  return "unwired";
}

function censusRuntimeButtons(source, file) {
  const definitions = [];
  const createRe = /(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*document\.createElement\(\s*["']button["']\s*\)/g;
  for (const match of source.matchAll(createRe)) {
    const variable = match[1];
    const tail = source.slice(match.index, Math.min(source.length, match.index + 2200));
    const hasListener = new RegExp(
      `${variable}\\.addEventListener\\(\\s*["']click["']|${variable}\\.onclick\\s*=`,
    ).test(tail);
    const hasCwl = new RegExp(
      `${variable}\\.setAttribute\\(\\s*["']data-cwl-`,
    ).test(tail);
    definitions.push({
      file,
      kind: "createElement",
      variable,
      classification: hasCwl ? "declarative" : hasListener ? "runtime-listener" : "unwired",
    });
  }
  for (const match of source.matchAll(/<button\b([^>]*)>/g)) {
    const tag = match[0];
    const attrs = attrsFromTag(tag);
    const tail = source.slice(match.index, Math.min(source.length, match.index + 500));
    const label = cleanText((/^([\s\S]*?)<\/button>/.exec(tail.slice(tag.length)) || [])[1] || "");
    // JS template fragments (`' + String(x) + '`) are not literal DOM buttons —
    // do not treat them as unwired runtime definitions.
    if (/['"`]\s*\+|String\s*\(|\$\{/.test(`${tag}${label}`)) {
      definitions.push({
        file,
        kind: "html-template",
        label: label.slice(0, 80) || "(runtime expression)",
        classification: "runtime-expression",
      });
      continue;
    }
    const explicit = EXPLICIT_WIRING.some((name) => name in attrs);
    const submit = (attrs.type || "").toLowerCase() === "submit";
    const delegated =
      DELEGATED_CLASSES.test(attrs.class || "") ||
      INFERRED_TEXT.test(`${label} ${attrs.title || ""} ${attrs["aria-label"] || ""}`);
    definitions.push({
      file,
      kind: "html-template",
      label: label.slice(0, 80) || "(runtime expression)",
      classification: explicit
        ? "declarative"
        : submit
          ? "submit"
          : delegated
            ? "delegated"
            : "unwired",
    });
  }
  return definitions;
}

export function runWispButtonCensus(options = {}) {
  const exportDir = resolve(options.exportDir || DEFAULT_EXPORT);
  const outPath = resolve(options.outPath || DEFAULT_OUT);
  const allFiles = walkHtml(exportDir);
  const files = allFiles.filter((file) =>
    relative(exportDir, file).replace(/\\/g, "/").startsWith("modules/"),
  );
  const routePages = new Set(
    allFiles.map((file) => {
      const rel = relative(exportDir, file).replace(/\\/g, "/");
      return (`/${rel}`).replace(/\/index\.html$/, "").replace(/\/$/, "") || "/";
    }),
  );

  const buttons = [];
  for (const file of files) {
    // Each-placeholder rows are inert by design; hydration re-renders them
    // from the wired row template, so skip their buttons.
    const html = stripBalancedDivs(
      readFileSync(file, "utf8"),
      /<div[^>]*data-cwl-bind="each"[^>]*>/g,
    );
    const rel = relative(exportDir, file).replace(/\\/g, "/");
    const page = (`/${rel}`).replace(/\/index\.html$/, "").replace(/\/$/, "") || "/";
    let index = 0;
    for (const match of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi))  {
      index += 1;
      const tag = `<button${match[1]}>`;
      const attrs = attrsFromTag(tag);
      const label = cleanText(match[2]);
      const wiring = [
        ...EXPLICIT_WIRING.filter((name) => name in attrs),
        ...Object.keys(attrs).filter((name) => /^data-cwl-on-[a-z]+$/.test(name)),
      ].map((name) => ({ type: name, value: attrs[name] }));
      const nav = attrs["data-cwl-nav"] || "";
      const classification = classify(attrs, label);
      const issues = [];
      if (classification === "unwired") issues.push("no-recognized-wiring");
      if (
        !label &&
        !attrs["aria-label"] &&
        !attrs.title &&
        !attrs["data-cwl-attr-aria-label"] &&
        !attrs["data-cwl-attr-title"] &&
        !/data-cwl-bind/.test(match[2]) &&
        classification !== "runtime-label"
      )
        issues.push("no-accessible-label");
      const primaryWiringCount = EXPLICIT_WIRING.filter(
        (name) => name in attrs && name !== "data-cwl-on-click",
      ).length;
      if (primaryWiringCount > 1) issues.push("multiple-explicit-wirings");
      for (const attrName of [
        "data-cwl-nav",
        "data-cwl-action",
        "data-cwl-set",
        "data-cwl-toggle",
      ]) {
        const count = [...tag.matchAll(new RegExp(`\\s${attrName}=`, "gi"))].length;
        if (count > 1) issues.push(`duplicate-${attrName}`);
      }
      if (/\bgoto\s*\(|\{[^}]+\}|\$[0-9a-f]{8,}/i.test(`${tag} ${label}`)) issues.push("unresolved-source-expression");
      if (nav && routeExists(nav, routePages) === false) issues.push("missing-static-route");
      if ((attrs.type || "").toLowerCase() === "submit" && !/\bform\b/i.test(match[0])) {
        // Informational only: delegated submit handling may still own it.
      }

      buttons.push({
        id: `${page}#${index}`,
        module: moduleForPage(page),
        page,
        index,
        label: label || attrs["aria-label"] || attrs.title || "(unlabeled)",
        title: attrs.title || "",
        classes: attrs.class || "",
        type: attrs.type || "button-default",
        classification,
        wiring,
        navTargetExists: nav ? routeExists(nav, routePages) : null,
        issues,
      });
    }
  }

  const moduleMap = new Map();
  for (const button of buttons) {
    const row = moduleMap.get(button.module) || {
      module: button.module,
      pages: new Set(),
      total: 0,
      explicit: 0,
      submit: 0,
      delegated: 0,
      inferred: 0,
      runtimeLabel: 0,
      disabled: 0,
      unwired: 0,
      withIssues: 0,
    };
    row.pages.add(button.page);
    row.total += 1;
    if (button.classification === "runtime-label") row.runtimeLabel += 1;
    else row[button.classification] += 1;
    if (button.issues.length) row.withIssues += 1;
    moduleMap.set(button.module, row);
  }

  const modules = [...moduleMap.values()]
    .map((row) => ({ ...row, pages: [...row.pages].sort(), pageCount: row.pages.size }))
    .map(({ pages, ...row }) => ({ ...row, pages }))
    .sort((a, b) => b.total - a.total || a.module.localeCompare(b.module));
  const issues = buttons.filter((button) => button.issues.length);
  const blockingIssues = issues.filter((button) =>
    button.issues.some((issue) =>
      [
        "no-recognized-wiring",
        "no-accessible-label",
        "multiple-explicit-wirings",
        "duplicate-data-cwl-nav",
        "duplicate-data-cwl-action",
        "duplicate-data-cwl-set",
        "duplicate-data-cwl-toggle",
        "unresolved-source-expression",
        "missing-static-route",
      ].includes(issue),
    ),
  );
  const classifications = Object.fromEntries(
    ["explicit", "submit", "delegated", "inferred", "runtime-label", "disabled", "unwired"].map(
      (name) => [name, buttons.filter((button) => button.classification === name).length],
    ),
  );
  const runtimeFiles = ["wisp-cwl-client.js", "wisp-cwl-modules.js", "wisp-cwl-map.js"];
  const runtimeDefinitions = runtimeFiles.map((name) => {
    const source = readFileSync(join(dirname(exportDir), name), "utf8");
    const createElement = (
      source.match(/createElement\(\s*["']button["']\s*\)/g) || []
    ).length;
    const htmlTemplates = (source.match(/<button\b/g) || []).length;
    const buttons = censusRuntimeButtons(source, name);
    return {
      file: name,
      createElement,
      htmlTemplates,
      total: createElement + htmlTemplates,
      unwired: buttons.filter((button) => button.classification === "unwired").length,
      buttons,
    };
  });
  const runtimeUnwired = runtimeDefinitions.flatMap((row) =>
    row.buttons.filter((button) => button.classification === "unwired"),
  );

  const report = {
    kind: "chrysalis.wisp.button-census",
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    exportDir,
    summary: {
      moduleCount: modules.length,
      pageCount: files.length,
      buttonCount: buttons.length,
      runtimeButtonDefinitionCount: runtimeDefinitions.reduce((sum, row) => sum + row.total, 0),
      runtimeUnwiredDefinitionCount: runtimeUnwired.length,
      issueCount: issues.length,
      blockingIssueCount: blockingIssues.length,
      classifications,
    },
    runtimeDefinitions,
    ok: blockingIssues.length === 0 && runtimeUnwired.length === 0,
    modules,
    issues,
    blockingIssues,
    runtimeUnwired,
    buttons,
  };
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = runWispButtonCensus();
  console.log(JSON.stringify({ ...report.summary, outPath: DEFAULT_OUT }, null, 2));
}
