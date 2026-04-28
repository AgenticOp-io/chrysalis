import { AsyncLocalStorage } from "node:async_hooks";
import type { MiddlewareHandler } from "hono";

export interface ChrysalisHandlerContext {
  readonly nowIso: string;
  nextRandom: () => number;
}

const handlerCtxAls = new AsyncLocalStorage<ChrysalisHandlerContext>();

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Wall clock for `effect.time.now` lowering; falls back to system time outside ALS. */
export function chrysalisNow(): string {
  return handlerCtxAls.getStore()?.nowIso ?? new Date().toISOString();
}

/** Unit interval PRNG for `effect.random` lowering; falls back to Math.random outside ALS. */
export function chrysalisRandom(): number {
  const s = handlerCtxAls.getStore();
  if (s) return s.nextRandom();
  return Math.random();
}

export const chrysalisDeterminismMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const hdrNow = c.req.header("x-chrysalis-now-iso");
    const hdrSeed = c.req.header("x-chrysalis-random-seed");
    const nowIso = hdrNow && hdrNow.length > 0 ? hdrNow : new Date().toISOString();
    let seed = (Math.random() * 0xffffffff) >>> 0;
    if (hdrSeed != null && hdrSeed.length > 0) {
      const n = Number.parseInt(hdrSeed, 10);
      if (Number.isFinite(n)) seed = n >>> 0;
    }
    const ctx: ChrysalisHandlerContext = { nowIso, nextRandom: mulberry32(seed) };
    return handlerCtxAls.run(ctx, () => next());
  };
};
