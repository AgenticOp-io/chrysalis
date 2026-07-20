/**
 * Structural-shell Svelte markup lift (DESIGN D6367, G9460; fill-holes G9500 / D6371).
 *
 * When a page is not fully static, emit an HTML shell that preserves layout
 * structure and records explicit holes for dynamic Svelte constructs.
 * Never invent component trees or live data — holes only (§3 item 6).
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { extractHtmlClassNames, liftStaticSveltePageHtml } from "./ui-markup-svelte.js";

export type SvelteMarkupLiftMode = "static" | "structural-shell";

export interface SvelteMarkupLiftHole {
  readonly reason: string;
  readonly detail: string;
}

export interface SvelteMarkupLiftResult {
  readonly html: string;
  readonly classNames: ReadonlyArray<string>;
  readonly liftMode: "static" | "structural-shell";
  readonly holes: ReadonlyArray<SvelteMarkupLiftHole>;
}

export const HOLE_EACH = "legacy:markup-lift-svelte-each";
export const HOLE_IF = "legacy:markup-lift-svelte-if";
export const HOLE_INTERP = "legacy:markup-lift-svelte-interp";
export const HOLE_COMPONENT = "legacy:markup-lift-svelte-component";
const HOLE_DIRECTIVE = "legacy:markup-lift-svelte-directive";
const HOLE_EVENT = "legacy:markup-lift-svelte-event";
const HOLE_RESIDUAL = "legacy:markup-lift-svelte-residual";

/**
 * Layout-only Svelte wrappers that contribute no visible chrome of their own.
 * Children are kept; the component tag is not recorded as a hole (G9490 / D6370).
 */
export const DEFAULT_LAYOUT_PASSTHROUGH_COMPONENTS: ReadonlySet<string> = new Set([
  "TenantGuard",
]);

/**
 * Showcase settle for common loading/error flags (G9500).
 * Documented as showcase settle — not runtime truth from the live app.
 */
export const DEFAULT_SHOWCASE_LOAD_BOOLS: Readonly<Record<string, boolean>> = {
  isLoading: false,
  loading: false,
  error: false,
  /** Demo showcase user is an authorized admin — render the module content,
   * not the Access Denied fallback; runtime auth re-gates on the live site. */
  hasPlatformAdminAccess: true,
  /** User-management invite/role chrome is admin-gated; keep it visible for the demo. */
  canManageUsers: true,
  success: false,
  statusLoading: false,
  statusError: false,
  agentsError: false,
  showOnboardingWizard: false,
  showSetupWizard: false,
  showDemoChrome: false,
  simpleLoginOnly: false,
  /** Login page: main form visible; reset/demo visitor closed to match product login. */
  showPasswordReset: false,
  passwordResetSent: false,
  demoVisitorEnabled: false,
  /** Dashboard chrome — closed overlays (D6443). */
  showSettings: false,
  showTipsModal: false,
  /** NotificationCenter / dropdown panels default closed. */
  open: false,
  showCreateModal: false,
  showEditModal: false,
  showDeleteConfirm: false,
  showDeleteModal: false,
  showAssignOwnerModal: false,
  showUsersModal: false,
  showPlanDraftMenu: false,
  loadingAgents: false,
  loadingUsers: false,
  loadingSites: false,
  saving: false,
  isSaving: false,
  isSigningIn: false,
  isLoggedIn: true,
  isAdmin: true,
  autoRefresh: false,
  existingConfig: false,
};

/** Components safe to inline when their lift is fully static (no nested holes). */
export const DEFAULT_STATIC_INLINE_COMPONENTS: ReadonlySet<string> = new Set([
  "TopBrand",
  "DemoSiteBanner",
  "AdminBreadcrumb",
]);

/**
 * Coverage-map (and similar) interactive panels inlined with holes allowed (D6442).
 * Prefer real lifted markup + `hidden` closed state over empty shells.
 */
export const DEFAULT_STRUCTURAL_INLINE_COMPONENTS: ReadonlySet<string> = new Set([
  "FilterPanel",
  "HelpModal",
  "TipsModal",
  "DeviceManagementPanel",
  "MapContextMenu",
  "TowerActionsMenu",
  "SectorActionsMenu",
  "BackhaulActionsMenu",
  // Module header wizards — real trigger chrome + client catalog bind (D6442); not empty nav shells.
  "ModuleWizardMenu",
  // Coverage-map Add*/edit modals — lift closed chrome (D6443/D6444), not empty shells that block the map.
  "AddSiteModal",
  "AddNOCModal",
  "AddWarehouseModal",
  "AddVehicleModal",
  "AddRMAModal",
  "AddSectorModal",
  "AddCPEModal",
  "AddBackhaulLinkModal",
  "AddBackhaulModal",
  "AddInventoryModal",
  "EPCDeploymentModal",
  "HSSRegistrationModal",
  "HardwareDeploymentModal",
  "SiteEditModal",
  "UnifiedDeviceDetailsModal",
  // Inventory / customers — origin modal chrome (D6443), not invented substitutes
  "TransferModal",
  "CustomerBillingModal",
  "AddEditCustomerModal",
  "PlanMarketingModal",
  "PlanMarketingResultsPopup",
  "PCIPlannerModal",
  "FrequencyPlannerModal",
  "PlanApprovalModal",
  "DeployedHardwareModal",
  "SiteDetailsModal",
  "SiteEquipmentModal",
  "ProjectFilterPanel",
  "PlanLayerFilterPanel",
  "DeploymentWizard",
  "SiteDeploymentWizard",
  "AnalysisModal",
  "ConflictsModal",
  "RecommendationsModal",
  "OptimizationResultModal",
]);

/** Page-local UI toggles whose closed chrome must remain in the DOM (hidden), not deleted. */
const UI_TOGGLE_OVERLAY_RE =
  /\b(show[A-Z][A-Za-z0-9_]*|hide[A-Z][A-Za-z0-9_]*|open|visible|loading[A-Z][A-Za-z0-9_]*|is(?:Open|Visible|Loading|Editing|SigningIn|Saving|DeployMode|PlanMode|LoggedIn)\b|is[A-Z][A-Za-z0-9_]*(?:Open|Visible|Loading|Editing|DeployMode|PlanMode)|showFilters|showStats|showDevicePanel|showHelpModal|showTipsModal|showContextMenu|showTowerActionsMenu|showSectorActionsMenu|showBackhaulActionsMenu|showPlanDraftMenu|showOnboardingWizard|showSetupWizard|showDemoChrome|showPasswordReset|passwordResetSent|demoVisitorEnabled|showSettings|showCreateModal|showEditModal|showDeleteConfirm|showDeleteModal|showAssignOwnerModal|showUsersModal)\b/;

export function isUiToggleOverlayIfHeader(header: string): boolean {
  return UI_TOGGLE_OVERLAY_RE.test(header);
}

/**
 * True when an open tag carries the HTML boolean `hidden` attribute.
 * Must not treat `aria-hidden` as closed paint (D6443 / overlay first-paint).
 */
export function hasBooleanHiddenAttr(openTag: string): boolean {
  return /(?:^|\s)hidden(?:\s|=|>|$)/i.test(openTag);
}

/**
 * Stamp closed-state attributes on the first element root (translate closed, do not invent).
 * When `shellKey` is provided (the `{#if showX}` toggle ident), it is stamped as
 * `data-cwl-shell-key` so runtime `data-cwl-toggle="showX:true"` clicks resolve
 * page-local modal chrome deterministically — fuzzy shell-name search cannot see
 * these blocks (voice-telephony Add number / work-orders Create dead toggles).
 */
export function stampClosedUiChrome(html: string, shellKey?: string): string {
  const keyAttr =
    shellKey !== undefined && shellKey.length > 0
      ? ` data-cwl-shell-key="${shellKey.replace(/"/g, "&quot;")}"`
      : "";
  const lead = html.match(/^\s*/)?.[0] ?? "";
  const trimmed = html.slice(lead.length);
  if (trimmed.length === 0) return html;
  const nameMatch = /^<(div|nav|aside|section)\b/i.exec(trimmed);
  if (nameMatch === null) {
    return `${lead}<div${keyAttr} hidden aria-hidden="true">${trimmed}</div>`;
  }
  // Brace/quote-aware open-tag end — naive [^>] breaks on onclick={() => …}.
  let i = nameMatch[0].length;
  let brace = 0;
  let quote: '"' | "'" | null = null;
  while (i < trimmed.length) {
    const ch = trimmed[i]!;
    if (quote !== null) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      i++;
      continue;
    }
    if (ch === "{") {
      brace++;
      i++;
      continue;
    }
    if (ch === "}") {
      brace = Math.max(0, brace - 1);
      i++;
      continue;
    }
    if (brace === 0 && ch === ">") {
      i++;
      break;
    }
    i++;
  }
  let open = trimmed.slice(0, i);
  const rest = trimmed.slice(i);
  if (keyAttr.length > 0 && !/\bdata-cwl-shell-key\b/.test(open)) {
    open = open.replace(/>$/, `${keyAttr}>`);
  }
  if (hasBooleanHiddenAttr(open)) {
    if (!/\baria-hidden\b/i.test(open)) {
      return `${lead}${open.replace(/>$/, ' aria-hidden="true">')}${rest}`;
    }
    return `${lead}${open}${rest}`;
  }
  // aria-hidden alone still paints when origin CSS uses display:flex on overlays.
  if (/\baria-hidden\b/i.test(open)) {
    return `${lead}${open.replace(/>$/, " hidden>")}${rest}`;
  }
  return `${lead}${open.replace(/>$/, ' hidden aria-hidden="true">')}${rest}`;
}

/**
 * Modal wrappers collapsed to inert shells (G9660 / D6383; expanded G9690 / D6388).
 * Showcase-only: aria-hidden dialog placeholder; live behavior stays a hole elsewhere.
 */
export const DEFAULT_MODAL_SHELL_COMPONENTS: ReadonlySet<string> = new Set([
  "TipsModal",
  "HelpModal",
  "CreateWorkOrderModal",
  "CPEPerformanceModal",
  "PlanMarketingModal",
  "EPCDeploymentModal",
  "SiteEditModal",
  "AddEditCustomerModal",
  "AddSectorModal",
  "AddCPEModal",
  "AddBackhaulLinkModal",
  "AddBackhaulModal",
  "AddInventoryModal",
  "ScanModal",
  "TicketDetailsModal",
  "SettingsModal",
  "ParameterEditorModal",
  "UnifiedDeviceDetailsModal",
  "AddSiteModal",
  "AddNOCModal",
  "AddWarehouseModal",
  "AddVehicleModal",
  "AddRMAModal",
  "HSSRegistrationModal",
  "HardwareDeploymentModal",
  "PCIPlannerModal",
  "FrequencyPlannerModal",
  "PlanApprovalModal",
  "DeployedHardwareModal",
  "SiteDetailsModal",
  "SiteEquipmentModal",
  "CustomerLookupModal",
  "BundleDetailsModal",
  "CreateTicketModal",
  "MikrotikCredentialsModal",
  "MonitoringSiteDetailsModal",
  "AnalysisModal",
  "ConflictsModal",
  "RecommendationsModal",
  "OptimizationResultModal",
  "InviteUserModal",
  "EditUserModal",
  "PlanMarketingResultsPopup",
]);

/**
 * Map / chart embeds collapsed to inert shells (G9680 / D6388) — no live map/chart invented.
 * SharedMap is NOT here: origin uses an iframe → coverage-map ArcGIS island (D6442/D6448-ST).
 */
export const DEFAULT_MAP_SHELL_COMPONENTS: ReadonlySet<string> = new Set([
  "CoverageMapView",
  "BasemapSwitcher",
  "MapContextMenu",
]);

export const DEFAULT_CHART_SHELL_COMPONENTS: ReadonlySet<string> = new Set([
  "TR069RSSIChart",
  "LTESignalChart",
  "TR069SINRChart",
  "TR069PCIChart",
  "TR069EARFCNChart",
  "TR069UptimeChart",
]);

/**
 * Nav / menu chrome collapsed to inert shells (G9710 / D6390) — no live menus invented.
 */
export const DEFAULT_NAV_SHELL_COMPONENTS: ReadonlySet<string> = new Set([
  "MainMenu",
  // ModuleWizardMenu is structural-inline (DEFAULT_STRUCTURAL_INLINE_COMPONENTS) — empty nav shells hid Wizards on Plan/Deploy.
  "AdminBreadcrumb",
  "NotificationCenter",
  "VerticalMenu",
  "SettingsMenu",
  "ContextMenu",
  "TowerActionsMenu",
  "SectorActionsMenu",
  "BackhaulActionsMenu",
  "FilterPanel",
  "ProjectFilterPanel",
  "PlanLayerFilterPanel",
]);

/**
 * Multi-step wizard chrome collapsed to inert shells (G9710 / D6390).
 */
export const DEFAULT_WIZARD_SHELL_COMPONENTS: ReadonlySet<string> = new Set([
  "DeviceOnboardingWizard",
  "TroubleshootingWizard",
  "PresetCreationWizard",
  "BulkOperationsWizard",
  "FirmwareUpdateWizard",
  "DeviceRegistrationWizard",
  "CBRSDeviceRegistrationWizard",
  "CustomerOnboardingWizard",
  "DeploymentWizard",
  "SiteDeploymentWizard",
  "SubscriberCreationWizard",
  "BandwidthPlanWizard",
  "SubscriberGroupWizard",
  "InventoryCheckInWizard",
  "RMATrackingWizard",
  "ImportWizard",
  "ConflictResolutionWizard",
  "WorkOrderCreationWizard",
  "FirstTimeSetupWizard",
  "OrganizationSetupWizard",
  "InitialConfigurationWizard",
  "CBRSSetupWizard",
  "MonitoringSetupWizard",
  "BaseWizard",
]);

/**
 * Live data widgets collapsed to inert shells (G9730 / D6392).
 * Hydration may fill a summary table from traced/showcase JSON — never invents controls.
 */
export const DEFAULT_WIDGET_SHELL_COMPONENTS: ReadonlySet<string> = new Set([
  "BandwidthPlans",
  "GroupManagement",
  "GlobalSettings",
  "CPEDeviceRow",
  "TR069Actions",
  "LTEKPICards",
  "DeviceList",
  "GrantStatus",
  "UserIDSelector",
  "DeviceManagementPanel",
  "ModalManager",
  "StripeCardForm",
  "SNMPDevicesPanel",
  "HSSStats",
  "MMEConnections",
  "BulkImport",
  "AssetTagViewer",
  "SNMPConfigurationPanel",
  "PCIStatusWidget",
  "NetworkManager",
  "CellEditor",
  "SiteEditor",
  "TowerManager",
  "ConflictReportExport",
  "WorkOrderCard",
]);

function modalShellMarkup(name: string): string {
  const safe = name.replace(/"/g, "'");
  return `<div class="cwl-modal-shell" data-cwl-modal-shell="${safe}" aria-hidden="true" role="dialog"></div>`;
}

function mapShellMarkup(name: string): string {
  const safe = name.replace(/"/g, "'");
  return `<div class="cwl-map-shell" data-cwl-map-shell="${safe}" aria-hidden="true" role="img"></div>`;
}

/**
 * Origin SharedMap.svelte → iframe to coverage-map (ArcGIS island). Do not invent Bing/OSM.
 * @param tagText full `<SharedMap …>` open/self-closing tag
 */
export function sharedMapIslandMarkup(tagText: string): string {
  let mode = "plan";
  const lit =
    /\bmode\s*=\s*["'](plan|deploy|monitor)["']/.exec(tagText) ||
    /\bmode\s*=\s*\{\s*["'](plan|deploy|monitor)["']\s*\}/.exec(tagText);
  if (lit) mode = lit[1]!;
  else if (/\bmode\s*=\s*\{\s*mapMode\s*\}/.test(tagText)) {
    // Parent `mapMode` — Plan defaults plan; Deploy pages set deploy in route context.
    mode = /deploy/i.test(tagText) ? "deploy" : "plan";
  }
  const qs =
    mode === "deploy"
      ? "mode=deploy&hideStats=true&deployMode=true"
      : mode === "plan"
        ? "mode=plan&hideStats=true&planMode=true"
        : "hideStats=true";
  const id = mode === "deploy" ? "deploy-map-iframe" : "plan-map-iframe";
  const title = mode === "deploy" ? "Deploy map" : "Plan map";
  return (
    `<iframe id="${id}" class="plan-map-iframe" title="${title}" ` +
    `src="/modules/coverage-map?${qs}" ` +
    `data-cwl-island="shared-map" data-cwl-map-mode="${mode}" ` +
    `data-cwl-lifted-component="SharedMap"></iframe>`
  );
}

function chartShellMarkup(name: string): string {
  const safe = name.replace(/"/g, "'");
  return `<div class="cwl-chart-shell" data-cwl-chart-shell="${safe}" aria-hidden="true" role="img"></div>`;
}

function navShellMarkup(name: string): string {
  const safe = name.replace(/"/g, "'");
  return `<nav class="cwl-nav-shell" data-cwl-nav-shell="${safe}" aria-hidden="true"></nav>`;
}

function wizardShellMarkup(name: string): string {
  const safe = name.replace(/"/g, "'");
  return `<div class="cwl-wizard-shell" data-cwl-wizard-shell="${safe}" aria-hidden="true" role="dialog"></div>`;
}

function widgetShellMarkup(name: string): string {
  const safe = name.replace(/"/g, "'");
  return `<div class="cwl-widget-shell" data-cwl-widget-shell="${safe}" aria-hidden="true"></div>`;
}

/**
 * Scan a PascalCase Svelte component open/self-closing tag with brace-aware
 * attribute parsing. Naive `[^>]*` breaks on `on:click={() => …}` because `=>`
 * contains `>` (G9904).
 */
export function findPascalComponentTagEnd(source: string, start: number): number | null {
  if (source[start] !== "<") return null;
  const nameMatch = /^<([A-Z][A-Za-z0-9_]*)/.exec(source.slice(start));
  if (nameMatch === null) return null;
  let j = start + nameMatch[0].length;
  let brace = 0;
  let quote: '"' | "'" | null = null;
  let tick = false;
  /** `${...}` nesting depth while inside a template literal. */
  let tickExpr = 0;
  while (j < source.length) {
    const ch = source[j]!;

    // Comments — only when not inside a string / template
    if (quote === null && !tick && ch === "/" && source[j + 1] === "/") {
      j += 2;
      while (j < source.length && source[j] !== "\n" && source[j] !== "\r") j++;
      continue;
    }
    if (quote === null && !tick && ch === "/" && source[j + 1] === "*") {
      j += 2;
      while (j < source.length && !(source[j] === "*" && source[j + 1] === "/")) j++;
      j = Math.min(source.length, j + 2);
      continue;
    }

    if (quote !== null) {
      if (ch === "\\") {
        j += 2;
        continue;
      }
      if (ch === quote) quote = null;
      j++;
      continue;
    }

    if (tick) {
      if (ch === "\\") {
        j += 2;
        continue;
      }
      if (tickExpr > 0) {
        if (ch === "'" || ch === '"') {
          quote = ch;
          j++;
          continue;
        }
        if (ch === "`") {
          // Nested template literal inside ${}
          tickExpr++; // treat as nested tick via brace-like counter? simpler: scan nested tick
          // Actually nested ticks are rare; use recursive-ish skip:
          j++;
          let nestedExpr = 0;
          while (j < source.length) {
            const nc = source[j]!;
            if (nc === "\\") {
              j += 2;
              continue;
            }
            if (nestedExpr === 0 && nc === "`") {
              j++;
              break;
            }
            if (nc === "$" && source[j + 1] === "{") {
              nestedExpr++;
              j += 2;
              continue;
            }
            if (nestedExpr > 0 && nc === "{") {
              nestedExpr++;
              j++;
              continue;
            }
            if (nestedExpr > 0 && nc === "}") {
              nestedExpr--;
              j++;
              continue;
            }
            if (nestedExpr > 0 && (nc === "'" || nc === '"')) {
              const nq = nc;
              j++;
              while (j < source.length) {
                if (source[j] === "\\") {
                  j += 2;
                  continue;
                }
                if (source[j] === nq) {
                  j++;
                  break;
                }
                j++;
              }
              continue;
            }
            j++;
          }
          continue;
        }
        if (ch === "{") {
          tickExpr++;
          j++;
          continue;
        }
        if (ch === "}") {
          tickExpr--;
          j++;
          continue;
        }
        j++;
        continue;
      }
      if (ch === "`") {
        tick = false;
        j++;
        continue;
      }
      if (ch === "$" && source[j + 1] === "{") {
        tickExpr = 1;
        j += 2;
        continue;
      }
      j++;
      continue;
    }

    if (ch === "`") {
      tick = true;
      j++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      j++;
      continue;
    }
    if (ch === "{") {
      brace++;
      j++;
      continue;
    }
    if (ch === "}") {
      brace = Math.max(0, brace - 1);
      j++;
      continue;
    }
    if (brace === 0 && ch === "/" && source[j + 1] === ">") {
      return j + 2;
    }
    if (brace === 0 && ch === ">") {
      if (j > 0 && source[j - 1] === "=") {
        // `=>` arrow — not a tag closer
        j++;
        continue;
      }
      return j + 1;
    }
    j++;
  }
  return null;
}

/**
 * Brace-aware rewrite of Svelte event attributes.
 * Converts `on:click={() => goto('/path')}` (and template-literal goto) into
 * `data-cwl-nav="/path"`; strips other handlers without leaving residue text.
 */
/**
 * Script functions whose body is plain navigation (`goto('/x')` plus at most
 * dispatch/close bookkeeping) — resolve their names to nav targets so
 * `on:click={setupCbrs}` compiles to data-cwl-nav instead of an unbound action.
 */
function extractFunctionBodies(script: string): Array<{ name: string; body: string }> {
  const out: Array<{ name: string; body: string }> = [];
  const fnRe = /function\s+([a-zA-Z_$][\w$]*)\s*\([^)]*\)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = fnRe.exec(script))) {
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let end = -1;
    for (let i = open; i < script.length; i++) {
      const ch = script[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end < 0) continue;
    out.push({ name: m[1]!, body: script.slice(open + 1, end) });
  }
  return out;
}

export function extractHandlerNavTargets(source: string): Readonly<Record<string, string>> {
  const script = extractScriptBlocks(source);
  const out: Record<string, string> = {};
  for (const { name, body } of extractFunctionBodies(script)) {
    const gotos = [...body.matchAll(/\bgoto\s*\(\s*(['"])([^'"$]*)\1\s*\)/g)];
    if (gotos.length !== 1) continue;
    // Only bookkeeping besides the goto: dispatch(...), handleClose(), close flags.
    const residue = body
      .replace(/\bgoto\s*\(\s*(['"])[^'"$]*\1\s*\)\s*;?/g, "")
      .replace(/\bdispatch\s*\([^;]*\)\s*;?/g, "")
      .replace(/\bhandleClose\s*\(\s*\)\s*;?/g, "")
      .replace(/\b[a-zA-Z_$][\w$]*\s*=\s*(?:false|true|null)\s*;?/g, "")
      .replace(/\/\/[^\n]*/g, "")
      .trim();
    if (residue.length > 0) continue;
    out[name] = gotos[0]![2]!;
  }
  return out;
}

/**
 * Script functions whose intent is opening/closing a boolean overlay flag
 * (`showInviteModal = true`, optionally with form resets / early returns).
 * Resolves `on:click={openInviteModal}` → `data-cwl-toggle="showInviteModal:true"`.
 */
export function extractHandlerToggleTargets(
  source: string,
): Readonly<Record<string, string>> {
  const script = extractScriptBlocks(source);
  const out: Record<string, string> = {};
  const flagRe =
    /\b((?:show|is|open)[A-Z][A-Za-z0-9_]*)\s*=\s*(true|false)\b/g;
  for (const { name, body } of extractFunctionBodies(script)) {
    // Skip pure navigators — those already become data-cwl-nav.
    if (/\bgoto\s*\(/.test(body)) continue;
    const flags = [...body.matchAll(flagRe)];
    if (flags.length === 0) continue;
    // Prefer the last assignment (open after reset / early-return guards).
    const last = flags[flags.length - 1]!;
    const flagName = last[1]!;
    const flagValue = last[2]!;
    // Residue may include object/array resets and early returns — still a toggle.
    // Reject only if the body also drives another primary UI intent (fetch/API).
    if (/\b(?:fetch|await\s+|api\.|service\.)\b/i.test(body)) continue;
    out[name] = `${flagName}:${flagValue}`;
  }
  return out;
}

export function rewriteSvelteEventAttributes(
  html: string,
  handlerNavTargets: Readonly<Record<string, string>> = {},
  handlerToggleTargets: Readonly<Record<string, string>> = {},
): string {
  let out = "";
  let i = 0;
  const attrRe = /\s+(?:on:[a-zA-Z][\w:|.-]*|on[a-z]+)\s*=\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(html)) !== null) {
    out += html.slice(i, m.index);
    let depth = 0;
    let j = m.index + m[0].length - 1;
    for (; j < html.length; j++) {
      const ch = html[j];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    const body = html.slice(m.index + m[0].length, j - 1);
    const eventMatch = /on:([a-zA-Z][\w.-]*)|on([a-z]+)/i.exec(m[0]);
    const eventName = (eventMatch?.[1] ?? eventMatch?.[2] ?? "click")
      .split("|")[0]!
      .toLowerCase();
    const clickEvent = eventName === "click";
    // Accessibility duplicates (on:keydown mirroring on:click) must not emit
    // the same data-cwl-* attribute twice on one tag.
    const tagStart = out.lastIndexOf("<");
    const currentTag = tagStart >= 0 ? out.slice(tagStart) : "";
    const emitOnce = (attr: string) => {
      // Dedupe by attribute *name* (first writer wins), not full string —
      // on:click={toggle} + on:blur={handleBlur} must not emit two data-cwl-action=.
      const nameMatch = /^\s*([^\s=]+)\s*=/.exec(attr);
      const attrName = nameMatch?.[1];
      if (attrName) {
        const nameRe = new RegExp(
          `(?:^|\\s)${attrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*=`,
        );
        if (nameRe.test(currentTag) || nameRe.test(out.slice(tagStart >= 0 ? tagStart : 0))) {
          return;
        }
      } else if (currentTag.includes(attr) || out.includes(attr)) {
        return;
      }
      out += attr;
    };
    const emitBehavior = (kind: "action" | "nav" | "set" | "toggle", value: string) => {
      const safe = value.replace(/"/g, "&quot;");
      if (clickEvent) {
        const attrName =
          kind === "action"
            ? "data-cwl-action"
            : kind === "nav"
              ? "data-cwl-nav"
              : kind === "set"
                ? "data-cwl-set"
                : "data-cwl-toggle";
        emitOnce(` ${attrName}="${safe}"`);
      } else {
        emitOnce(` data-cwl-on-${eventName}="${kind}:${safe}"`);
      }
    };
    const gotoMatch =
      /\bgoto\s*\(\s*(['"`])([\s\S]*?)\1(?:\s*,[\s\S]*?)?\s*\)/.exec(body);
    if (gotoMatch) {
      let path = String(gotoMatch[2] ?? "").trim();
      // Template-literal `${item._id}` → `{item._id}` for each-row client render.
      path = path.replace(/\$\{([^}]+)\}/g, "{$1}");
      // Origin aliases that have no dedicated page — map to the converted surface.
      if (path === "/admin/tenants") path = "/admin/tenant-management";
      if (path && !/[;()]/.test(path.replace(/\{[^}]+\}/g, ""))) {
        emitBehavior("nav", path);
      }
    } else {
      const ignoredCalls = new Set([
        "if",
        "for",
        "while",
        "switch",
        "setTimeout",
        "setInterval",
        "clearTimeout",
        "clearInterval",
        "preventDefault",
        "stopPropagation",
        "encodeURIComponent",
        "decodeURIComponent",
        "console",
        "log",
        "warn",
        "error",
        "String",
        "Number",
        "Boolean",
        "requestAnimationFrame",
        // `async () => …` / `await fn()` keywords look like calls to the regex.
        "async",
        "await",
        "parseInt",
        "parseFloat",
        "isNaN",
        "isFinite",
      ]);
      const calls = [
        ...body.matchAll(/(^|[^\w$.])([a-zA-Z_$][\w$]*)\s*\(([^)]*)\)/g),
      ];
      // `dispatch('close')` etc. carry intent in the first string argument —
      // promote it to the action name instead of emitting the noise `dispatch`.
      // Generic `dispatch('action', { type: 'add-tower' })` carries intent in
      // the payload `type` — use it so the action name is never just "action".
      let dispatchCall = /\bdispatch\s*\(\s*(['"`])([\w-]+)\1/.exec(body);
      if (dispatchCall && dispatchCall[2] === "action") {
        const typed = /\btype\s*:\s*(['"`])([\w-]+)\1/.exec(body);
        if (typed) dispatchCall = [dispatchCall[0], typed[1]!, typed[2]!] as unknown as RegExpExecArray;
      }
      const call = calls.find(
        (candidate) =>
          !ignoredCalls.has(candidate[2]!) && candidate[2] !== "dispatch",
      );
      const directHandler = /^\s*([a-zA-Z_$][\w$]*)\s*$/.exec(body);
      // `condition ? truthyHandler : falsyHandler` — preserve both branches as
      // declarative CWL state instead of silently dropping the event.
      const conditionalHandler =
        /^\s*([a-zA-Z_$][\w$]*)\s*\?\s*([a-zA-Z_$][\w$]*)\s*:\s*([a-zA-Z_$][\w$]*)\s*$/.exec(
          body,
        );
      const setString = /\b([a-zA-Z_$][\w$]*)\s*=\s*(['"])(.*?)\2/.exec(body);
      const setBool = /\b([a-zA-Z_$][\w$]*)\s*=\s*(true|false)\b/.exec(body);
      // `error = null` / `success = null` — dismiss banner (same as clearing a string).
      const setNull = /\b([a-zA-Z_$][\w$]*)\s*=\s*null\b/.exec(body);
      // `list = list.filter((_, i) => i !== index)` — row removal by index.
      const removeRowAssign =
        /\b([\w$]+(?:\.[\w$]+)*)\s*=\s*\1\s*\.filter\s*\(/.exec(body);
      // `settings.acsPassword = Math.random()…` — inline random generator.
      const randomAssign =
        /\b(?:[\w$]+\.)*([\w$]+)\s*=\s*Math\.random\s*\(\)/.exec(body);
      // `showFilters = !showFilters` — flip toggle.
      const flipBool = /\b([a-zA-Z_$][\w$]*)\s*=\s*!\s*([a-zA-Z_$][\w$]*)\b/.exec(body);
      if (conditionalHandler) {
        emitBehavior("action", conditionalHandler[3]!);
        const prefix = clickEvent ? "data-cwl-action" : `data-cwl-on-${eventName}-action`;
        emitOnce(` ${prefix}-true="${conditionalHandler[2]!.replace(/"/g, "")}"`);
        emitOnce(` ${prefix}-state="${conditionalHandler[1]!.replace(/"/g, "")}:false"`);
      } else if (!call && dispatchCall) {
        emitBehavior("action", dispatchCall[2]!);
      } else if (call && handlerNavTargets[call[2]!] && !call[3]!.trim()) {
        emitBehavior("nav", handlerNavTargets[call[2]!]!);
      } else if (call && handlerToggleTargets[call[2]!] && !call[3]!.trim()) {
        emitBehavior("toggle", handlerToggleTargets[call[2]!]!);
      } else if (call) {
        const actionName = call[2]!.replace(/"/g, "");
        if (clickEvent) {
          emitOnce(` data-cwl-action="${actionName}"`);
          if (call[3]!.trim()) {
            emitOnce(
              ` data-cwl-action-args="${call[3]!.trim().replace(/"/g, "&quot;")}"`,
            );
          }
        } else {
          emitOnce(` data-cwl-on-${eventName}="action:${actionName}"`);
          if (call[3]!.trim()) {
            emitOnce(
              ` data-cwl-on-${eventName}-args="${call[3]!.trim().replace(/"/g, "&quot;")}"`,
            );
          }
        }
      } else if (directHandler && handlerNavTargets[directHandler[1]!]) {
        emitBehavior("nav", handlerNavTargets[directHandler[1]!]!);
      } else if (directHandler && handlerToggleTargets[directHandler[1]!]) {
        emitBehavior("toggle", handlerToggleTargets[directHandler[1]!]!);
      } else if (directHandler) {
        emitBehavior("action", directHandler[1]!);
      } else if (removeRowAssign) {
        emitBehavior("action", "removeRow");
      } else if (randomAssign) {
        const prop = randomAssign[1]!;
        emitBehavior(
          "action",
          `generate${prop.charAt(0).toUpperCase()}${prop.slice(1)}`,
        );
      } else if (setString) {
        emitBehavior("set", `${setString[1]!}:${setString[3]!}`);
      } else if (setBool) {
        emitBehavior("toggle", `${setBool[1]!}:${setBool[2]!}`);
      } else if (setNull) {
        emitBehavior("set", `${setNull[1]!}:`);
      } else if (flipBool && flipBool[1] === flipBool[2]) {
        emitBehavior("toggle", `${flipBool[1]!}:flip`);
      }
    }
    i = j;
    attrRe.lastIndex = j;
  }
  out += html.slice(i);
  // A control with an explicit navigation target must have exactly one owner.
  // Remove legacy/backfill behavior attrs that otherwise compete with the
  // capture-phase data-cwl-nav router.
  return out.replace(/<(?:button|a)\b[^>]*>/gi, (tag) => {
    let normalized = tag;
    if (/\sdata-cwl-nav="/i.test(normalized)) {
      normalized = normalized
        .replace(/\s+data-cwl-action="[^"]*"/gi, "")
        .replace(/\s+data-cwl-action-args="[^"]*"/gi, "")
        .replace(/\s+data-cwl-action-true="[^"]*"/gi, "")
        .replace(/\s+data-cwl-action-state="[^"]*"/gi, "")
        .replace(/\s+data-cwl-set="href:[^"]*"/gi, "")
        .replace(/\s+data-action="[^"]*"/gi, "");
    }
    // Runtime-only labels can disappear when an interp/if is lifted. Preserve
    // an accessible semantic label directly from the converted action.
    if (
      /^<button\b/i.test(normalized) &&
      !/\s(?:aria-label|title)=/i.test(normalized)
    ) {
      const action = /\sdata-cwl-action="([^"]+)"/i.exec(normalized)?.[1];
      if (action) {
        const words = action
          .replace(/^(?:handle|on)(?=[A-Z])/, "")
          .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
          .replace(/[-_]+/g, " ")
          .trim();
        const label = words ? words[0]!.toUpperCase() + words.slice(1) : "";
        if (label) {
          normalized = normalized.replace(/>$/, ` aria-label="${label.replace(/"/g, "&quot;")}">`);
        }
      }
    }
    return normalized;
  });
}

/**
 * Preserve safe dynamic native attributes as CWL bindings. These expressions
 * are evaluated against the same bounded runtime context used by interp/if
 * bindings; unsupported dynamic attributes remain honest conversion holes.
 */
export function rewriteSvelteDynamicAttributes(html: string): string {
  const supported = new Set(["title", "aria-label", "disabled", "value", "placeholder"]);
  let out = "";
  let i = 0;
  const attrRe = /\s+([a-zA-Z_:][\w:.-]*)\s*=\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(html)) !== null) {
    const name = m[1]!.toLowerCase();
    if (!supported.has(name)) continue;
    out += html.slice(i, m.index);
    let depth = 0;
    let j = m.index + m[0].length - 1;
    let quote: '"' | "'" | "`" | null = null;
    for (; j < html.length; j++) {
      const ch = html[j]!;
      if (quote !== null) {
        if (ch === "\\") {
          j++;
          continue;
        }
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        quote = ch;
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    const expr = html.slice(m.index + m[0].length, j - 1).trim();
    if (expr && expr.length <= 240) {
      out += ` data-cwl-attr-${name}="${expr
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}"`;
    }
    i = j;
    attrRe.lastIndex = j;
  }
  out += html.slice(i);
  return out;
}

/**
 * Remove leftover Svelte self-close tails after shell substitution
 * (e.g. ` true}` + `/>` from `on:select={() => x = true}`).
 */
export function scrubStructuralMarkupArtifacts(html: string): string {
  let s = html;
  // Full shell element followed by orphan prop/event tail + `/>`
  s = s.replace(
    /(<(?:nav|div)\b[^>]*\b(?:cwl-(?:nav|wizard|widget|modal|map|chart)-shell|data-cwl-(?:nav|wizard|widget|modal|map|chart)-shell)\b[^>]*>\s*<\/(?:nav|div)>)\s*[^<]*?\}\s*\/>/gi,
    "$1",
  );
  // Standalone orphan tails (already-hydrated shells, partial prior lifts)
  s = s.replace(/\s+(?:true|false)\}\s*\/>/g, "");
  s = s.replace(/\s*\([^)]*?=\s*(?:true|false)\)\}\s*\/>/g, "");
  s = s.replace(/\s+[A-Za-z_][\w.]*\s*=\s*(?:true|false)\}\s*\/>/g, "");
  // G9906 — residual attribute / directive junk
  s = s.replace(/\bclass="([^"]*)"\}/g, 'class="$1"');
  s = s.replace(/\bclass='([^']*)'\}/g, "class='$1'");
  s = s.replace(/\s+on:[a-zA-Z][\w|:.]*=(?=["'\s/>]|$)/g, "");
  s = s.replace(/\s+on:[a-zA-Z][\w|:]*="[^"]*"/g, "");
  s = s.replace(/\s+on:[a-zA-Z][\w|:]*='[^']*'/g, "");
  s = s.replace(/\bform\}>/g, "form>");
  s = s.replace(/\)\}>/g, ">");
  s = s.replace(/"\}(?=[\s>])/g, '"');
  // Broken SVG open tags like `</modules/inventory d="…">`, `</login fill="…">`.
  // Use RegExp ctor — a `/<\/?\/…>/` literal can be misread and match normal `</p>` closes.
  s = s.replace(
    new RegExp(
      "</[a-z][\\w/-]*\\s+((?:d|fill|stroke|stroke-width|stroke-linecap|stroke-linejoin|fill-rule|clip-rule|transform|opacity)=)",
      "gi",
    ),
    "<path $1",
  );
  // G9911 — broken SVG closes like `<//modules/inventory>` / `<//dashboard>` only (two slashes).
  s = s.replace(new RegExp("<//[a-z][\\w/-]*>", "gi"), "</path>");
  // Residual Svelte event attrs without `=` (e.g. on:click|stopPropagation)
  s = s.replace(/\s+on:[a-zA-Z][\w|:.]*(?=[\s/>])/g, "");
  // G9914 — residual Svelte directives left in static HTML (do not strip <script>/<style>)
  s = s.replace(/<svelte:head>[\s\S]*?<\/svelte:head>/gi, "");
  s = s.replace(/<svelte:window\b[^>]*?\/>/gi, "");
  s = s.replace(/<svelte:window\b[\s\S]*?<\/svelte:window>/gi, "");
  s = s.replace(/<svelte:body\b[^>]*?\/>/gi, "");
  s = s.replace(/<svelte:body\b[\s\S]*?<\/svelte:body>/gi, "");
  s = s.replace(/<svelte:document\b[^>]*?\/>/gi, "");
  s = s.replace(/<svelte:document\b[\s\S]*?<\/svelte:document>/gi, "");
  // Literal `\r` / `\n` sequences left in markup text (poisoned CWL round-trip)
  s = s.replace(/\\r\\n/g, "\n");
  s = s.replace(/\\r/g, "");
  s = s.replace(/\\n/g, "\n");
  // Real CR from Windows Svelte sources
  s = s.replace(/\r\n/g, "\n");
  s = s.replace(/\r/g, "\n");
  // Residual JS template-literal fragments after naive `{…}` strip (e.g. `$`}` from
  // `{fullName || `${first} ${last}`}` when the first `}` closed early).
  s = s.replace(/\$`\}/g, "");
  s = s.replace(/\$\{[^}]*\}/g, "");
  // Residual Svelte class:directive (e.g. class:open) left after attr scrub
  s = s.replace(/\s+class:[a-zA-Z_][\w-]*(?=[\s/>])/g, "");
  // Mojibake after ← (e.g. ←)
  s = s.replace(/←[\u0080-\u009F\uFFFD\u0090]+/g, "←");
  // G9920 — orphan `}` / handler tails after closed shell divs
  s = s.replace(/(<\/(?:div|nav)>)\s*[^<\n]*?\}\s*\/>/g, "$1");
  s = s.replace(/(<\/(?:div|nav)>)\s*\}/g, "$1");
  // Generated CWL/static exports should be diff-clean even when source markup
  // contains whitespace-only indentation lines or trailing spaces.
  s = s.replace(/[ \t]+$/gm, "");
  return s;
}

export interface LiftStructuralSvelteOptions {
  readonly loadBools?: Readonly<Record<string, boolean>>;
  /** When true (default for convert-site), merge {@link DEFAULT_SHOWCASE_LOAD_BOOLS}. */
  readonly applyShowcaseLoadBools?: boolean;
  /**
   * Compile supported dynamic constructs to CWL runtime bindings instead of
   * reporting them as incomplete conversion holes. Unsupported components
   * remain honest holes.
   */
  readonly promoteRuntimeBindings?: boolean;
  readonly passthroughComponents?: ReadonlySet<string>;
  /** Basename → absolute `.svelte` path for static inlining. */
  readonly componentSources?: ReadonlyMap<string, string>;
  /** Names eligible for static inline when liftMode is static. */
  readonly staticInlineComponents?: ReadonlySet<string>;
  /**
   * Names eligible for structural inline (holes allowed) — used for coverage-map
   * panels so original CSS classes exist in the DOM (D6442).
   */
  readonly structuralInlineComponents?: ReadonlySet<string>;
  /**
   * Extra scalar values (component props resolved at the call site) merged over
   * script-extracted scalars — settles `{title}` / `{@html content}` in lifts.
   */
  readonly scalarOverrides?: Readonly<Record<string, string | number | boolean>>;
  readonly modalShellComponents?: ReadonlySet<string>;
  readonly mapShellComponents?: ReadonlySet<string>;
  readonly chartShellComponents?: ReadonlySet<string>;
  readonly navShellComponents?: ReadonlySet<string>;
  readonly wizardShellComponents?: ReadonlySet<string>;
  readonly widgetShellComponents?: ReadonlySet<string>;
}

const RUNTIME_BINDING_REASONS = new Map<string, string>([
  [HOLE_INTERP, "interp"],
  [HOLE_IF, "if"],
  [HOLE_EACH, "each"],
]);

/**
 * Reclassify dynamic Svelte constructs supported by the CWL client runtime.
 * A runtime binding is complete conversion work, not an unresolved hole.
 */
export function promoteSvelteHolesToRuntimeBindings(html: string): {
  readonly html: string;
  readonly promoted: number;
} {
  let promoted = 0;
  const out = html.replace(
    /\sdata-cwl-hole="(legacy:markup-lift-svelte-(?:interp|if|each))"/g,
    (full, reason: string) => {
      const kind = RUNTIME_BINDING_REASONS.get(reason);
      if (!kind) return full;
      promoted += 1;
      return ` data-cwl-bind="${kind}"`;
    },
  );
  return { html: out, promoted };
}

function holeMarker(reason: string, detail: string, inner = ""): string {
  const safeDetail = detail.replace(/"/g, "'").slice(0, 200);
  if (inner.trim().length > 0) {
    return `<div data-cwl-hole="${reason}" data-cwl-hole-detail="${safeDetail}">${inner}</div>`;
  }
  return `<span data-cwl-hole="${reason}" data-cwl-hole-detail="${safeDetail}"></span>`;
}

/**
 * Each-hole that keeps the raw row template (bindings intact) so the client can
 * render one node per live array item — turns a dead skeleton into real rows.
 * The visible `inner` stays as an idle skeleton until hydrate replaces it.
 */
function eachHoleMarker(
  header: string,
  rawRowTemplate: string,
  inner: string,
  itemName: string | null,
): string {
  const safeDetail = header.replace(/"/g, "'").slice(0, 200);
  // Only templates with resolvable `{item.field}` bindings are worth carrying.
  const canRender =
    itemName !== null &&
    new RegExp(`\\{\\s*${itemName}(\\.|\\b)`).test(rawRowTemplate) &&
    rawRowTemplate.length < 8000;
  const attrs = canRender
    ? ` data-cwl-each-item="${itemName}" data-cwl-each-tpl="${encodeURIComponent(
        rawRowTemplate,
      )}"`
    : "";
  if (inner.trim().length > 0) {
    return `<div data-cwl-hole="${HOLE_EACH}" data-cwl-hole-detail="${safeDetail}"${attrs}>${inner}</div>`;
  }
  return `<div data-cwl-hole="${HOLE_EACH}" data-cwl-hole-detail="${safeDetail}"${attrs}></div>`;
}

function pushHole(holes: SvelteMarkupLiftHole[], reason: string, detail: string): void {
  if (!holes.some((h) => h.reason === reason && h.detail === detail)) {
    holes.push({ reason, detail });
  }
}

/** Remove `{...}` mustaches with balanced braces (handles nested quotes). */
function stripBalancedMustaches(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i++) {
    if (value[i] !== "{") {
      out += value[i];
      continue;
    }
    let depth = 0;
    let j = i;
    for (; j < value.length; j++) {
      if (value[j] === "{") depth++;
      else if (value[j] === "}") {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    i = j - 1;
  }
  return out.replace(/\s+/g, " ").trim();
}

/** Strip Svelte script / style / head blocks. */
export function stripSvelteNonMarkup(source: string): string {
  return source
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svelte:head>[\s\S]*?<\/svelte:head>/gi, "")
    .replace(/<svelte:window\b[^>]*?\/>/gi, "")
    .replace(/<svelte:window\b[\s\S]*?<\/svelte:window>/gi, "")
    .replace(/<svelte:body\b[^>]*?\/>/gi, "")
    .replace(/<svelte:body\b[\s\S]*?<\/svelte:body>/gi, "")
    .replace(/<svelte:document\b[^>]*?\/>/gi, "")
    .replace(/<svelte:document\b[\s\S]*?<\/svelte:document>/gi, "");
}

/**
 * Index `.svelte` component files under a project `src/` tree by basename
 * (without extension). Route `+page.svelte` / `+layout.svelte` are skipped.
 */
export function indexSvelteComponentSources(projectSrcRoot: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(projectSrcRoot)) return map;
  const walk = (dir: string) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".svelte-kit") continue;
        walk(p);
        continue;
      }
      if (!e.name.endsWith(".svelte")) continue;
      if (e.name.startsWith("+")) continue;
      const name = basename(e.name, ".svelte");
      if (!map.has(name)) map.set(name, p);
    }
  };
  walk(projectSrcRoot);
  return map;
}

interface SvelteBlockMatch {
  readonly kind: "if" | "each";
  readonly start: number;
  readonly end: number;
  readonly header: string;
  readonly trueBody: string;
  readonly elseBody: string | null;
  /** Raw `{:else}` / `{:else if …}` chain through end of last branch (before `{/if}`). */
  readonly elseChainRaw: string | null;
}

/**
 * When an `{#if}` is false, prefer rewriting the full else-if chain so later
 * passes can resolve tabs/empty guards (do not keep only the final `{:else}`).
 */
function idleBranchFromElseChain(elseChainRaw: string | null, elseBody: string | null): string {
  const chain = (elseChainRaw ?? "").trimStart();
  if (chain) {
    if (/^\{:else\}/i.test(chain)) {
      return chain.replace(/^\{:else\}/i, "");
    }
    if (/^\{:else\s+if\b/i.test(chain)) {
      // elseChainRaw excludes the closing `{/if}` — re-wrap so expand can re-enter.
      return `${chain.replace(/^\{:else\s+if\b/i, "{#if")}{/if}`;
    }
  }
  return elseBody ?? "";
}

/**
 * Split an `{:else if …}` / `{:else}` chain (depth-0 markers only) into
 * ordered branches. `header` is null for the terminal `{:else}`.
 */
function parseElseChain(
  elseChainRaw: string | null,
): Array<{ header: string | null; body: string }> {
  const chain = elseChainRaw ?? "";
  const branches: Array<{ header: string | null; body: string }> = [];
  let i = 0;
  let depth = 0;
  let current: { header: string | null; bodyStart: number } | null = null;
  const flush = (end: number) => {
    if (current !== null) {
      branches.push({ header: current.header, body: chain.slice(current.bodyStart, end) });
      current = null;
    }
  };
  while (i < chain.length) {
    if (chain[i] !== "{") {
      i++;
      continue;
    }
    const slice = chain.slice(i);
    if (/^\{#(if|each)\b/i.test(slice)) {
      depth++;
      i += 2;
      continue;
    }
    if (/^\{\/(if|each)\}/i.test(slice)) {
      depth--;
      i += 2;
      continue;
    }
    if (depth === 0 && /^\{:else\s+if\b/i.test(slice)) {
      flush(i);
      let j = i + 1;
      let d = 1;
      for (; j < chain.length; j++) {
        if (chain[j] === "{") d++;
        else if (chain[j] === "}") {
          d--;
          if (d === 0) {
            j++;
            break;
          }
        }
      }
      const header = chain.slice(i, j).replace(/^\{:else\s+if\b/i, "").replace(/\}$/, "").trim();
      current = { header, bodyStart: j };
      i = j;
      continue;
    }
    if (depth === 0 && /^\{:else\}/i.test(slice)) {
      flush(i);
      current = { header: null, bodyStart: i + "{:else}".length };
      i += "{:else}".length;
      continue;
    }
    i++;
  }
  flush(chain.length);
  return branches;
}

/** Find the next `{#if …}` or `{#each …}` block with balanced nesting. */
export function findNextSvelteBlock(source: string, from = 0): SvelteBlockMatch | null {
  const openRe = /\{#(if|each)\b/gi;
  openRe.lastIndex = from;
  const open = openRe.exec(source);
  if (!open || open.index === undefined) return null;
  const kind = open[1]!.toLowerCase() as "if" | "each";
  const start = open.index;
  // Header ends at first `}` at depth 1 from the opening `{`
  let i = start + 1;
  let depth = 1;
  for (; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  const header = source.slice(start + 2 + kind.length, i - 1).trim();
  const bodyStart = i;
  /** Index where the true branch ends (start of first `{:else}` / `{:else if}`). */
  let elseMarkerAt: number | null = null;
  /** Index where the first else branch body starts (after that else header). */
  let elseBodyStart: number | null = null;
  depth = 1;
  while (i < source.length) {
    if (source[i] !== "{") {
      i++;
      continue;
    }
    const slice = source.slice(i);
    if (/^\{#(if|each)\b/i.test(slice)) {
      depth++;
      i += 2;
      continue;
    }
    if (/^\{\/(if|each)\}/i.test(slice)) {
      depth--;
      if (depth === 0) {
        const trueBody =
          elseMarkerAt === null ? source.slice(bodyStart, i) : source.slice(bodyStart, elseMarkerAt);
        const elseBody =
          elseBodyStart === null ? null : source.slice(elseBodyStart, i);
        const elseChainRaw =
          elseMarkerAt === null ? null : source.slice(elseMarkerAt, i);
        const close = slice.match(/^\{\/(if|each)\}/i)!;
        return {
          kind,
          start,
          end: i + close[0].length,
          header,
          trueBody,
          elseBody,
          elseChainRaw,
        };
      }
      i += 2;
      continue;
    }
    if (kind === "if" && depth === 1 && /^\{:else\}/i.test(slice)) {
      if (elseMarkerAt === null) {
        elseMarkerAt = i;
        elseBodyStart = i + "{:else}".length;
      }
      i += "{:else}".length;
      continue;
    }
    if (kind === "if" && depth === 1 && /^\{:else\s+if\b/i.test(slice)) {
      let d = 1;
      let j = i + 1;
      for (; j < source.length; j++) {
        if (source[j] === "{") d++;
        else if (source[j] === "}") {
          d--;
          if (d === 0) {
            j++;
            break;
          }
        }
      }
      if (elseMarkerAt === null) {
        elseMarkerAt = i;
        elseBodyStart = j;
      }
      i = j;
      continue;
    }
    i++;
  }
  return null;
}

function extractScriptBlocks(source: string): string {
  let out = "";
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) out += `\n${m[1] ?? ""}`;
  return out;
}

/**
 * Pull `const`/`let` scalar bindings from Svelte `<script>` (origin initializers).
 * Bools feed loadBools; numbers/strings feed hydrate body (D6448).
 */
export function extractScriptScalarsFromSvelte(source: string): {
  bools: Record<string, boolean>;
  scalars: Record<string, string | number | boolean>;
} {
  const script = extractScriptBlocks(source);
  const bools: Record<string, boolean> = {};
  const scalars: Record<string, string | number | boolean> = {};
  const re =
    /(?:export\s+)?(?:const|let)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::[^=]+)?=\s*(true|false|-?\d+(?:\.\d+)?|'([^']*)'|"([^"]*)")\s*[;\n,]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(script))) {
    const name = m[1]!;
    if (m[2] === "true" || m[2] === "false") {
      bools[name] = m[2] === "true";
      scalars[name] = m[2] === "true";
    } else if (m[3] != null) {
      scalars[name] = m[3];
    } else if (m[4] != null) {
      scalars[name] = m[4];
    } else if (m[2] != null && /^-?\d/.test(m[2])) {
      scalars[name] = Number(m[2]);
    }
  }
  // Static template literals (no interpolation) — help/docs HTML blobs.
  const tplRe =
    /(?:export\s+)?(?:const|let)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::[^=]+)?=\s*`((?:[^`$\\]|\\[\s\S]|\$(?!\{))*)`\s*[;\n,]/g;
  while ((m = tplRe.exec(script))) {
    const name = m[1]!;
    if (!(name in scalars)) scalars[name] = m[2]!;
  }
  // Aliases (`const helpContent = planDocs;`) — copy resolved scalar values.
  const aliasRe =
    /(?:export\s+)?(?:const|let)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::[^=]+)?=\s*([a-zA-Z_$][\w$]*)\s*[;\n]/g;
  while ((m = aliasRe.exec(script))) {
    const name = m[1]!;
    const ref = m[2]!;
    if (!(name in scalars) && ref in scalars) scalars[name] = scalars[ref]!;
    if (!(name in bools) && ref in bools) bools[name] = bools[ref]!;
  }
  return { bools, scalars };
}

/**
 * Parse literal / statically-resolvable props off a PascalCase component tag
 * (`<HelpModal title="Plan Help" content={helpContent} show={showHelpModal}>`)
 * so inlined component lifts can settle prop-driven text (D6443 / help modals).
 */
export function parseComponentTagProps(
  tagText: string,
  pageScalars: Readonly<Record<string, string | number | boolean>>,
  pageBools: Readonly<Record<string, boolean>>,
): { scalars: Record<string, string | number | boolean>; bools: Record<string, boolean> } {
  const scalars: Record<string, string | number | boolean> = {};
  const bools: Record<string, boolean> = {};
  // Quoted literal props: title="Plan Module Help"
  const litRe = /\s([a-zA-Z_][\w-]*)\s*=\s*(['"])([^'"]*)\2/g;
  let m: RegExpExecArray | null;
  while ((m = litRe.exec(tagText))) {
    const name = m[1]!;
    if (name.startsWith("on") || name.includes(":")) continue;
    scalars[name] = m[3]!;
  }
  // Brace props: content={helpContent} / show={true} / count={3}
  const braceRe = /\s([a-zA-Z_][\w-]*)\s*=\s*\{/g;
  while ((m = braceRe.exec(tagText))) {
    const name = m[1]!;
    if (name.startsWith("on") || name.includes(":")) continue;
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let end = -1;
    for (let i = open; i < tagText.length; i++) {
      if (tagText[i] === "{") depth++;
      else if (tagText[i] === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end < 0) continue;
    const expr = tagText.slice(open + 1, end).trim();
    if (expr === "true" || expr === "false") {
      bools[name] = expr === "true";
      scalars[name] = expr === "true";
    } else if (/^-?\d+(?:\.\d+)?$/.test(expr)) {
      scalars[name] = Number(expr);
    } else {
      const strLit = /^(['"])([\s\S]*)\1$/.exec(expr);
      if (strLit) {
        scalars[name] = strLit[2]!;
      } else if (/^[a-zA-Z_$][\w$]*$/.test(expr)) {
        if (Object.prototype.hasOwnProperty.call(pageScalars, expr)) {
          scalars[name] = pageScalars[expr]!;
        }
        if (Object.prototype.hasOwnProperty.call(pageBools, expr)) {
          bools[name] = pageBools[expr]!;
        }
      }
    }
  }
  return { scalars, bools };
}

/**
 * Pull `const name = [ { … }, … ]` object arrays from Svelte `<script>` (origin truth).
 * Used to expand `{#each modules as module}` without inventing rows (D6442/D6443).
 */
export function extractConstObjectArraysFromSvelte(
  source: string,
): Readonly<Record<string, ReadonlyArray<Readonly<Record<string, unknown>>>>> {
  const script = extractScriptBlocks(source);
  /** @type {Record<string, Record<string, unknown>[]>} */
  const out: Record<string, Record<string, unknown>[]> = {};
  const startRe = /(?:export\s+)?(?:const|let)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::[^=]+)?=\s*\[/g;
  let m: RegExpExecArray | null;
  while ((m = startRe.exec(script))) {
    const name = m[1]!;
    const openIdx = (m.index ?? 0) + m[0].length - 1;
    let depth = 0;
    let i = openIdx;
    for (; i < script.length; i++) {
      const ch = script[i];
      if (ch === "[") depth++;
      else if (ch === "]") {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    const lit = script.slice(openIdx, i);
    const rows = parseLooseObjectArrayLiteral(lit);
    if (rows.length > 0) out[name] = rows;
  }
  return out;
}

/**
 * Pull `const NAME = { key: 'Label', … }` flat string maps from Svelte `<script>`.
 * Settles `{ROLE_NAMES[role]}` style interps after string-each substitution.
 */
export function extractConstStringMapsFromSvelte(
  source: string,
): Readonly<Record<string, Readonly<Record<string, string>>>> {
  const script = extractScriptBlocks(source);
  const out: Record<string, Record<string, string>> = {};
  const re = /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(script))) {
    const pairs = [...m[2]!.matchAll(/(['"]?)([\w-]+)\1\s*:\s*(['"])([^'"]*)\3/g)];
    if (pairs.length > 0) {
      out[m[1]!] = Object.fromEntries(pairs.map((p) => [p[2]!, p[4]!]));
    }
  }
  return out;
}

/**
 * Pull `const name = ['a', 'b', …]` string arrays from Svelte `<script>` (origin truth).
 * Expands `{#each statuses as status}` filter dropdowns without leaving holes.
 */
export function extractConstStringArraysFromSvelte(
  source: string,
): Readonly<Record<string, ReadonlyArray<string>>> {
  const script = extractScriptBlocks(source);
  const out: Record<string, string[]> = {};
  const re =
    /(?:export\s+)?(?:const|let)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::[^=]+)?=\s*\[((?:\s*(?:'[^']*'|"[^"]*")\s*,?)+)\s*\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(script))) {
    const items = [...m[2]!.matchAll(/'([^']*)'|"([^"]*)"/g)].map((x) => x[1] ?? x[2] ?? "");
    if (items.length > 0) out[m[1]!] = items;
  }
  return out;
}

/**
 * Best-effort TS/JS object-array literal → plain objects (strings, string[], bools).
 * @param {string} lit including surrounding `[` `]`
 */
function parseLooseObjectArrayLiteral(lit: string): Record<string, unknown>[] {
  /** @type {Record<string, unknown>[]} */
  const rows: Record<string, unknown>[] = [];
  // Split top-level `{...}` objects
  let depth = 0;
  let start = -1;
  for (let i = 0; i < lit.length; i++) {
    const ch = lit[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        const objLit = lit.slice(start, i + 1);
        const row = parseLooseObjectLiteral(objLit);
        if (Object.keys(row).length > 0) rows.push(row);
        start = -1;
      }
    }
  }
  return rows;
}

function parseLooseObjectLiteral(objLit: string): Record<string, unknown> {
  /** @type {Record<string, unknown>} */
  const row: Record<string, unknown> = {};
  // id: 'plan' | name: "…" | status: 'active' | features: ['a', 'b'] | path: '/x'
  const fieldRe =
    /(?:^|[,{\s])([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(?:'((?:\\'|[^'])*)'|"((?:\\"|[^"])*)"|(\[[^\]]*\])|(true|false)|([0-9]+))/g;
  let m: RegExpExecArray | null;
  while ((m = fieldRe.exec(objLit))) {
    const key = m[1]!;
    if (m[2] != null) row[key] = m[2].replace(/\\'/g, "'");
    else if (m[3] != null) row[key] = m[3].replace(/\\"/g, '"');
    else if (m[4] != null) {
      const arrLit = m[4];
      const items: string[] = [];
      const itemRe = /'((?:\\'|[^'])*)'|"((?:\\"|[^"])*)"/g;
      let im: RegExpExecArray | null;
      while ((im = itemRe.exec(arrLit))) items.push((im[1] ?? im[2] ?? "").replace(/\\'/g, "'"));
      row[key] = items;
    } else if (m[5] != null) row[key] = m[5] === "true";
    else if (m[6] != null) row[key] = Number(m[6]);
  }
  return row;
}

function expandEachTemplateForRow(
  template: string,
  itemName: string,
  row: Readonly<Record<string, unknown>>,
): string {
  let t = template;
  // Nested `{#each item.features as feature}…{/each}`
  const nestedEach = new RegExp(
    `\\{#each\\s+${itemName}\\.([a-zA-Z_][a-zA-Z0-9_]*)\\s+as\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\}([\\s\\S]*?)\\{\\/each\\}`,
    "g",
  );
  t = t.replace(nestedEach, (_all, prop: string, sub: string, body: string) => {
    const arr = row[prop];
    if (!Array.isArray(arr)) return "";
    return arr
      .map((v) => body.replace(new RegExp(`\\{${sub}\\}`, "g"), String(v)))
      .join("");
  });
  // `{#if item.status === 'active'}…{:else}…{/if}`
  const ifEq = new RegExp(
    `\\{#if\\s+${itemName}\\.([a-zA-Z_][a-zA-Z0-9_]*)\\s*===\\s*'([^']*)'\\}([\\s\\S]*?)(?:\\{:else\\}([\\s\\S]*?))?\\{\\/if\\}`,
    "g",
  );
  t = t.replace(ifEq, (_a, prop: string, want: string, yes: string, no: string) =>
    String(row[prop] ?? "") === want ? yes : (no ?? ""),
  );
  // class:active={item.status === 'active'} → merge into class="module-card active"
  t = t.replace(
    new RegExp(
      `class:(active|coming-soon)=\\{${itemName}\\.status\\s*===\\s*'(active|coming-soon)'\\}`,
      "g",
    ),
    (_a, cls: string, want: string) => {
      if (String(row.status ?? "") !== want) return "";
      // Prefer merging into an existing class="…" on the same opening tag later.
      return ` data-cwl-class-extra="${cls}"`;
    },
  );
  t = t.replace(
    /class="([^"]*)"([^>]*?)\sdata-cwl-class-extra="([^"]+)"/g,
    (_a, cls: string, rest: string, extra: string) =>
      `class="${cls} ${extra}"${rest}`,
  );
  t = t.replace(/\sdata-cwl-class-extra="[^"]+"/g, "");
  // {item.field} and aria-label="Open {item.name}. {item.description}"
  t = t.replace(new RegExp(`\\{${itemName}\\.([a-zA-Z_][a-zA-Z0-9_]*)\\}`, "g"), (_a, prop: string) => {
    const v = row[prop];
    return v == null ? "" : String(v);
  });
  // Event expressions reference row values without Svelte interpolation braces
  // (`selectedTopic = topic.id`, `goto(w.path)`). Resolve primitive values before
  // the event rewriter so they become concrete set/nav descriptors.
  for (const [prop, value] of Object.entries(row)) {
    if (!["string", "number", "boolean"].includes(typeof value)) continue;
    t = t.replace(
      new RegExp(`\\b${itemName}\\.${prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"),
      JSON.stringify(value),
    );
  }
  // Quote bare URL attrs expanded from {item.href} so scrub does not eat `href=/…`.
  t = t.replace(
    /\s(href|src|action|data-cwl-nav)\s*=\s*(\/(?:[^>\s"']*))(?=[\s>])/gi,
    (_m, attr: string, url: string) => ` ${attr}="${url.replace(/"/g, "")}"`,
  );
  // Resolve row-local handlers after row values are known. This includes
  // catalog-driven wizard navigation whose source first assigns a local `url`.
  t = rewriteSvelteEventAttributes(t);
  const rowPath =
    typeof row.modulePath === "string" && row.modulePath
      ? row.modulePath
      : typeof row.path === "string"
        ? row.path
        : "";
  if (rowPath && row.id) {
    const wizardPath = `${rowPath}${rowPath.includes("?") ? "&" : "?"}wizard=${encodeURIComponent(String(row.id))}`;
    if (row.openHere === true) {
      t = t.replace(
        /\sdata-cwl-action="(?:goto|if)"(?:\sdata-cwl-action-args="[^"]*")?/g,
        ` data-cwl-action="open-${String(row.id).replace(/"/g, "")}"`,
      );
    } else {
      t = t.replace(
        /\sdata-cwl-action="goto"(?:\sdata-cwl-action-args="[^"]*")?/g,
        ` data-cwl-nav="${wizardPath.replace(/"/g, "")}"`,
      );
    }
  } else if (rowPath) {
    t = t.replace(
      /\sdata-cwl-action="[^"]+"(?:\sdata-cwl-action-args="[^"]*")?/g,
      ` data-cwl-nav="${String(rowPath).replace(/"/g, "")}"`,
    );
  }
  return t;
}

const BUSY_TOGGLE_IDENT_RE =
  /^(isSigningIn|isSaving|saving|loading[A-Z]\w*|isLoading|loading)$/i;

/** Empty-state guards — keep list/table chrome; stamp the empty branch closed for hydrate. */
function isEmptyStateLengthGuard(header: string): boolean {
  return /\.length\s*===\s*0\b/.test(header) || /\.length\s*==\s*0\b/.test(header);
}

/**
 * Compound `!isLoading && …` / `!loading && …` — when busy is settled false, keep the
 * idle content (hardware inventory table). Do not stampClosed the whole section.
 */
function resolveNegatedBusyCompound(
  header: string,
  loadBools: Readonly<Record<string, boolean>>,
): boolean | null {
  const m = /^!\s*(isLoading|loading)\b/.exec(header.trim());
  if (!m) return null;
  const key = m[1]!;
  if (!Object.prototype.hasOwnProperty.call(loadBools, key)) return null;
  // !isLoading when isLoading===false → show true branch
  return loadBools[key] !== true;
}

function expandControlFlow(
  source: string,
  loadBools: Readonly<Record<string, boolean>>,
  holes: SvelteMarkupLiftHole[],
  staticArrays: Readonly<Record<string, ReadonlyArray<Readonly<Record<string, unknown>>>>> = {},
  scalarValues: Readonly<Record<string, string | number | boolean>> = {},
  stringArrays: Readonly<Record<string, ReadonlyArray<string>>> = {},
): string {
  let s = source;
  let guard = 0;
  while (guard++ < 500) {
    const block = findNextSvelteBlock(s, 0);
    if (block === null) break;
    let replacement = "";
    if (block.kind === "each") {
      const lit = /^\[([^\]]+)\]\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(block.header);
      const named =
        /^([a-zA-Z_][a-zA-Z0-9_]*)\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*\([^)]*\))?$/.exec(
          block.header,
        );
      if (lit) {
        const items = lit[1]!.split(",").map((x) => x.trim().replace(/^['"]|['"]$/g, ""));
        const itemName = lit[2]!;
        replacement = items
          .map((item) => block.trueBody.replace(new RegExp(`\\{${itemName}\\}`, "g"), item))
          .join("");
      } else if (named && staticArrays[named[1]!]?.length) {
        // Origin `const modules = […]` — expand rows (D6442/D6443), do not leave empty hole.
        const itemName = named[2]!;
        replacement = staticArrays[named[1]!]!
          .map((row) => expandEachTemplateForRow(block.trueBody, itemName, row))
          .join("\n");
      } else if (named && stringArrays[named[1]!]?.length) {
        // Origin `const statuses = ['open', …]` — expand filter options from script truth.
        const itemName = named[2]!;
        const attrRe = new RegExp(`=\\{${itemName}\\}`, "g");
        const textRe = new RegExp(`\\{${itemName}\\}`, "g");
        const headerIdentRe = new RegExp(`(?<![.\\w'])${itemName}(?![\\w'])`, "g");
        replacement = stringArrays[named[1]!]!
          .map((item) => {
            const quoted = `'${item.replace(/'/g, "\\'")}'`;
            return block.trueBody
              .replace(attrRe, `="${item.replace(/"/g, "&quot;")}"`)
              .replace(textRe, item)
              .replace(/\{[^{}]*\}/g, (mus) => mus.replace(headerIdentRe, quoted));
          })
          .join("");
      } else {
        pushHole(holes, HOLE_EACH, block.header.slice(0, 120));
        const rowTpl = rewriteSvelteEventAttributes(block.trueBody);
        const cleanedInner = rowTpl
          .replace(/\{[a-zA-Z_$][^}]*\}/g, "")
          .replace(/\s+data-cwl-nav="[^"]*"/g, "")
          .trim();
        replacement = eachHoleMarker(block.header, rowTpl, cleanedInner, named?.[2] ?? null);
      }
    } else {
      // if — resolve simple idents and !ident against loadBools (D6443 login form).
      const simple = /^([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(block.header);
      const negated = /^!\s*([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(block.header);
      // Allow an optional data companion (`activeTab === 'overview' && schema`) so
      // tab chains whose first branch carries a load guard still compile into
      // state panels instead of dropping the sibling tabs (voice-telephony D6448).
      const strEq =
        /^([a-zA-Z_][a-zA-Z0-9_]*)\s*===\s*['"]([^'"]*)['"](?:\s*&&\s*!?[a-zA-Z_$][\w.]*)?$/.exec(
          block.header,
        );
      const busyCompound = resolveNegatedBusyCompound(block.header, loadBools);
      const idle = () => idleBranchFromElseChain(block.elseChainRaw, block.elseBody);
      const litCmp =
        /^(['"])([\s\S]*?)\1\s*(===|!==|==|!=)\s*(['"])([\s\S]*?)\4$/.exec(block.header);
      if (/^true$/i.test(block.header)) {
        replacement = block.trueBody;
      } else if (/^false$/i.test(block.header)) {
        replacement = idle();
      } else if (litCmp) {
        // Literal comparison from string-array each substitution — pure origin truth.
        const eq = litCmp[2] === litCmp[5];
        const on = litCmp[3]!.startsWith("!") ? !eq : eq;
        replacement = on ? block.trueBody : idle();
      } else if (busyCompound !== null) {
        replacement = busyCompound
          ? block.trueBody
          : idle() || stampClosedUiChrome(block.trueBody);
      } else if (
        negated &&
        Object.prototype.hasOwnProperty.call(loadBools, negated[1]!)
      ) {
        // `{#if !showPasswordReset}` must show the form when showPasswordReset is false —
        // never stampClosed the trueBody (that hid email/password on management login).
        // When the true branch is visible, still keep the else chrome stamped closed
        // (`Back to Sign In` after passwordResetSent) so toggles can reveal it.
        const on = loadBools[negated[1]!] === true;
        if (!on) {
          const idleHtml = idle();
          replacement =
            block.trueBody +
            (isUiToggleOverlayIfHeader(negated[1]!) && idleHtml.trim().length > 0
              ? stampClosedUiChrome(idleHtml, negated[1]!)
              : "");
        } else {
          replacement = idle();
        }
      } else if (
        simple &&
        Object.prototype.hasOwnProperty.call(loadBools, simple[1]!)
      ) {
        const on = loadBools[simple[1]!] === true;
        if (isUiToggleOverlayIfHeader(block.header) && !on) {
          // Busy/loading toggles: keep else (idle CTA); only stamp the busy branch.
          if (BUSY_TOGGLE_IDENT_RE.test(simple[1]!)) {
            const idleHtml = idle();
            replacement =
              (idleHtml.trim().length > 0 ? idleHtml : "") +
              (block.trueBody.trim().length > 0
                ? stampClosedUiChrome(block.trueBody)
                : "");
          } else {
            // Closed overlay chrome: keep markup hidden in DOM (D6442).
            replacement = stampClosedUiChrome(block.trueBody, simple[1]!);
          }
        } else if (on && isUiToggleOverlayIfHeader(block.header)) {
          // Visible toggle with an else branch — keep the else stamped closed.
          const idleHtml = idle();
          replacement =
            block.trueBody +
            (idleHtml.trim().length > 0 ? stampClosedUiChrome(idleHtml) : "");
        } else if (!on && /^(?:error|success)$/i.test(simple[1]!)) {
          // Error/success banners settle false on first paint — keep Retry chrome.
          const idleHtml = idle();
          replacement =
            (idleHtml.trim().length > 0 ? idleHtml : "") +
            (block.trueBody.trim().length > 0
              ? stampClosedUiChrome(block.trueBody)
              : "");
        } else {
          replacement = on ? block.trueBody : idle();
        }
      } else if (
        strEq &&
        Object.prototype.hasOwnProperty.call(scalarValues, strEq[1]!) &&
        typeof scalarValues[strEq[1]!] === "string"
      ) {
        const ident = strEq[1]!;
        const current = String(scalarValues[ident]);
        const identEq = new RegExp(
          `^${ident}\\s*===\\s*['"]([^'"]*)['"](?:\\s*&&\\s*!?[a-zA-Z_$][\\w.]*)?$`,
        );
        const chainBranches = parseElseChain(block.elseChainRaw);
        const isStateChain =
          chainBranches.length > 0 &&
          chainBranches.every((b) => b.header === null || identEq.test(b.header.trim()));
        const standaloneStatePanel =
          chainBranches.length === 0 && (block.elseChainRaw ?? "").trim() === "";
        if (standaloneStatePanel && current !== strEq[2]) {
          // Standalone `{#if mapView === 'graphs'}` off-state: keep the branch in
          // the DOM as a hidden state panel (monitoring/hardware tab panels) so
          // data-cwl-set toggles reveal it — never drop origin markup.
          const detail = `${ident} === '${strEq[2]!.replace(/'/g, "\\'")}'`;
          replacement = `<div data-cwl-bind="if" data-cwl-hole-detail="${detail.replace(/"/g, "&quot;")}" hidden aria-hidden="true">${block.trueBody}</div>`;
        } else if (isStateChain && chainBranches.some((b) => b.header !== null)) {
          // Scalar-state switcher (help topics, tab chains): keep every branch in
          // the DOM as a state panel. data-cwl-set clicks toggle visibility; the
          // initializer picks the visible branch (origin truth, no dropped docs).
          const all = [{ header: block.header, body: block.trueBody }, ...chainBranches];
          const values = all.map((b) =>
            b.header ? (identEq.exec(b.header.trim())?.[1] ?? "") : null,
          );
          const anyActive = values.some((v) => v === current);
          replacement = all
            .map((b, idx) => {
              const value = values[idx] ?? null;
              const active = value === null ? !anyActive : value === current;
              const detail =
                value === null
                  ? `${ident} === '__fallback'`
                  : `${ident} === '${value.replace(/'/g, "\\'")}'`;
              const fallbackAttr =
                value === null ? ` data-cwl-state-fallback="${ident}"` : "";
              const closed = active ? "" : ` hidden aria-hidden="true"`;
              return `<div data-cwl-bind="if" data-cwl-hole-detail="${detail.replace(/"/g, "&quot;")}"${fallbackAttr}${closed}>${b.body}</div>`;
            })
            .join("");
        } else {
          const on = current === strEq[2];
          if (on) {
            replacement = block.trueBody;
          } else {
            // Off-state tab body (mixed chain, e.g. `{:else if tab === 'all' && …}`):
            // keep the true branch hidden in the DOM so tab clicks reveal origin
            // markup (hardware epc tab / SNMPDevicesPanel) — never drop it.
            const detail = `${ident} === '${strEq[2]!.replace(/'/g, "\\'")}'`;
            replacement =
              `<div data-cwl-bind="if" data-cwl-hole-detail="${detail.replace(/"/g, "&quot;")}" hidden aria-hidden="true">${block.trueBody}</div>` +
              idle();
          }
        }
      } else if (simple && /^(?:error|success)$|Message$/i.test(simple[1]!)) {
        // Toast/banner messages and error/success banners default closed until hydrate.
        replacement =
          (idle().trim().length > 0 ? idle() : "") +
          (block.trueBody.trim().length > 0 ? stampClosedUiChrome(block.trueBody) : "");
      } else if (/^[a-zA-Z_][\w]*\?\.[\w.?[\]]*$/.test(block.header)) {
        // Optional presence (`mapState?.activePlan`) — closed until hydrate (D6448).
        replacement =
          (idle().trim().length > 0 ? idle() : "") +
          (block.trueBody.trim().length > 0 ? stampClosedUiChrome(block.trueBody) : "");
      } else if (
        /^[a-zA-Z_][\w]*\.[a-zA-Z_][\w.]*$/.test(block.header) &&
        !/\.length\b/.test(block.header)
      ) {
        // Nested field presence (`plan.description`) — keep else / stamp true.
        replacement =
          (idle().trim().length > 0 ? idle() : "") +
          (block.trueBody.trim().length > 0 ? stampClosedUiChrome(block.trueBody) : "");
      } else if (isEmptyStateLengthGuard(block.header)) {
        // `{#if items.length === 0}` / sites empty — keep table/list else; stamp empty.
        const idleHtml = idle();
        replacement =
          (idleHtml.trim().length > 0 ? idleHtml : "") +
          (block.trueBody.trim().length > 0 ? stampClosedUiChrome(block.trueBody) : "");
      } else if (isUiToggleOverlayIfHeader(block.header) && simple) {
        // Unknown show* — default closed chrome.
        replacement = stampClosedUiChrome(block.trueBody, simple[1]!);
      } else if (isUiToggleOverlayIfHeader(block.header) && negated) {
        // Unknown !show* — assume show is false → main content visible.
        replacement = block.trueBody;
      } else if (isUiToggleOverlayIfHeader(block.header)) {
        // Compound toggles (`showFilters && !isDeployMode`) — keep closed chrome (D6442);
        // stamp the first show*/is*Open-style ident so runtime toggles can find it.
        const compoundIdent =
          /\b(show[A-Z][A-Za-z0-9_]*|is[A-Z][A-Za-z0-9_]*(?:Open|Visible|DeployMode|PlanMode))\b/.exec(
            block.header,
          );
        replacement = stampClosedUiChrome(block.trueBody, compoundIdent?.[1]);
      } else if (/^[a-zA-Z_][\w]*\.length\s*>\s*0$/.test(block.header)) {
        // Prop arrays (`wizards.length > 0`) — keep trigger chrome; rows bind later (D6442).
        replacement = block.trueBody;
      } else {
        pushHole(holes, HOLE_IF, block.header.slice(0, 120));
        // Keep the else chain alive: re-wrapped `{:else if}` / `{:else}` bodies
        // re-enter this loop, so runtime-bound branches never swallow the rest
        // of the chain (monitoring epc list dropped behind epcLoadError hole).
        replacement =
          holeMarker(HOLE_IF, block.header.slice(0, 120), block.trueBody.trim()) + idle();
      }
    }
    s = s.slice(0, block.start) + replacement + s.slice(block.end);
  }
  // Strip any leftover control tokens (orphans)
  if (/\{[#/@:]/.test(s)) {
    pushHole(holes, HOLE_RESIDUAL, "residual svelte control tokens stripped");
    s = s.replace(/\{[#/@:][^}]*\}/g, "");
  }
  return s;
}

function tryInlineStaticComponent(
  name: string,
  componentSources: ReadonlyMap<string, string> | undefined,
  staticInline: ReadonlySet<string>,
  loadBools: Readonly<Record<string, boolean>>,
  passthrough: ReadonlySet<string>,
  depth: number,
): string | null {
  if (depth > 3) return null;
  if (!staticInline.has(name) || !componentSources?.has(name)) return null;
  const path = componentSources.get(name)!;
  try {
    if (!existsSync(path) || !statSync(path).isFile()) return null;
    const raw = readFileSync(path, "utf8");
    const lifted = liftStructuralSveltePageHtml(raw, {
      loadBools,
      applyShowcaseLoadBools: false,
      passthroughComponents: passthrough,
      componentSources,
      staticInlineComponents: staticInline,
      _inlineDepth: depth + 1,
    } as LiftStructuralSvelteOptions & { _inlineDepth?: number });
    if (lifted === null) return null;
    if (lifted.liftMode !== "static") return null;
    if (lifted.holes.length > 0) return null;
    return lifted.html;
  } catch {
    return null;
  }
}

/**
 * Inline panel markup allowing holes; wrap closed with hidden (D6442 / coverage-map).
 */
function tryInlineStructuralComponent(
  name: string,
  componentSources: ReadonlyMap<string, string> | undefined,
  structuralInline: ReadonlySet<string>,
  opts: LiftStructuralSvelteOptions & { _inlineDepth?: number },
  loadBools: Readonly<Record<string, boolean>>,
  passthrough: ReadonlySet<string>,
  depth: number,
  propScalars: Readonly<Record<string, string | number | boolean>> = {},
  propBools: Readonly<Record<string, boolean>> = {},
  gateKey?: string,
): string | null {
  if (depth > 6) return null;
  if (!structuralInline.has(name) || !componentSources?.has(name)) return null;
  const path = componentSources.get(name)!;
  try {
    if (!existsSync(path) || !statSync(path).isFile()) return null;
    const raw = readFileSync(path, "utf8");
    // Open `{#if show}` chrome so closed-source panels still lift into the DOM.
    const inlineBools = { ...loadBools, ...propBools, show: true };
    // The component's own `.svelte` imports are source truth for its children
    // (HSSManagementModal → SubscriberList). Charts/maps stay runtime islands.
    const nestedInline = new Set(structuralInline);
    const impRe = /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"][^'"]+\.svelte['"]/g;
    let im: RegExpExecArray | null;
    while ((im = impRe.exec(raw))) {
      const child = im[1]!;
      if (!componentSources.has(child)) continue;
      if (/(?:Chart|Map)$/.test(child)) continue;
      nestedInline.add(child);
    }
    const lifted = liftStructuralSveltePageHtml(raw, {
      ...opts,
      loadBools: inlineBools,
      scalarOverrides: { ...(opts.scalarOverrides ?? {}), ...propScalars },
      applyShowcaseLoadBools: false,
      passthroughComponents: passthrough,
      componentSources,
      structuralInlineComponents: nestedInline,
      _inlineDepth: depth + 1,
    } as LiftStructuralSvelteOptions & { _inlineDepth?: number });
    if (lifted === null || typeof lifted.html !== "string" || lifted.html.trim().length < 8) {
      return null;
    }
    const safe = name.replace(/"/g, "'");
    // Only stamp closed when the component itself gates chrome with `show`
    // (AddSiteModal, HelpModal, …). Nested panels like FilterPanel sit under a
    // page-level `{#if showFilters}` that already stamps the overlay — double
    // `hidden` would leave an empty open modal (D6443).
    const selfGated =
      /\bexport\s+let\s+show\b/.test(raw) || /\{#if\s+show(?:\s|&&|\})/.test(raw);
    // Self-gated components often compile to MULTIPLE roots (BaseWizard shell +
    // leftover `<div slot="content">` / `<div slot="footer">` siblings). Stamping
    // only the first root left wizard step bodies painted on plan/deploy pages.
    // Wrap the entire lifted HTML in one closed shell keyed to the page gate.
    let body = lifted.html;
    if (selfGated) {
      const key =
        gateKey && gateKey.length > 0
          ? gateKey
          : `show${name.replace(/[^A-Za-z0-9_]/g, "")}`;
      body = `<div class="cwl-self-gated-shell" data-cwl-shell-key="${key.replace(/"/g, "&quot;")}" hidden aria-hidden="true">${lifted.html}</div>`;
    }
    return `<div data-cwl-component="${safe}" data-cwl-lifted-component="${safe}">${body}</div>`;
  } catch {
    return null;
  }
}

/**
 * Apply the same literal expansions as static lift, then replace remaining
 * dynamic constructs with explicit hole markers.
 */
export function liftStructuralSveltePageHtml(
  source: string,
  loadBoolsOrOpts: Readonly<Record<string, boolean>> | LiftStructuralSvelteOptions = {},
): SvelteMarkupLiftResult | null {
  const opts: LiftStructuralSvelteOptions & { _inlineDepth?: number } =
    loadBoolsOrOpts !== null &&
    typeof loadBoolsOrOpts === "object" &&
    ("loadBools" in loadBoolsOrOpts ||
      "passthroughComponents" in loadBoolsOrOpts ||
      "applyShowcaseLoadBools" in loadBoolsOrOpts ||
      "componentSources" in loadBoolsOrOpts ||
      "staticInlineComponents" in loadBoolsOrOpts ||
      "structuralInlineComponents" in loadBoolsOrOpts ||
      "_inlineDepth" in loadBoolsOrOpts)
      ? (loadBoolsOrOpts as LiftStructuralSvelteOptions & { _inlineDepth?: number })
      : { loadBools: loadBoolsOrOpts as Readonly<Record<string, boolean>> };

  const showcase =
    opts.applyShowcaseLoadBools === true
      ? DEFAULT_SHOWCASE_LOAD_BOOLS
      : ({} as Record<string, boolean>);
  // Windows Module_Manager sources are CRLF; normalize before structural rewrite so
  // CR never becomes a JSON `\r` escape that later incomplete unescapes leave as text.
  const normalizedSource = source.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const scriptScalars = extractScriptScalarsFromSvelte(normalizedSource);
  // Showcase settle must win over origin `let loading = true` initializers — those are
  // pre-fetch busy flags, not first-paint truth for static CWL (G9500 / sites table).
  // Order: script defaults → showcase → explicit opts.
  const loadBools = { ...scriptScalars.bools, ...showcase, ...(opts.loadBools ?? {}) };
  const scalarValues: Record<string, string | number | boolean> = {
    ...scriptScalars.scalars,
    ...(opts.scalarOverrides ?? {}),
  };
  const passthrough = opts.passthroughComponents ?? DEFAULT_LAYOUT_PASSTHROUGH_COMPONENTS;
  const staticInline = opts.staticInlineComponents ?? DEFAULT_STATIC_INLINE_COMPONENTS;
  const structuralInline = opts.structuralInlineComponents ?? DEFAULT_STRUCTURAL_INLINE_COMPONENTS;
  const modalShell = opts.modalShellComponents ?? DEFAULT_MODAL_SHELL_COMPONENTS;
  const mapShell = opts.mapShellComponents ?? DEFAULT_MAP_SHELL_COMPONENTS;
  const chartShell = opts.chartShellComponents ?? DEFAULT_CHART_SHELL_COMPONENTS;
  const navShell = opts.navShellComponents ?? DEFAULT_NAV_SHELL_COMPONENTS;
  const wizardShell = opts.wizardShellComponents ?? DEFAULT_WIZARD_SHELL_COMPONENTS;
  const widgetShell = opts.widgetShellComponents ?? DEFAULT_WIDGET_SHELL_COMPONENTS;
  const inlineDepth = opts._inlineDepth ?? 0;

  const shellMarkupFor = (n: string): string | null => {
    if (modalShell.has(n)) return modalShellMarkup(n);
    if (mapShell.has(n)) return mapShellMarkup(n);
    if (chartShell.has(n)) return chartShellMarkup(n);
    if (navShell.has(n)) return navShellMarkup(n);
    if (wizardShell.has(n)) return wizardShellMarkup(n);
    if (widgetShell.has(n)) return widgetShellMarkup(n);
    return null;
  };

  const staticHtml = liftStaticSveltePageHtml(normalizedSource, loadBools);
  if (staticHtml !== null) {
    return {
      html: staticHtml,
      classNames: extractHtmlClassNames(staticHtml),
      liftMode: "static",
      holes: [],
    };
  }

  const holes: SvelteMarkupLiftHole[] = [];
  let s = stripSvelteNonMarkup(normalizedSource);

  // Literal @html strings
  s = s.replace(/\{@html\s+"([^"]*)"\s*\}/g, "$1");
  // `{@html content}` where `content` resolved to a static string (script const,
  // alias, inlined $lib docs, or component prop) — emit the HTML directly.
  s = s.replace(/\{@html\s+([a-zA-Z_$][\w$]*)\s*\}/g, (full, ident: string) =>
    Object.prototype.hasOwnProperty.call(scalarValues, ident) &&
    typeof scalarValues[ident] === "string"
      ? String(scalarValues[ident])
      : full,
  );

  // Balanced if/each (fixes nested blocks that left orphan `{/if}` → fake `/if` interps)
  // Expand `{#each modules as module}` from origin `const modules = […]` (D6442/D6443).
  const staticArrays = extractConstObjectArraysFromSvelte(normalizedSource);
  const stringArrays = extractConstStringArraysFromSvelte(normalizedSource);
  const stringMaps = extractConstStringMapsFromSvelte(normalizedSource);
  s = expandControlFlow(s, loadBools, holes, staticArrays, scalarValues, stringArrays);

  // Component tags (PascalCase) — brace-aware so `() =>` does not truncate (G9904)
  s = s.replace(/<\/([A-Z][A-Za-z0-9_]*)>/g, (_m, name) =>
    passthrough.has(String(name)) ? "" : "</div>",
  );
  {
    let out = "";
    let i = 0;
    while (i < s.length) {
      if (s[i] === "<" && /[A-Z]/.test(s[i + 1] ?? "")) {
        const nameMatch = /^<([A-Z][A-Za-z0-9_]*)/.exec(s.slice(i));
        const end = findPascalComponentTagEnd(s, i);
        if (nameMatch !== null && end !== null) {
          const n = nameMatch[1]!;
          const selfClosing = s.slice(end - 2, end) === "/>";
          const tagText = s.slice(i, end);
          if (passthrough.has(n)) {
            out += "";
          } else if (n === "SharedMap") {
            // Origin iframe → /modules/coverage-map ArcGIS (D6442 / D6448-ST).
            out += sharedMapIslandMarkup(tagText);
          } else {
            const tagProps = parseComponentTagProps(tagText, scalarValues, loadBools);
            const gateKey =
              /\s(?:bind:)?(?:show|open|visible|isOpen)\s*=\s*\{\s*([a-zA-Z_$][\w$]*)\s*\}/.exec(
                tagText,
              )?.[1];
            const structural = tryInlineStructuralComponent(
              n,
              opts.componentSources,
              structuralInline,
              opts,
              loadBools,
              passthrough,
              inlineDepth,
              tagProps.scalars,
              tagProps.bools,
              gateKey,
            );
            if (structural !== null) {
              out += structural;
            } else {
              const shell = shellMarkupFor(n);
              if (shell !== null) {
                out += shell;
              } else {
                const inlined = tryInlineStaticComponent(
                  n,
                  opts.componentSources,
                  staticInline,
                  loadBools,
                  passthrough,
                  inlineDepth,
                );
                if (inlined !== null) {
                  out += inlined;
                } else {
                  pushHole(holes, HOLE_COMPONENT, n);
                  if (selfClosing) {
                    out += holeMarker(HOLE_COMPONENT, n);
                  } else {
                    const safe = n.replace(/"/g, "'");
                    out += `<div data-cwl-hole="${HOLE_COMPONENT}" data-cwl-hole-detail="${safe}" data-cwl-component="${safe}">`;
                  }
                }
              }
            }
          }
          i = end;
          continue;
        }
      }
      out += s[i];
      i++;
    }
    s = out;
  }

  // Event handlers and binds on attributes — brace-aware; promote goto() to data-cwl-nav.
  // Events compile to data-cwl-nav/action/set/toggle below. Native form values
  // remain usable after bind:* is removed, so neither is an unsupported hole.
  // Named handlers that only navigate resolve to their goto target (nav, not action).
  s = rewriteSvelteEventAttributes(
    s,
    extractHandlerNavTargets(normalizedSource),
    extractHandlerToggleTargets(normalizedSource),
  );
  s = rewriteSvelteDynamicAttributes(s);
  s = s.replace(/\s+bind:[a-zA-Z][a-zA-Z0-9_]*\s*=\s*\{[^}]*\}/g, "");
  s = s.replace(/\s+bind:[a-zA-Z][a-zA-Z0-9_]*/g, "");
  s = s.replace(/\s+transition:[a-zA-Z][a-zA-Z0-9_]*(?:\s*=\s*\{[^}]*\})?/g, "");
  s = s.replace(/\s+use:[a-zA-Z][a-zA-Z0-9_]*(?:\s*=\s*\{[^}]*\})?/g, "");
  s = s.replace(/\s+in:[a-zA-Z][a-zA-Z0-9_]*(?:\s*=\s*\{[^}]*\})?/g, "");
  s = s.replace(/\s+out:[a-zA-Z][a-zA-Z0-9_]*(?:\s*=\s*\{[^}]*\})?/g, "");
  s = s.replace(/\s+animate:[a-zA-Z][a-zA-Z0-9_]*(?:\s*=\s*\{[^}]*\})?/g, "");

  if (/=\s*\{/.test(s) || /=\s*["'][^"']*\{/.test(s)) {
    pushHole(holes, HOLE_DIRECTIVE, "dynamic attributes stripped");
  }
  {
    let out = "";
    let i = 0;
    const attrRe = /\s+[a-zA-Z_:][\w:.-]*\s*=\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = attrRe.exec(s)) !== null) {
      out += s.slice(i, m.index);
      let depth = 0;
      let j = m.index + m[0].length - 1;
      for (; j < s.length; j++) {
        if (s[j] === "{") depth++;
        else if (s[j] === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
      i = j;
      attrRe.lastIndex = j;
    }
    out += s.slice(i);
    s = out;
  }
  {
    let out = "";
    let i = 0;
    const attrRe = /(\s+[a-zA-Z_:][\w:.-]*\s*=\s*)(["'])/g;
    let m: RegExpExecArray | null;
    while ((m = attrRe.exec(s)) !== null) {
      const quote = m[2]!;
      const valueStart = m.index + m[0].length;
      let j = valueStart;
      while (j < s.length && s[j] !== quote) {
        if (s[j] === "\\") {
          j += 2;
          continue;
        }
        j++;
      }
      const value = s.slice(valueStart, j);
      out += s.slice(i, m.index);
      if (/\{/.test(value)) {
        const scrubbed = stripBalancedMustaches(value);
        if (scrubbed.length > 0) {
          out += `${m[1]}${quote}${scrubbed}${quote}`;
        }
      } else {
        out += s.slice(m.index, j + 1);
      }
      i = j + 1;
      attrRe.lastIndex = i;
    }
    out += s.slice(i);
    s = out;
  }

  // Text-node mustaches → holes (control tokens already removed)
  {
    let out = "";
    let i = 0;
    while (i < s.length) {
      if (s[i] !== "{") {
        out += s[i];
        i++;
        continue;
      }
      // Brace-aware close that respects `…${…}…` template literals (customer.fullName || `…`).
      let depth = 0;
      let j = i;
      let quote: '"' | "'" | null = null;
      let tick = false;
      let tickExpr = 0;
      for (; j < s.length; j++) {
        const ch = s[j]!;
        if (quote !== null) {
          if (ch === "\\") {
            j++;
            continue;
          }
          if (ch === quote) quote = null;
          continue;
        }
        if (tick) {
          if (ch === "\\") {
            j++;
            continue;
          }
          if (tickExpr > 0) {
            if (ch === "'" || ch === '"') {
              quote = ch;
              continue;
            }
            if (ch === "{") tickExpr++;
            else if (ch === "}") {
              tickExpr--;
              if (tickExpr === 0 && depth === 0) {
                j++;
                break;
              }
            }
            continue;
          }
          if (ch === "`") {
            tick = false;
            continue;
          }
          if (ch === "$" && s[j + 1] === "{") {
            tickExpr = 1;
            j++;
            continue;
          }
          continue;
        }
        if (ch === "'" || ch === '"') {
          quote = ch;
          continue;
        }
        if (ch === "`") {
          tick = true;
          continue;
        }
        if (ch === "{") depth++;
        else if (ch === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
      const expr = s.slice(i + 1, j - 1).trim().slice(0, 80);
      if (expr.startsWith("#") || expr.startsWith("/") || expr.startsWith(":") || expr.startsWith("@")) {
        pushHole(holes, HOLE_RESIDUAL, expr.slice(0, 40));
        i = j;
        continue;
      }
      // Showcase settle: drop interp of known-false bools (empty error/loading text).
      if (Object.prototype.hasOwnProperty.call(loadBools, expr) && loadBools[expr] === false) {
        i = j;
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(loadBools, expr) && loadBools[expr] === true) {
        out += "true";
        i = j;
        continue;
      }
      // Origin script scalars (const/let) — honest text, not invented.
      if (Object.prototype.hasOwnProperty.call(scalarValues, expr)) {
        out += String(scalarValues[expr]);
        i = j;
        continue;
      }
      // `{arr.length}` for origin `const arr = […]` — settle from script truth.
      const lenOf = /^([a-zA-Z_][a-zA-Z0-9_]*)\.length$/.exec(expr);
      if (lenOf && staticArrays[lenOf[1]!]) {
        out += String(staticArrays[lenOf[1]!]!.length);
        i = j;
        continue;
      }
      if (lenOf && stringArrays[lenOf[1]!]) {
        out += String(stringArrays[lenOf[1]!]!.length);
        i = j;
        continue;
      }
      // `{ROLE_NAMES['owner']}` — origin const map lookup (post string-each substitution).
      const mapLookup = /^([A-Za-z_$][\w$]*)\[\s*(['"])([\w-]+)\2\s*\]$/.exec(expr);
      if (mapLookup && stringMaps[mapLookup[1]!]?.[mapLookup[3]!] !== undefined) {
        out += stringMaps[mapLookup[1]!]![mapLookup[3]!]!;
        i = j;
        continue;
      }
      // `activeTab === 'x' ? 'A' : 'B'` — settle from origin scalar initializer.
      const scalarTern =
        /^([a-zA-Z_][a-zA-Z0-9_]*)\s*===\s*(['"])([^'"]*)\2\s*\?\s*(['"])([\s\S]*?)\4\s*:\s*(['"])([\s\S]*?)\6$/.exec(
          expr,
        );
      if (
        scalarTern &&
        Object.prototype.hasOwnProperty.call(scalarValues, scalarTern[1]!) &&
        typeof scalarValues[scalarTern[1]!] === "string"
      ) {
        out += String(scalarValues[scalarTern[1]!]) === scalarTern[3] ? scalarTern[5]! : scalarTern[7]!;
        i = j;
        continue;
      }
      // Event handler idents are not display text — omit (client wires separately).
      if (/^handle[A-Z][A-Za-z0-9_]*$/.test(expr) || /^\(\)\s*=>/.test(expr)) {
        i = j;
        continue;
      }
      // `flag ? 'a' : 'b'` / `flag ? ident : 'literal'` — settle when flag is known.
      const tern = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\?\s*([\s\S]+?)\s*:\s*([\s\S]+)$/.exec(expr);
      if (tern && Object.prototype.hasOwnProperty.call(loadBools, tern[1]!)) {
        const pick = (loadBools[tern[1]!] ? tern[2]! : tern[3]!).trim();
        const lit = /^(['"])([\s\S]*)\1$/.exec(pick);
        if (lit) {
          out += lit[2]!;
          i = j;
          continue;
        }
        if (Object.prototype.hasOwnProperty.call(loadBools, pick)) {
          if (loadBools[pick] === true) out += "true";
          i = j;
          continue;
        }
        // Unknown non-literal branch (e.g. loginTitle) — omit rather than hole when not chosen side needed;
        // if chosen side is bare ident, leave a hole.
        pushHole(holes, HOLE_INTERP, expr || "expr");
        out += holeMarker(HOLE_INTERP, expr || "expr");
        i = j;
        continue;
      }
      pushHole(holes, HOLE_INTERP, expr || "expr");
      out += holeMarker(HOLE_INTERP, expr || "expr");
      i = j;
    }
    s = out;
  }

  // Drop truly empty attrs only. Do not treat `href=/path` as empty (`/` is a value).
  s = s.replace(/\s+[a-zA-Z_:][\w:.-]*\s*=\s*(?:""|'')?(?=[\s>])/g, "");
  s = scrubStructuralMarkupArtifacts(s);
  s = s.trim().replace(/\n{3,}/g, "\n\n");
  if (s.length === 0 || !/<[a-z]/i.test(s)) return null;

  const promoted = opts.promoteRuntimeBindings
    ? promoteSvelteHolesToRuntimeBindings(s)
    : { html: s, promoted: 0 };
  const resultHoles =
    promoted.promoted > 0
      ? holes.filter((hole) => !RUNTIME_BINDING_REASONS.has(hole.reason))
      : holes;

  return {
    html: promoted.html,
    classNames: extractHtmlClassNames(promoted.html),
    liftMode: "structural-shell",
    holes: resultHoles,
  };
}
