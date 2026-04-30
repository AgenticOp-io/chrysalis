/**
 * @chrysalis/oracle — record/replay sidecar for legacy PHP apps.
 *
 * Milestone 1 implementation (Decision D6): the recording half lives in a
 * userland PHP prelude (`packages/oracle-php/`) that is loaded via
 * `auto_prepend_file`. The prelude emits one NDJSON file per request into a
 * `traces/<iso-date>/` directory. This Node package reads, validates, and
 * indexes those traces for downstream ingest/verify/chimera stages.
 */

export {
  SCHEMA_VERSION,
  type Trace,
  type TraceBodyEvent,
  type TraceCorpus,
  type TraceEvent,
  type TraceFooter,
  type TraceHeader,
  type HttpRequestEvent,
  type HttpResponseEvent,
  type SqlQueryEvent,
  type HeaderCallEvent,
  type SetCookieEvent,
  type ExitEvent,
  type EchoEvent,
  type TimeReadEvent,
  type RandomReadEvent,
  type HoleObservedEvent,
  type HttpOutboundEvent,
  type MailSendEvent,
  type RedactionKind,
  type RedactionRecord,
  SchemaError,
  parseEvent,
} from "./trace-schema.js";

export {
  TraceFileError,
  parseTraceFile,
  readCorpus,
  groupByRoute,
  type ReadCorpusOptions,
  type RouteSignature,
} from "./reader.js";

export {
  DEFAULT_REDACTION,
  canonicalJSON,
  mergeObserveFileRulesWithDefaults,
  redactionRecords,
  type RedactionConfig,
  type RedactionRule,
} from "./redaction.js";

export {
  startObserver,
  loadObserveConfig,
  type ObserveOptions,
  type ObserveHandle,
} from "./observe.js";

export {
  mergeCorpusDirectories,
  type CorpusMergeDuplicatePolicy,
  type CorpusMergeTraceIdPolicy,
  type MergeCorpusDirectoriesOptions,
  type MergeCorpusDirectoriesResult,
} from "./merge-corpus.js";
