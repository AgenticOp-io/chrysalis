#!/usr/bin/env node
/**
 * CWL HTML template hyphen / mid-token guard (D6274 / D6369).
 * Load field names must not match inside hyphenated CSS/attr tokens, and
 * walking back must not duplicate a prior literal prefix.
 */
import { splitCwlHtmlTemplate } from "./cwl-html-template.mjs";

export const CWL_HTML_TEMPLATE_HYPHEN_SMOKE_KIND = "chrysalis.cwl-html-template-hyphen-smoke";
export const CWL_HTML_TEMPLATE_HYPHEN_SMOKE_SCHEMA_VERSION = 2;

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

  // D6369 / G9480 — `source` inside `legacy:markup-no-source-route` must stay literal.
  const holeHtml =
    '<div data-cwl-hole="legacy:markup-no-source-route" data-cwl-route="/modules/hardware/add"></div>';
  const holeSplit = splitCwlHtmlTemplate(holeHtml, {
    load: ["source", "path", "apiPath", "tracedApiStatus"],
  });
  const holeJoined =
    holeSplit === null
      ? holeHtml
      : holeSplit.map((p) => (p.kind === "literal" ? p.text : `{{${p.name}}}`)).join("");
  const holeOk =
    (holeSplit === null || holeSplit.every((p) => p.kind === "literal")) &&
    holeJoined.includes("legacy:markup-no-source-route") &&
    !holeJoined.includes("markup-no-markup-no-source") &&
    !holeJoined.includes("{{source}}");

  const ok = exprCount === 0 && classPreserved === true && bareOk === true && holeOk === true;
  return {
    kind: CWL_HTML_TEMPLATE_HYPHEN_SMOKE_KIND,
    schemaVersion: CWL_HTML_TEMPLATE_HYPHEN_SMOKE_SCHEMA_VERSION,
    ok,
    exprCount,
    classPreserved,
    bareOk,
    holeOk,
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const r = runCwlHtmlTemplateHyphenGuardGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-html-template-hyphen-smoke")) main();
