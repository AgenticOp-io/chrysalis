/**
 * Probe emitted ASP.NET hub apps via WebApplicationFactory (oracle-csharp).
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { concreteProbePath, writeProbeRoutes } from "./hub-gold-probe-routes.mjs";

/**
 * @returns {string | null}
 */
export function resolveHubDotnet() {
  for (const cmd of ["dotnet", "dotnet.exe"]) {
    const r = spawnSync(cmd, ["--version"], { encoding: "utf8" });
    if (r.status === 0) return cmd;
  }
  return null;
}

/**
 * @param {string} programCs
 */
function ensurePartialProgramClass(programCs) {
  if (/public\s+partial\s+class\s+Program/.test(programCs)) return programCs;
  return `${programCs.trimEnd()}\n\npublic partial class Program { }\n`;
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 */
export function runCsharpAspNetProbe(scriptRoot, fixture) {
  const dotnet = resolveHubDotnet();
  if (!dotnet) {
    return { status: 1, stderr: "dotnet-not-on-path", stdout: "" };
  }
  const programSrc = join(fixture, "generated/csharp/Program.cs");
  if (!existsSync(programSrc)) {
    return { status: 1, stderr: "missing-generated-program", stdout: "" };
  }

  const work = join(fixture, ".chrysalis/aspnet-probe-work");
  rmSync(work, { recursive: true, force: true });
  mkdirSync(join(work, "HubApp"), { recursive: true });
  mkdirSync(join(work, "Probe"), { recursive: true });

  const programText = ensurePartialProgramClass(readFileSync(programSrc, "utf8"));
  writeFileSync(join(work, "HubApp/Program.cs"), programText, "utf8");
  const csprojSrc = join(fixture, "generated/csharp/chrysalis-hub.csproj");
  if (existsSync(csprojSrc)) {
    cpSync(csprojSrc, join(work, "HubApp/chrysalis-hub.csproj"));
  } else {
    writeFileSync(
      join(work, "HubApp/chrysalis-hub.csproj"),
      '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><TargetFramework>net9.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><Nullable>enable</Nullable></PropertyGroup></Project>\n',
      "utf8",
    );
  }

  cpSync(join(scriptRoot, "packages/oracle-csharp/Probe.csproj"), join(work, "Probe/Probe.csproj"));
  cpSync(join(scriptRoot, "packages/oracle-csharp/ProbeProgram.cs"), join(work, "Probe/ProbeProgram.cs"));
  writeFileSync(
    join(work, "chrysalis-probe.sln"),
    [
      "Microsoft Visual Studio Solution File, Format Version 12.00",
      'Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "chrysalis-hub", "HubApp\\chrysalis-hub.csproj", "{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}"',
      "EndProject",
      'Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "Probe", "Probe\\Probe.csproj", "{B2C3D4E5-F6A7-8901-BCDE-F12345678901}"',
      "EndProject",
      "Global",
      "\tGlobalSection(SolutionConfigurationPlatforms) = preSolution",
      "\t\tDebug|Any CPU = Debug|Any CPU",
      "\tEndGlobalSection",
      "\tGlobalSection(ProjectConfigurationPlatforms) = postSolution",
      "\t\t{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}.Debug|Any CPU.ActiveCfg = Debug|Any CPU",
      "\t\t{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}.Debug|Any CPU.Build.0 = Debug|Any CPU",
      "\t\t{B2C3D4E5-F6A7-8901-BCDE-F12345678901}.Debug|Any CPU.ActiveCfg = Debug|Any CPU",
      "\t\t{B2C3D4E5-F6A7-8901-BCDE-F12345678901}.Debug|Any CPU.Build.0 = Debug|Any CPU",
      "\tEndGlobalSection",
      "EndGlobal",
      "",
    ].join("\n"),
    "utf8",
  );

  const restore = spawnSync(dotnet, ["restore", "Probe/Probe.csproj"], { cwd: work, encoding: "utf8" });
  if (restore.status !== 0) {
    return { status: 1, stderr: restore.stderr || restore.stdout || "dotnet restore failed", stdout: "" };
  }

  return spawnSync(dotnet, ["run", "--project", "Probe/Probe.csproj", "--no-restore", "--", resolve(fixture)], {
    cwd: work,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

/**
 * @param {string} scriptRoot
 * @param {string} fixture
 */
export function createCsharpAspNetInProcessFetch(scriptRoot, fixture) {
  /** @type {Map<string, { status: number, body: string, headers: Record<string, string> }> | null} */
  let cache = null;

  async function loadCache() {
    if (cache) return cache;
    const probe = runCsharpAspNetProbe(scriptRoot, fixture);
    if (probe.status !== 0) {
      throw new Error(probe.stderr || probe.stdout || "aspnet probe failed");
    }
    const report = JSON.parse(probe.stdout.trim().split("\n").pop() ?? "{}");
    if (!report.ok) throw new Error(report.error ?? "aspnet probe not ok");
    cache = new Map();
    for (const r of report.results ?? []) {
      if (r.error) continue;
      cache.set(`${r.method} ${r.path}`, {
        status: r.status,
        body: r.body ?? "",
        headers: r.headers ?? {},
      });
    }
    return cache;
  }

  return async (url, init) => {
    const map = await loadCache();
    const u = new URL(url);
    const method = (init?.method ?? "GET").toUpperCase();
    const key = `${method} ${u.pathname}`;
    const hit = map.get(key);
    if (!hit) {
      return new Response(`not found: ${key}`, { status: 404 });
    }
    return new Response(hit.body, { status: hit.status, headers: hit.headers });
  };
}

export { concreteProbePath, writeProbeRoutes };
