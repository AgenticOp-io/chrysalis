import { afterEach, describe, expect, it } from "vitest";

import { resolveVerifyReplayExtras } from "../src/verify-replay-extras.js";

describe("resolveVerifyReplayExtras", () => {
  afterEach(() => {
    delete process.env.CHRYSALIS_VERIFY_REPLAY_CONCURRENCY;
    delete process.env.CHRYSALIS_VERIFY_DISABLE_COOKIE_CHAIN;
    delete process.env.CHRYSALIS_VERIFY_TIMEOUT_MS;
    delete process.env.CHRYSALIS_VERIFY_WORKER_THREADS;
    delete process.env.CHRYSALIS_VERIFY_SHARD_COUNT;
    delete process.env.CHRYSALIS_VERIFY_SHARD_INDEX;
  });

  it("returns empty extras by default", () => {
    const r = resolveVerifyReplayExtras({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.extras).toEqual({});
    expect(r.logHint).toBeNull();
  });

  it("reads concurrency + disable chain from env", () => {
    process.env.CHRYSALIS_VERIFY_REPLAY_CONCURRENCY = "4";
    process.env.CHRYSALIS_VERIFY_DISABLE_COOKIE_CHAIN = "1";
    const r = resolveVerifyReplayExtras({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.extras.concurrency).toBe(4);
    expect(r.extras.disableCookieChain).toBe(true);
    expect(r.logHint).toContain("concurrency=4");
    expect(r.logHint).toContain("cookie-chain=off");
  });

  it("rejects concurrency > 1 without cookie chain off", () => {
    process.env.CHRYSALIS_VERIFY_REPLAY_CONCURRENCY = "2";
    const r = resolveVerifyReplayExtras({});
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/replay-concurrency/);
  });

  it("flag replay-concurrency overrides env", () => {
    process.env.CHRYSALIS_VERIFY_REPLAY_CONCURRENCY = "8";
    process.env.CHRYSALIS_VERIFY_DISABLE_COOKIE_CHAIN = "1";
    const r = resolveVerifyReplayExtras({
      "replay-concurrency": "3",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.extras.concurrency).toBe(3);
    expect(r.extras.disableCookieChain).toBe(true);
  });

  it("applies timeout from env when >= 1000", () => {
    process.env.CHRYSALIS_VERIFY_TIMEOUT_MS = "15000";
    const r = resolveVerifyReplayExtras({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.extras.timeoutMs).toBe(15000);
  });

  it("sets workerThreads from env", () => {
    process.env.CHRYSALIS_VERIFY_WORKER_THREADS = "1";
    const r = resolveVerifyReplayExtras({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.extras.workerThreads).toBe(true);
    expect(r.logHint).toContain("workerThreads");
  });

  it("parses shard-count and defaults shard-index to 0", () => {
    const r = resolveVerifyReplayExtras({ "shard-count": "4" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.extras.shardCount).toBe(4);
    expect(r.extras.shardIndex).toBe(0);
    expect(r.logHint).toContain("shard=0/4");
  });

  it("rejects shard-index without shard-count", () => {
    const r = resolveVerifyReplayExtras({ "shard-index": "1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/shard-index requires/);
  });

  it("reads shard from env", () => {
    process.env.CHRYSALIS_VERIFY_SHARD_COUNT = "3";
    process.env.CHRYSALIS_VERIFY_SHARD_INDEX = "2";
    const r = resolveVerifyReplayExtras({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.extras.shardCount).toBe(3);
    expect(r.extras.shardIndex).toBe(2);
  });
});
