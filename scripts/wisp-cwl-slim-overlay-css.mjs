/**
 * Rebuild additive CWL shell CSS. Original Module_Manager look lives in
 * fixtures/hub-wisp-management/original-css/* — do not redefine dashboard/login.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appPath = join(root, "fixtures/hub-wisp-management/wisp-cwl-app.css");
const loginPath = join(root, "fixtures/hub-wisp-management/wisp-cwl-login.css");
const existing = readFileSync(appPath, "utf8");

/** Keep rule blocks that start with these selectors / comments. */
const KEEP_PREFIXES = [
  ".wisp-secondary",
  ".wisp-module-demo",
  ".wisp-demo-",
  ".wisp-docs-",
  ".wisp-module-nav",
  ".wisp-module-page",
  ".wisp-wizard",
  ".cwl-hydrated",
  ".cwl-map-",
  ".cwl-row-selected",
  "select[data-cwl-filter-shell]",
  ".wisp-status",
  ".map-honesty",
  ".map-loading",
  ".map-view-host",
  ".map-fullscreen",
  ".plan-side-panel",
  ".plan-panel-",
  ".plan-projects-",
  ".plan-layers-",
  ".plan-hardware-",
  ".plan-summary",
  ".wisp-header-overlay",
  ".wisp-header-",
  ".wisp-control-btn",
  ".wisp-back-btn",
  ".wisp-plan-app",
  ".wisp-deploy-app",
  ".plan-map-iframe",
  ".wisp-coverage-map",
  "#arcgis-map-view",
  "#cwl-map-",
  ".floating-controls",
];

function keepBlock(block) {
  const head = block.trimStart().slice(0, 120);
  if (head.startsWith("/*") && /secondary|demo|docs|hydrate|map|wizard|cwl/i.test(head)) return true;
  return KEEP_PREFIXES.some((p) => head.includes(p) || head.startsWith(p));
}

function splitCssBlocks(css) {
  const blocks = [];
  let i = 0;
  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i])) i++;
    if (i >= css.length) break;
    if (css.startsWith("/*", i)) {
      const end = css.indexOf("*/", i);
      const next = end >= 0 ? end + 2 : css.length;
      // attach following rule if comment precedes it
      let j = next;
      while (j < css.length && /\s/.test(css[j])) j++;
      if (css[j] === "@" || /[.#a-zA-Z\[]/.test(css[j] || "")) {
        // find end of next rule
        let depth = 0;
        let k = j;
        let started = false;
        for (; k < css.length; k++) {
          if (css[k] === "{") {
            depth++;
            started = true;
          } else if (css[k] === "}") {
            depth--;
            if (started && depth === 0) {
              k++;
              break;
            }
          }
        }
        blocks.push(css.slice(i, k));
        i = k;
        continue;
      }
      blocks.push(css.slice(i, next));
      i = next;
      continue;
    }
    if (css.startsWith("@media", i) || css.startsWith("@keyframes", i) || css.startsWith("@supports", i)) {
      let depth = 0;
      let k = i;
      let started = false;
      for (; k < css.length; k++) {
        if (css[k] === "{") {
          depth++;
          started = true;
        } else if (css[k] === "}") {
          depth--;
          if (started && depth === 0) {
            k++;
            break;
          }
        }
      }
      blocks.push(css.slice(i, k));
      i = k;
      continue;
    }
    let depth = 0;
    let k = i;
    let started = false;
    for (; k < css.length; k++) {
      if (css[k] === "{") {
        depth++;
        started = true;
      } else if (css[k] === "}") {
        depth--;
        if (started && depth === 0) {
          k++;
          break;
        }
      }
    }
    blocks.push(css.slice(i, k));
    i = k;
  }
  return blocks;
}

const kept = splitCssBlocks(existing).filter(keepBlock);
const header = `/* CWL additive chrome only — original look is original-css/*.css (Module_Manager). */
`;
const out = header + kept.join("\n\n") + "\n";
writeFileSync(appPath, out, "utf8");

writeFileSync(
  loginPath,
  `/* CWL login additives only — Module_Manager look is original-css/login.css + _layout.css. */
.demo-credentials-panel {
  margin: 0 0 1rem;
  padding: 0.75rem 0.9rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(0, 217, 255, 0.25);
  background: rgba(15, 30, 45, 0.55);
  font-size: 0.9rem;
}
.demo-credentials-title { margin: 0 0 0.35rem; font-weight: 600; }
.demo-credentials-hint { margin: 0.5rem 0 0; opacity: 0.85; font-size: 0.82rem; }
.wisp-status { margin: 0.5rem 0; min-height: 1.2em; }
.wisp-status.error { color: #f87171; }
`,
  "utf8",
);

console.log(JSON.stringify({ appBytes: out.length, keptBlocks: kept.length }, null, 2));
