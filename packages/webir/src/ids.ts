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

  fork(suffix: string): IdGen {
    return new IdGen(`${this.#prefix}${suffix}.`);
  }
}
