import { describe, expect, it } from "vitest";
import {
  canaryBucket,
  parseCookieHeader,
  resolveCanaryTarget,
  stickinessKeyForRequest,
} from "../src/canary.js";
import type { IncomingMessage } from "node:http";

function fakeReq(headers: Record<string, string | string[] | undefined>): IncomingMessage {
  return {
    headers,
    socket: { remoteAddress: "127.0.0.1" },
  } as IncomingMessage;
}

describe("canary bucketing", () => {
  it("is deterministic for the same key and salt", () => {
    expect(canaryBucket("user-a", "salt1")).toBe(canaryBucket("user-a", "salt1"));
    expect(canaryBucket("user-a", "salt1")).not.toBe(canaryBucket("user-b", "salt1"));
  });

  it("parseCookieHeader finds a value", () => {
    expect(parseCookieHeader("a=1; session=abc; b=2", "session")).toBe("abc");
    expect(parseCookieHeader(undefined, "session")).toBeNull();
  });

  it("stickinessKey prefers cookie then header then ip", () => {
    const settings = { stickinessCookie: "sid", stickinessHeader: "x-uid" };
    const c = fakeReq({ cookie: "sid=u1", "x-uid": "h1" });
    expect(stickinessKeyForRequest(c, settings)).toContain("sid=u1");
    const h = fakeReq({ "x-uid": "h1" });
    expect(stickinessKeyForRequest(h, settings)).toBe("h:x-uid:h1");
    const ip = fakeReq({});
    expect(stickinessKeyForRequest(ip, settings)).toBe("ip:127.0.0.1");
  });

  it("resolveCanaryTarget sends all modern-eligible traffic when percent is 100", () => {
    const req = fakeReq({});
    const r = resolveCanaryTarget({
      eligibleModern: true,
      settings: {
        percentModern: 100,
        salt: "s",
      },
      req,
    });
    expect(r.target).toBe("modern");
    expect(r.canaryTag).toBe("in");
  });

  it("resolveCanaryTarget never sends legacy-eligible routes to modern", () => {
    const r = resolveCanaryTarget({
      eligibleModern: false,
      settings: { percentModern: 100, salt: "s" },
      req: fakeReq({}),
    });
    expect(r.target).toBe("legacy");
    expect(r.canaryTag).toBe("n/a");
  });

  it("stickiness: two cookie values can land in different buckets at 50%", () => {
    const salt = "test-salt";
    let low: string | null = null;
    let high: string | null = null;
    for (let i = 0; i < 1000; i++) {
      const v = `id-${i}`;
      const b = canaryBucket(`c:sid=${v}`, salt);
      if (b < 50 && !low) low = v;
      if (b >= 50 && !high) high = v;
      if (low && high) break;
    }
    expect(low).not.toBeNull();
    expect(high).not.toBeNull();
    const settings = {
      percentModern: 50,
      salt,
      stickinessCookie: "sid",
    };
    const toModern = (cookieVal: string) =>
      resolveCanaryTarget({
        eligibleModern: true,
        settings,
        req: fakeReq({ cookie: `sid=${cookieVal}` }),
      }).target;
    expect(toModern(low!)).toBe("modern");
    expect(toModern(high!)).toBe("legacy");
  });
});
