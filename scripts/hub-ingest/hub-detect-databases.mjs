/**
 * Infer web database catalog ids from origin scan `services` hints.
 */
import { webDatabaseById } from "./hub-web-databases.mjs";

/** @type {Array<{ id: string, patterns: RegExp[] }>} */
const SERVICE_HINT_RULES = [
  { id: "postgresql", patterns: [/postgres/i, /pgsql/i] },
  { id: "mysql", patterns: [/\bmysql\b/i, /mysqli/i] },
  { id: "mariadb", patterns: [/mariadb/i] },
  { id: "sqlite", patterns: [/sqlite/i] },
  { id: "sqlserver", patterns: [/sqlserver/i, /mssql/i, /sqlsrv/i] },
  { id: "mongodb", patterns: [/mongodb/i, /mongo\+srv/i, /\bmongo:/i] },
  { id: "redis", patterns: [/\bredis/i] },
  { id: "memcached", patterns: [/memcached/i, /memcache/i] },
  { id: "dynamodb", patterns: [/dynamodb/i] },
  { id: "cassandra", patterns: [/cassandra/i] },
  { id: "couchbase", patterns: [/couchbase/i] },
  { id: "elasticsearch", patterns: [/elasticsearch/i, /\bes:\/\//i] },
  { id: "firestore", patterns: [/firestore/i] },
  { id: "planetscale", patterns: [/planetscale/i] },
  { id: "cockroachdb", patterns: [/cockroach/i, /crdb/i] },
  { id: "neon", patterns: [/neon\.tech/i, /\bneon\b/i] },
  { id: "turso", patterns: [/turso/i, /libsql/i] },
  { id: "supabase", patterns: [/supabase/i] },
  { id: "clickhouse", patterns: [/clickhouse/i] },
  { id: "snowflake", patterns: [/snowflake/i] },
  { id: "influxdb", patterns: [/influx/i] },
  { id: "fauna", patterns: [/fauna/i] },
  { id: "singlestore", patterns: [/singlestore/i, /memsql/i] },
];

/**
 * @param {unknown} value
 */
function hintText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "hint" in value) return String(/** @type {{ hint?: string }} */ (value).hint ?? "");
  return JSON.stringify(value);
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function detectDatabaseIdsFromText(text) {
  const t = text.trim();
  if (!t) return [];
  /** @type {string[]} */
  const ids = [];
  for (const rule of SERVICE_HINT_RULES) {
    if (rule.patterns.some((re) => re.test(t)) && webDatabaseById(rule.id)) {
      if (!ids.includes(rule.id)) ids.push(rule.id);
    }
  }
  return ids;
}

/**
 * @param {Record<string, unknown>} [services]
 * @returns {string[]}
 */
export function detectDatabasesFromOriginServices(services = {}) {
  /** @type {string[]} */
  const ids = [];
  for (const value of Object.values(services)) {
    for (const id of detectDatabaseIdsFromText(hintText(value))) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

/**
 * @param {Record<string, unknown>} [services]
 */
export function buildDatabaseDetectionReport(services = {}) {
  const detectedIds = detectDatabasesFromOriginServices(services);
  return {
    kind: "chrysalis.hub.database-detection",
    schemaVersion: 1,
    detectedIds,
    detected: detectedIds.map((id) => webDatabaseById(id)).filter(Boolean),
    services,
    generatedAt: new Date().toISOString(),
  };
}
