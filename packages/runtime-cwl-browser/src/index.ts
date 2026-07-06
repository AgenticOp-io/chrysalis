export const CWL_BROWSER_RUNTIME_KIND = "chrysalis.cwl.runtime.browser" as const;
export const CWL_BROWSER_RUNTIME_SCHEMA_VERSION = 1 as const;

export interface CwlClientIsland {
  readonly element: Element;
  readonly events: ReadonlyArray<{ readonly name: string; readonly action: string }>;
}

export interface CwlBrowserDispatchContext {
  readonly event: Event;
  readonly element: Element;
}

export type CwlBrowserActionDispatch = (
  action: string,
  ctx: CwlBrowserDispatchContext,
) => void | Promise<void>;

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

/** Wire declarative island events to a dispatch handler; returns teardown. */
export function bindClientIslandEvents(
  islands: readonly CwlClientIsland[],
  dispatch: CwlBrowserActionDispatch,
): () => void {
  const cleanups: Array<() => void> = [];
  for (const island of islands) {
    for (const { name, action } of island.events) {
      const listener = (event: Event) => {
        void dispatch(action, { event, element: island.element });
      };
      island.element.addEventListener(name, listener);
      cleanups.push(() => island.element.removeEventListener(name, listener));
    }
  }
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}

/** Discover islands under `root` and bind RFC-0019 declarative handlers. */
export function mountCwlClientIslands(
  dispatch: CwlBrowserActionDispatch,
  root: ParentNode = document,
): { readonly islands: readonly CwlClientIsland[]; readonly unmount: () => void } {
  const islands = discoverClientIslands(root);
  const unmount = bindClientIslandEvents(islands, dispatch);
  return { islands, unmount };
}

export interface CwlBrowserRuntimeHandle {
  readonly kind: typeof CWL_BROWSER_RUNTIME_KIND;
  readonly schemaVersion: typeof CWL_BROWSER_RUNTIME_SCHEMA_VERSION;
  readonly islands: readonly CwlClientIsland[];
  readonly mount: () => void;
  readonly unmount: () => void;
}

/** Create a browser runtime handle (metadata binding only — no hydration execution). */
export function createCwlBrowserRuntime(opts: {
  readonly dispatch: CwlBrowserActionDispatch;
  readonly root?: ParentNode;
}): CwlBrowserRuntimeHandle {
  let mounted: { unmount: () => void } | null = null;
  let islands: readonly CwlClientIsland[] = [];
  return {
    kind: CWL_BROWSER_RUNTIME_KIND,
    schemaVersion: CWL_BROWSER_RUNTIME_SCHEMA_VERSION,
    get islands() {
      return islands;
    },
    mount() {
      if (mounted) return;
      const handle = mountCwlClientIslands(opts.dispatch, opts.root);
      islands = handle.islands;
      mounted = { unmount: handle.unmount };
    },
    unmount() {
      mounted?.unmount();
      mounted = null;
      islands = [];
    },
  };
}
