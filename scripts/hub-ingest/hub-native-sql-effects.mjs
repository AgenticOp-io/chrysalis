/**
 * Shared SQL/DB effect lowering for hub native ingest.
 */
import { HUB_T, hubOrigin } from "./hub-lift-webir-route.mjs";
import { lowerHubReturnTree } from "./hub-native-return-tree.mjs";

/** @param {string} sql */
export function guessTablesFromSql(sql) {
  const out = new Set();
  const re = /\b(?:from|join|into|update)\s+([a-z_][a-z0-9_]*)/gi;
  let match;
  while ((match = re.exec(sql)) !== null) {
    if (match[1]) out.add(match[1].toLowerCase());
  }
  return [...out];
}

/**
 * @param {object} ctx — { data, effect, webir }
 * @param {{ sql: string, params?: object[] }} sqlEffect
 * @param {{ file: string, line?: number }} loc
 */
export function lowerHubDbQuery(ctx, sqlEffect, loc) {
  const { effect, webir } = ctx;
  const origin = hubOrigin(loc.file, loc.line ?? 1);
  const params = (sqlEffect.params ?? [])
    .map((p) => lowerHubReturnTree(ctx, /** @type {import('./hub-native-return-tree.mjs').HubReturnTree} */ (p), loc))
    .filter((p) => p !== null);
  const isRead = /^\s*select\b/i.test(sqlEffect.sql);
  const tables = guessTablesFromSql(sqlEffect.sql);
  return effect.dbQuery({
    kind: isRead ? "read" : "write",
    sql: sqlEffect.sql,
    params,
    returns: "rows",
    tables: tables.length ? tables : ["*"],
    type: HUB_T.unknown,
    origin,
    provenance: [webir.provenance("hub-ingest", "hub-native:db-query")],
  });
}
