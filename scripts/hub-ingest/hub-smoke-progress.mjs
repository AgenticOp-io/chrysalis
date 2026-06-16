#!/usr/bin/env node
/**
 * Line-oriented progress logging for long hub smokes (stderr → GCE phase logs via 2>&1 tee).
 * Default on; set CHRYSALIS_HUB_SMOKE_PROGRESS=0 to silence.
 */

/** @returns {boolean} */
export function isSmokeProgressEnabled() {
  return process.env.CHRYSALIS_HUB_SMOKE_PROGRESS !== "0";
}

function write(scope, msg) {
  if (!isSmokeProgressEnabled()) return;
  console.error(`[chrysalis-smoke:${scope}] ${new Date().toISOString()} ${msg}`);
}

/**
 * @param {string} scope
 */
export function createSmokeProgress(scope) {
  return {
    /** @param {string} label @returns {number} */
    start(label) {
      write(scope, `start ${label}`);
      return Date.now();
    },
    /** @param {string} label @param {boolean} ok @param {number} [t0] */
    end(label, ok, t0) {
      const ms = typeof t0 === "number" ? Date.now() - t0 : 0;
      write(scope, `${ok ? "ok" : "FAIL"} ${label} (${ms}ms)`);
    },
    /** @param {string} label @param {string} reason */
    defer(label, reason) {
      write(scope, `defer ${label} (${reason})`);
    },
    /** @param {string} msg */
    info(msg) {
      write(scope, msg);
    },
  };
}

/** @param {unknown} result */
export function smokeResultOk(result) {
  if (result == null || typeof result !== "object") return false;
  const r = /** @type {{ ok?: boolean, skip?: unknown }} */ (result);
  return r.ok === true || r.skip != null;
}

/**
 * @template T
 * @param {string} scope
 * @param {string} label
 * @param {() => T | Promise<T>} fn
 */
export async function runSmokeStep(scope, label, fn) {
  const p = createSmokeProgress(scope);
  const t0 = p.start(label);
  try {
    const result = await fn();
    p.end(label, smokeResultOk(result), t0);
    return result;
  } catch (e) {
    p.end(label, false, t0);
    throw e;
  }
}

/**
 * @template T
 * @param {string} scope
 * @param {string} label
 * @param {() => T} fn
 */
export function runSmokeStepSync(scope, label, fn) {
  const p = createSmokeProgress(scope);
  const t0 = p.start(label);
  try {
    const result = fn();
    p.end(label, smokeResultOk(result), t0);
    return result;
  } catch (e) {
    p.end(label, false, t0);
    throw e;
  }
}

/**
 * Run labeled steps sequentially with progress lines.
 * @template {string} K
 * @param {string} scope
 * @param {ReadonlyArray<{ id: K, run: () => unknown | Promise<unknown> }>} steps
 * @returns {Promise<Record<K, unknown>>}
 */
export async function runSmokeSteps(scope, steps) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const step of steps) {
    out[step.id] = await runSmokeStep(scope, step.id, step.run);
  }
  return /** @type {Record<K, unknown>} */ (out);
}
