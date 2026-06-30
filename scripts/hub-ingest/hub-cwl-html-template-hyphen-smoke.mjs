#!/usr/bin/env node
/** CWL HTML template hyphen guard — load field `module` must not match inside `module-header` (D6274). */
import { splitCwlHtmlTemplate } from "./cwl-html-template.mjs";

export const CWL_HTML_TEMPLATE_HYPHEN_SMOKE_KIND = "chrysalis.cwl-html-template-hyphen-smoke";

export function runCwlHtmlTemplateHyphenGuardGate() {
  const html = '<div class="module-header"><span class="module-name">Plan</span></div>';
  const split = splitCwlHtmlTemplate(html, { load: ["module"] });
  const exprCount = split?.filter((p) => p.kind === "expr").length ?? 0;
  const classPreserved =
    split === null
      ? html.includes("module-header") && html.includes("module-name")
      : split.some((p) => p.kind === "literal" && p.text.includes("module-header"));
  const bareSplit = splitCwlHtmlTemplate("Hello module world", { load: ["module"] });
  const bareOk = bareSplit?.some((p) => p.kind === "expr" && p.name === "module") === true;
  const ok = exprCount === 0 && classPreserved === true && bareOk === true;
  return {
    kind: CWL_HTML_TEMPLATE_HYPHEN_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    exprCount,
    classPreserved,
    bareOk,
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const r = runCwlHtmlTemplateHyphenGuardGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-html-template-hyphen-smoke")) main();
