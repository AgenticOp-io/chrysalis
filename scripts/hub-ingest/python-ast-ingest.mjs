/**
 * Python hub ingest — delegates to @chrysalis/ingest hub Python adapter (G8721).
 */
export {
  canPythonHubIngest as canPythonAstIngest,
  canPythonHubIngest,
  liftPythonFileToWebir,
} from "../../packages/ingest/dist/hub-python-lift.js";

export { parseSourceSync as parsePythonRoutes } from "../../packages/python-bridge/dist/index.js";
