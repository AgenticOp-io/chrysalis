import type { NodeId } from "./index.js";

/**
 * Stable, deterministic NodeId generator. Feeding the same sequence of
 * `alloc` calls yields the same ids, which is what makes WebIR builds
 * reproducible and golden-fixture-friendly.
 */
export class IdGen {
  #counter = 0;
  readonly #prefix: string;

  constructor(prefix = "n") {
    this.#prefix = prefix;
  }

  alloc(): NodeId {
    const id = `${this.#prefix}${this.#counter}`;
    this.#counter += 1;
    return id as NodeId;
  }

  /**
   * After importing existing nodes with explicit ids, advance the counter so the
   * next {@link alloc} cannot collide with any `n<number>` id already present.
   */
  seedAfterExistingNodeIds(ids: Iterable<NodeId>): void {
    let max = -1;
    for (const id of ids) {
      const m = /^n(\d+)$/.exec(String(id));
      if (m) {
        const n = Number.parseInt(m[1]!, 10);
        if (n > max) max = n;
      }
    }
    if (max >= 0) this.#counter = max + 1;
  }

  fork(suffix: string): IdGen {
    return new IdGen(`${this.#prefix}${suffix}.`);
  }
}
