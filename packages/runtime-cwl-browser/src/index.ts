export const CWL_BROWSER_RUNTIME_KIND = "chrysalis.cwl.runtime.browser" as const;
export const CWL_BROWSER_RUNTIME_SCHEMA_VERSION = 1 as const;

export interface CwlClientIsland {
  readonly element: Element;
  readonly events: ReadonlyArray<{ readonly name: string; readonly action: string }>;
}

/** Discover client island roots in a DOM document (RFC-0019 metadata). */
export function discoverClientIslands(root: ParentNode = document): CwlClientIsland[] {
  const nodes = root.querySelectorAll('[data-cwl-island="client"]');
  const out: CwlClientIsland[] = [];
  for (const el of Array.from(nodes)) {
    if (!(el instanceof Element)) continue;
    out.push({ element: el, events: readIslandEventBindings(el) });
  }
  return out;
}

/** Read declarative `data-cwl-on-{event}` bindings from an island element. */
export function readIslandEventBindings(el: Element): Array<{ name: string; action: string }> {
  const events: Array<{ name: string; action: string }> = [];
  for (const attr of Array.from(el.attributes)) {
    if (!attr.name.startsWith("data-cwl-on-")) continue;
    const name = attr.name.slice("data-cwl-on-".length);
    const action = attr.value.trim();
    if (name && action) events.push({ name, action });
  }
  return events;
}
