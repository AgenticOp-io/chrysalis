import { describe, expect, it } from "vitest";
import type { HttpResponseEvent } from "@chrysalis/oracle";
import { diffResponse, normalizeBody, normalizeHeaders } from "../src/index.js";

function expected(overrides: Partial<HttpResponseEvent> = {}): HttpResponseEvent {
  return {
    type: "http.response",
    status: 200,
    headers: { "content-type": "text/html" },
    body: "<h1>Hello</h1>",
    bodyTruncated: false,
    session: {},
    ...overrides,
  };
}

describe("normalize", () => {
  it("replaces sqlite timestamps", () => {
    const n = normalizeBody("Posted at 2026-04-22 12:34:56");
    expect(n.body).toContain("<SQLITE_TS>");
    expect(n.appliedTags).toContain("sqlite-timestamp");
  });

  it("replaces iso timestamps", () => {
    const n = normalizeBody("Posted at 2026-04-22T12:34:56.000Z");
    expect(n.body).toContain("<ISO_TS>");
    expect(n.appliedTags).toContain("iso-timestamp");
  });

  it("drops transport headers and normalizes set-cookie value", () => {
    const h = normalizeHeaders({
      "content-type": "text/html",
      Date: "Tue, 01 Jan 2030 00:00:00 GMT",
      Server: "Apache",
      "Content-Length": "10",
      "Set-Cookie": "PHPSESSID=abcdef; Path=/",
    });
    expect(h).not.toHaveProperty("date");
    expect(h).not.toHaveProperty("server");
    expect(h).not.toHaveProperty("content-length");
    expect(h["set-cookie"]).toBe("PHPSESSID=<COOKIE_VALUE>; Path=/");
  });

  it("maps Location absolute URLs to pathname+search for comparison", () => {
    const h = normalizeHeaders({
      location: "http://127.0.0.1:8080/foo?x=1",
    });
    expect(h.location).toBe("/foo?x=1");
    const r = normalizeHeaders({ location: "/bar" });
    expect(r.location).toBe("/bar");
  });
});

describe("diffResponse", () => {
  it("reports no divergences for identical responses", () => {
    const r = diffResponse(expected(), {
      status: 200,
      headers: { "content-type": "text/html" },
      body: "<h1>Hello</h1>",
    });
    expect(r.divergences).toHaveLength(0);
    expect(r.bodySimilarity).toBe(1);
  });

  it("reports a status-mismatch divergence", () => {
    const r = diffResponse(expected(), {
      status: 500,
      headers: { "content-type": "text/html" },
      body: "<h1>Hello</h1>",
    });
    expect(r.divergences.map((d) => d.kind)).toContain("status-mismatch");
  });

  it("does not report header-mismatch when content-type differs only by charset param", () => {
    const r = diffResponse(
      expected({ headers: { "content-type": "text/html; charset=UTF-8" } }),
      {
        status: 200,
        headers: { "content-type": "text/html" },
        body: "<h1>Hello</h1>",
      },
    );
    expect(r.divergences.some((d) => d.kind === "header-mismatch")).toBe(false);
  });

  it("reports a header-mismatch divergence on Location", () => {
    const r = diffResponse(
      expected({
        status: 302,
        headers: { "content-type": "text/html", location: "/posts" },
      }),
      {
        status: 302,
        headers: { "content-type": "text/html", location: "/wrong" },
        body: "",
      },
    );
    expect(r.divergences.some((d) => d.kind === "header-mismatch")).toBe(true);
  });

  it("tolerates whitespace/indentation differences", () => {
    const r = diffResponse(expected({ body: "<h1>Hello</h1>\n<p>world</p>" }), {
      status: 200,
      headers: { "content-type": "text/html" },
      body: "  <h1>Hello</h1> <p>world</p>  ",
    });
    expect(r.divergences).toHaveLength(0);
  });

  it("tolerates timestamp drift in otherwise-identical bodies", () => {
    const r = diffResponse(
      expected({ body: "<p>posted at 2026-04-22 10:00:00</p>" }),
      {
        status: 200,
        headers: { "content-type": "text/html" },
        body: "<p>posted at 2026-04-22 11:59:59</p>",
      },
    );
    expect(r.divergences).toHaveLength(0);
  });

  it("reports body-mismatch when content genuinely diverges", () => {
    const r = diffResponse(expected({ body: "<h1>apple pie recipe</h1>" }), {
      status: 200,
      headers: { "content-type": "text/html" },
      body: "<h1>entirely different content about pineapples</h1>",
    });
    expect(r.divergences.some((d) => d.kind === "body-mismatch")).toBe(true);
  });

  it("skips content-type comparison on 3xx redirects", () => {
    // PHP's `header("Location: ...")` does not set a content-type; Hono's
    // c.redirect() does. This should not produce a header-mismatch.
    const r = diffResponse(
      expected({
        status: 302,
        headers: { location: "/posts" },
        body: "",
      }),
      {
        status: 302,
        headers: { "content-type": "text/plain; charset=UTF-8", location: "/posts" },
        body: "",
      },
    );
    expect(r.divergences.some((d) => d.kind === "header-mismatch")).toBe(false);
  });

  it("does not report body-mismatch when 3xx bodies differ (redirect contract)", () => {
    const r = diffResponse(
      expected({
        status: 302,
        headers: { location: "/a", "content-type": "text/html" },
        body: "<!DOCTYPE html><html><body>redirecting</body></html>",
      }),
      {
        status: 302,
        headers: { location: "/a" },
        body: "",
      },
    );
    expect(r.divergences).toHaveLength(0);
    expect(r.bodySimilarity).toBe(1);
  });

  it("does not report Location mismatch when absolute URL matches path", () => {
    const r = diffResponse(
      expected({
        status: 302,
        headers: { location: "http://127.0.0.1:8080/posts?q=1" },
        body: "",
      }),
      {
        status: 302,
        headers: { location: "/posts?q=1" },
        body: "",
      },
    );
    expect(r.divergences.some((d) => d.kind === "header-mismatch")).toBe(false);
  });

  it("405 wrong-method: skips body and enforces Allow when oracle sends it", () => {
    const r = diffResponse(
      expected({
        status: 405,
        headers: { allow: "POST", "content-type": "text/html; charset=utf-8" },
        body: "<html>method not allowed</html>",
      }),
      {
        status: 405,
        headers: { allow: "POST" },
        body: "",
      },
    );
    expect(r.divergences).toHaveLength(0);
    expect(r.bodySimilarity).toBe(1);
  });

  it("uses a looser body threshold for 4xx/5xx responses", () => {
    // PHP: "Not Found" ; Hono default 404: "404 Not Found"
    const r = diffResponse(
      expected({ status: 404, headers: { "content-type": "text/plain" }, body: "Not Found" }),
      {
        status: 404,
        headers: { "content-type": "text/plain; charset=UTF-8" },
        body: "404 Not Found",
      },
    );
    expect(r.divergences).toHaveLength(0);
  });

  it("does not flag header-mismatch when expected has no value", () => {
    // PHP's prelude can miss implicit/default headers (dev-server's
    // content-type). With no expected contract, we should not invent one.
    const r = diffResponse(
      expected({ headers: {} }),
      {
        status: 200,
        headers: { "content-type": "text/html; charset=UTF-8" },
        body: "<h1>Hello</h1>",
      },
    );
    expect(r.divergences.some((d) => d.kind === "header-mismatch")).toBe(false);
  });

  it("still flags clearly-different error bodies", () => {
    // A 400 that actually changed the validation message is a real diff.
    const r = diffResponse(
      expected({
        status: 400,
        headers: { "content-type": "text/plain" },
        body: "email is required",
      }),
      {
        status: 400,
        headers: { "content-type": "text/plain" },
        body: "password must be at least eight characters long and contain a digit",
      },
    );
    expect(r.divergences.some((d) => d.kind === "body-mismatch")).toBe(true);
  });
});
