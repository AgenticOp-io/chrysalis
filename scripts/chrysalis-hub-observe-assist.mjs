/**
 * Staging observe / capture guidance for hub portal (no remote PHP execution from hub).
 */
import { join } from "node:path";

export function buildObserveAssist(site, project, repoRoot) {
  const prep = site.originPrep ?? {};
  const appRoot = prep.appRoot ?? site.ssh?.remotePath ?? site.localDir;
  const traceDir = prep.suggestedTraceDir ?? join(site.localDir, ".chrysalis", "traces");
  const hubTraces = join(site.localDir, ".chrysalis", "traces");

  const steps = [
    "On a **staging** host (not production), use a copy of the legacy PHP tree.",
    "Install Chrysalis `packages/oracle-php` on that host (or sync from the hub repo).",
    `Export traces: export CHRYSALIS_TRACE_DIR=${traceDir}`,
    "Run PHP with auto_prepend_file pointing at packages/oracle-php/src/bootstrap.php.",
    "Send realistic traffic (login, CRUD, APIs) against that staging server.",
    `Copy NDJSON traces to the hub site workspace: ${hubTraces}`,
    "In the hub Console, run **Verify** with base URL of your emitted TypeScript app.",
  ];

  const phpPrepend = repoRoot
    ? join(repoRoot, "packages/oracle-php/src/bootstrap.php")
    : "/path/to/chrysalis/packages/oracle-php/src/bootstrap.php";

  return {
    kind: "chrysalis.hub.observe-assist",
    schemaVersion: 0,
    siteId: site.id,
    siteName: site.name,
    appRoot,
    hubTracesDir: hubTraces,
    originTraceDir: traceDir,
    captureInstructionsPath: prep.captureInstructions ?? null,
    observeConfigPath: prep.observeConfigTemplate ?? join(appRoot, "chrysalis.observe.json"),
    phpOnPath: prep.phpOnPath ?? false,
    phpVersion: prep.phpVersion ?? "",
    envHints: prep.envHints ?? "",
    stagingSteps: steps,
    commands: {
      exportTraces: `export CHRYSALIS_TRACE_DIR=${traceDir}`,
      phpBuiltIn: `php -d auto_prepend_file=${phpPrepend} -S 127.0.0.1:8080 -t ${appRoot}`,
      hubObserveCli: `chrysalis observe ${site.localDir}`,
      copyTracesToHub: `# from laptop: scp -r staging:${traceDir}/* hub:${hubTraces}/`,
    },
    note: "The Translation Hub does not execute PHP on customer production servers. Capture runs on staging; verify runs on the hub against traces + emitted app URL.",
  };
}
