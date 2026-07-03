/**
 * @chrysalis/ingest hub Python origin adapter (parser-bridge pattern).
 */
export {
  canPythonHubIngest,
  canPythonAstIngest,
  ingestPythonHubSource,
  liftPythonFileToWebir,
  liftPythonRoutesToWebir,
  type LiftPythonHubOpts,
  type LiftPythonHubResult,
} from "./hub-python-lift.js";

export { parseFile as parsePythonFile, parseSourceSync as parsePythonRoutes, SCHEMA_VERSION as PYTHON_BRIDGE_SCHEMA_VERSION } from "@chrysalis/python-bridge";
export type { PythonHubParseResult, PythonHubRoute } from "@chrysalis/python-bridge";
