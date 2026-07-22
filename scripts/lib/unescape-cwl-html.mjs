/**
 * Unescape a CWL `return html "…"` string body.
 * Prefer JSON.parse — manual `\\n`/`\\"` only leaves `\\r` as visible text (Wizards chrome).
 * @param {string} quotedOrBody JSON string literal including quotes, or body without quotes
 */
export function unescapeCwlHtmlLiteral(quotedOrBody) {
  const s = String(quotedOrBody ?? "");
  if (s.startsWith('"')) {
    try {
      return JSON.parse(s);
    } catch {
      /* fall through */
    }
  }
  try {
    return JSON.parse(`"${s}"`);
  } catch {
    return s
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
}
