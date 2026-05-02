/**
 * Machine JSON: batch of **`chrysalis verify --json-summary`** documents (**DESIGN D271**).
 * Offline merge for fleet dashboards; no network in verify replay paths.
 */
export const VERIFY_SUMMARY_KIND = "chrysalis.verify.summary" as const;

export const VERIFY_SUMMARY_BATCH_KIND = "chrysalis.verify.summary.batch" as const;

export const VERIFY_SUMMARY_BATCH_SCHEMA_VERSION = 1 as const;
