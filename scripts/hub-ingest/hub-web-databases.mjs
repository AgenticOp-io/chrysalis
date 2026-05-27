#!/usr/bin/env node
/**
 * Canonical catalog of databases commonly used in web applications.
 * Orthogonal to programming-language origins; linked via path knowledge + migration planner.
 * Usage: node scripts/hub-ingest/hub-web-databases.mjs [--json-out path]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HUB_WEB_DATABASES_KIND = "chrysalis.hub.web-databases";
export const HUB_WEB_DATABASES_SCHEMA_VERSION = 1;

/** @typedef {'relational'|'document'|'key-value'|'search'|'wide-column'|'serverless-sql'|'embedded'} WebDatabaseKind */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   kind: WebDatabaseKind,
 *   sqlDialect: string | null,
 *   typicalDrivers: string[],
 *   typicalOrms: string[],
 *   webUseCases: string[],
 *   pros: Array<{ id: string, text: string }>,
 *   cons: Array<{ id: string, text: string }>,
 *   chrysalisNotes: string,
 *   popularityTier: 'tier1'|'tier2'|'tier3',
 * }} WebDatabaseProfile
 */

/** @type {WebDatabaseProfile[]} */
export const WEB_DATABASE_PROFILES = [
  {
    id: "postgresql",
    label: "PostgreSQL",
    kind: "relational",
    sqlDialect: "postgresql",
    typicalDrivers: ["pdo_pgsql", "pg", "node-pg", "psycopg", "jdbc-postgresql"],
    typicalOrms: ["Eloquent", "Drizzle", "Prisma", "SQLAlchemy", "Hibernate"],
    webUseCases: ["primary OLTP", "JSONB APIs", "Supabase/Neon hosting"],
    pros: [
      { id: "pro-standards", text: "Strong SQL standards, constraints, and extensions." },
      { id: "pro-json", text: "JSONB for semi-structured API payloads." },
    ],
    cons: [
      { id: "con-ops", text: "Self-managed HA/replication adds operational depth." },
    ],
    chrysalisNotes: "Oracle SQL tape + mysqli/pg probes; ingest db effects partial on PHP.",
    popularityTier: "tier1",
  },
  {
    id: "mysql",
    label: "MySQL",
    kind: "relational",
    sqlDialect: "mysql",
    typicalDrivers: ["pdo_mysql", "mysqli", "mysql2", "PyMySQL"],
    typicalOrms: ["Eloquent", "Drizzle", "Prisma", "Sequelize"],
    webUseCases: ["LAMP/LEMP stacks", "WordPress", "shared hosting"],
    pros: [{ id: "pro-hosting", text: "Ubiquitous on commodity hosting and managed clouds." }],
    cons: [{ id: "con-dialect", text: "Dialect edge cases vs PostgreSQL during migration." }],
    chrysalisNotes: "mysqli oracle CI smoke; flagship probes use MySQL 8.",
    popularityTier: "tier1",
  },
  {
    id: "mariadb",
    label: "MariaDB",
    kind: "relational",
    sqlDialect: "mysql",
    typicalDrivers: ["pdo_mysql", "mysqli", "mysql2"],
    typicalOrms: ["Eloquent", "Prisma"],
    webUseCases: ["MySQL-compatible drop-in", "Galera clusters"],
    pros: [{ id: "pro-compat", text: "MySQL protocol compatibility with open-source lineage." }],
    cons: [{ id: "con-drift", text: "Feature drift from Oracle MySQL over time." }],
    chrysalisNotes: "Treat as mysql dialect for WebIR sql effects until proven otherwise.",
    popularityTier: "tier1",
  },
  {
    id: "sqlite",
    label: "SQLite",
    kind: "embedded",
    sqlDialect: "sqlite",
    typicalDrivers: ["pdo_sqlite", "sqlite3", "better-sqlite3"],
    typicalOrms: ["Eloquent", "Drizzle", "SQLAlchemy"],
    webUseCases: ["edge deploys", "tests", "serverless functions", "Turso/libSQL"],
    pros: [{ id: "pro-embed", text: "Zero server process; ideal for dev and embedded." }],
    cons: [{ id: "con-concurrency", text: "Write concurrency limits at scale." }],
    chrysalisNotes: "Emitted session bridge option (DESIGN D176); tiny fixtures.",
    popularityTier: "tier1",
  },
  {
    id: "sqlserver",
    label: "Microsoft SQL Server",
    kind: "relational",
    sqlDialect: "tsql",
    typicalDrivers: ["pdo_sqlsrv", "tedious", "pyodbc", "jdbc"],
    typicalOrms: ["Eloquent", "Entity Framework", "Hibernate"],
    webUseCases: ["ASP.NET enterprise", "Azure SQL"],
    pros: [{ id: "pro-enterprise", text: "Enterprise AD integration and tooling." }],
    cons: [{ id: "con-license", text: "Licensing and cloud cost vs OSS RDBMS." }],
    chrysalisNotes: "Hub scaffold-native; oracle depth primarily PHP/MySQL today.",
    popularityTier: "tier1",
  },
  {
    id: "oracle-db",
    label: "Oracle Database",
    kind: "relational",
    sqlDialect: "oracle",
    typicalDrivers: ["pdo_oci", "oracledb", "jdbc"],
    typicalOrms: ["Hibernate", "Entity Framework"],
    webUseCases: ["enterprise ERP", "legacy Java/.NET"],
    pros: [{ id: "pro-mission", text: "Mature enterprise workloads and tooling." }],
    cons: [{ id: "con-cost", text: "Cost and operational complexity for greenfield web." }],
    chrysalisNotes: "Not in default CI oracle; holes expected without dedicated probes.",
    popularityTier: "tier2",
  },
  {
    id: "mongodb",
    label: "MongoDB",
    kind: "document",
    sqlDialect: null,
    typicalDrivers: ["mongodb", "mongoose", "pymongo", "motor"],
    typicalOrms: ["Mongoose", "Prisma Mongo", "ODM native"],
    webUseCases: ["document APIs", "flexible schemas", "Atlas hosting"],
    pros: [{ id: "pro-schema", text: "Flexible documents map to JSON APIs." }],
    cons: [{ id: "con-sql-tape", text: "Chrysalis SQL oracle tapes do not apply directly." }],
    chrysalisNotes: "Model as non-sql data effect; contract-first OpenAPI often better entry.",
    popularityTier: "tier1",
  },
  {
    id: "redis",
    label: "Redis",
    kind: "key-value",
    sqlDialect: null,
    typicalDrivers: ["phpredis", "ioredis", "redis-py"],
    typicalOrms: [],
    webUseCases: ["cache", "sessions", "queues", "rate limits"],
    pros: [{ id: "pro-speed", text: "In-memory speed for session/cache patterns." }],
    cons: [{ id: "con-durability", text: "Not a system of record without persistence tuning." }],
    chrysalisNotes: "Session bridge + redis oracle session tests (DESIGN D178).",
    popularityTier: "tier1",
  },
  {
    id: "dynamodb",
    label: "Amazon DynamoDB",
    kind: "document",
    sqlDialect: null,
    typicalDrivers: ["aws-sdk", "boto3"],
    typicalOrms: ["ElectroDB", "DynamoDB Toolbox"],
    webUseCases: ["AWS serverless", "pay-per-request APIs"],
    pros: [{ id: "pro-scale", text: "Managed scale without connection pooling ops." }],
    cons: [{ id: "con-model", text: "Access-pattern-first design unlike relational migrate paths." }],
    chrysalisNotes: "Hub matrix uses scaffold; WPTP contract-first recommended.",
    popularityTier: "tier1",
  },
  {
    id: "cassandra",
    label: "Apache Cassandra",
    kind: "wide-column",
    sqlDialect: "cql",
    typicalDrivers: ["cassandra-driver", "DataStax"],
    typicalOrms: [],
    webUseCases: ["high write throughput", "time-series at scale"],
    pros: [{ id: "pro-writes", text: "Linear write scaling." }],
    cons: [{ id: "con-query", text: "Query model constraints vs SQL apps." }],
    chrysalisNotes: "Scaffold tier; not default oracle target.",
    popularityTier: "tier2",
  },
  {
    id: "couchbase",
    label: "Couchbase",
    kind: "document",
    sqlDialect: "n1ql",
    typicalDrivers: ["couchbase-sdk"],
    typicalOrms: [],
    webUseCases: ["mobile sync", "session + JSON documents"],
    pros: [{ id: "pro-mobile", text: "Mobile/offline sync story." }],
    cons: [{ id: "con-niche", text: "Smaller hiring pool than Postgres/MySQL." }],
    chrysalisNotes: "Scaffold; contract capture preferred.",
    popularityTier: "tier2",
  },
  {
    id: "elasticsearch",
    label: "Elasticsearch",
    kind: "search",
    sqlDialect: null,
    typicalDrivers: ["elasticsearch-js", "elastic-transport"],
    typicalOrms: [],
    webUseCases: ["full-text search", "log analytics", "Observability"],
    pros: [{ id: "pro-search", text: "Search and aggregations at scale." }],
    cons: [{ id: "con-source", text: "Secondary index — not authoritative OLTP." }],
    chrysalisNotes: "Usually paired with relational SoR; dual-write holes common.",
    popularityTier: "tier1",
  },
  {
    id: "firestore",
    label: "Firebase Firestore",
    kind: "document",
    sqlDialect: null,
    typicalDrivers: ["firebase-admin"],
    typicalOrms: [],
    webUseCases: ["mobile/web BaaS", "realtime listeners"],
    pros: [{ id: "pro-realtime", text: "Realtime sync for client apps." }],
    cons: [{ id: "con-vendor", text: "Google Cloud coupling; query limits." }],
    chrysalisNotes: "OpenAPI/HAR contract-first path; no SQL ingest.",
    popularityTier: "tier1",
  },
  {
    id: "planetscale",
    label: "PlanetScale (MySQL)",
    kind: "serverless-sql",
    sqlDialect: "mysql",
    typicalDrivers: ["mysql2", "planetscale"],
    typicalOrms: ["Prisma", "Drizzle"],
    webUseCases: ["serverless MySQL", "branching schema"],
    pros: [{ id: "pro-branches", text: "Branching workflows for schema changes." }],
    cons: [{ id: "con-vitess", text: "Vitess constraints on some MySQL features." }],
    chrysalisNotes: "Migrate as mysql dialect; verify connection pooling in emit.",
    popularityTier: "tier2",
  },
  {
    id: "cockroachdb",
    label: "CockroachDB",
    kind: "relational",
    sqlDialect: "postgresql",
    typicalDrivers: ["pg", "node-pg", "jdbc"],
    typicalOrms: ["Prisma", "GORM"],
    webUseCases: ["globally distributed SQL", "Postgres wire"],
    pros: [{ id: "pro-distributed", text: "Postgres-compatible distributed SQL." }],
    cons: [{ id: "con-latency", text: "Distributed transaction latency tradeoffs." }],
    chrysalisNotes: "Use postgresql sql dialect in WebIR.",
    popularityTier: "tier2",
  },
  {
    id: "neon",
    label: "Neon (PostgreSQL)",
    kind: "serverless-sql",
    sqlDialect: "postgresql",
    typicalDrivers: ["pg", "serverless driver"],
    typicalOrms: ["Prisma", "Drizzle"],
    webUseCases: ["serverless Postgres", "scale-to-zero"],
    pros: [{ id: "pro-serverless", text: "Postgres with scale-to-zero compute." }],
    cons: [{ id: "con-cold", text: "Cold start latency on idle branches." }],
    chrysalisNotes: "postgresql dialect; same emit as Postgres apps.",
    popularityTier: "tier2",
  },
  {
    id: "turso",
    label: "Turso (libSQL)",
    kind: "serverless-sql",
    sqlDialect: "sqlite",
    typicalDrivers: ["libsql", "@libsql/client"],
    typicalOrms: ["Drizzle"],
    webUseCases: ["edge SQLite", "global replicas"],
    pros: [{ id: "pro-edge", text: "SQLite semantics at the edge." }],
    cons: [{ id: "con-new", text: "Younger ecosystem vs Postgres." }],
    chrysalisNotes: "sqlite dialect; embedded session patterns apply.",
    popularityTier: "tier2",
  },
  {
    id: "supabase",
    label: "Supabase (PostgreSQL)",
    kind: "serverless-sql",
    sqlDialect: "postgresql",
    typicalDrivers: ["pg", "supabase-js"],
    typicalOrms: ["Prisma", "Supabase client"],
    webUseCases: ["BaaS Postgres", "auth + realtime"],
    pros: [{ id: "pro-baas", text: "Postgres plus auth/storage APIs." }],
    cons: [{ id: "con-vendor", text: "Platform coupling beyond raw SQL." }],
    chrysalisNotes: "postgresql core; auth often separate oracle capture.",
    popularityTier: "tier1",
  },
  {
    id: "memcached",
    label: "Memcached",
    kind: "key-value",
    sqlDialect: null,
    typicalDrivers: ["memcached", "php-memcached"],
    typicalOrms: [],
    webUseCases: ["object cache", "fragment cache"],
    pros: [{ id: "pro-simple", text: "Simple cache semantics." }],
    cons: [{ id: "con-features", text: "Fewer data structures than Redis." }],
    chrysalisNotes: "Cache effect only; not migration SoR.",
    popularityTier: "tier2",
  },
  {
    id: "clickhouse",
    label: "ClickHouse",
    kind: "relational",
    sqlDialect: "clickhouse",
    typicalDrivers: ["clickhouse-driver"],
    typicalOrms: [],
    webUseCases: ["analytics", "OLAP", "event pipelines"],
    pros: [{ id: "pro-olap", text: "Fast analytical queries." }],
    cons: [{ id: "con-oltp", text: "Not a drop-in OLTP replacement." }],
    chrysalisNotes: "Usually secondary to Postgres/MySQL SoR.",
    popularityTier: "tier2",
  },
  {
    id: "snowflake",
    label: "Snowflake",
    kind: "relational",
    sqlDialect: "snowflake",
    typicalDrivers: ["snowflake-sdk"],
    typicalOrms: [],
    webUseCases: ["warehouse analytics", "BI feeds"],
    pros: [{ id: "pro-warehouse", text: "Managed warehouse scale." }],
    cons: [{ id: "con-web-tier", text: "Rarely the web request path hot database." }],
    chrysalisNotes: "Out of band for HTTP handler migration.",
    popularityTier: "tier3",
  },
  {
    id: "singlestore",
    label: "SingleStore",
    kind: "relational",
    sqlDialect: "mysql",
    typicalDrivers: ["mysql2"],
    typicalOrms: [],
    webUseCases: ["HTAP", "real-time analytics"],
    pros: [{ id: "pro-htap", text: "Transactional + analytical blend." }],
    cons: [{ id: "con-niche", text: "Smaller community than tier-1 RDBMS." }],
    chrysalisNotes: "mysql dialect for lift purposes.",
    popularityTier: "tier3",
  },
  {
    id: "fauna",
    label: "Fauna",
    kind: "document",
    sqlDialect: "fql",
    typicalDrivers: ["fauna-js"],
    typicalOrms: [],
    webUseCases: ["serverless global", "document + relational FQL"],
    pros: [{ id: "pro-global", text: "Global distribution without shard ops." }],
    cons: [{ id: "con-fql", text: "FQL differs from SQL-centric Chrysalis probes." }],
    chrysalisNotes: "Contract-first; no default SQL oracle.",
    popularityTier: "tier3",
  },
  {
    id: "influxdb",
    label: "InfluxDB",
    kind: "wide-column",
    sqlDialect: null,
    typicalDrivers: ["influxdb-client"],
    typicalOrms: [],
    webUseCases: ["metrics", "IoT time series"],
    pros: [{ id: "pro-ts", text: "Time-series optimized." }],
    cons: [{ id: "con-app", text: "Not typical CRUD web app primary store." }],
    chrysalisNotes: "Orthogonal to route migration matrix.",
    popularityTier: "tier3",
  },
];

/**
 * @param {string} [tier]
 * @returns {WebDatabaseProfile[]}
 */
export function listWebDatabases(tier) {
  if (!tier) return [...WEB_DATABASE_PROFILES];
  return WEB_DATABASE_PROFILES.filter((d) => d.popularityTier === tier);
}

/**
 * @param {string} id
 * @returns {WebDatabaseProfile | undefined}
 */
export function webDatabaseById(id) {
  return WEB_DATABASE_PROFILES.find((d) => d.id === id);
}

/**
 * @param {string[]} detectedIds
 */
export function databasesForMigrationContext(detectedIds = []) {
  const known = detectedIds.map((id) => webDatabaseById(id)).filter(Boolean);
  const tier1 = listWebDatabases("tier1");
  return {
    detected: known,
    recommendedTier1: tier1.map((d) => d.id),
    count: WEB_DATABASE_PROFILES.length,
  };
}

export function buildWebDatabaseCatalogReport() {
  const byKind = {};
  for (const d of WEB_DATABASE_PROFILES) {
    byKind[d.kind] = (byKind[d.kind] ?? 0) + 1;
  }
  return {
    kind: HUB_WEB_DATABASES_KIND,
    schemaVersion: HUB_WEB_DATABASES_SCHEMA_VERSION,
    count: WEB_DATABASE_PROFILES.length,
    tier1Count: listWebDatabases("tier1").length,
    tier2Count: listWebDatabases("tier2").length,
    tier3Count: listWebDatabases("tier3").length,
    byKind,
    databases: WEB_DATABASE_PROFILES,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  let jsonOut = null;
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === "--json-out" && process.argv[i + 1]) jsonOut = resolve(process.argv[++i]);
  }
  const report = buildWebDatabaseCatalogReport();
  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
