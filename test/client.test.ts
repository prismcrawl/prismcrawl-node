import { readFileSync } from "node:fs";
import { brotliCompressSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";

import PrismCrawl, {
  APIConnectionError,
  APIStatusError,
  APITimeoutError,
  APIUserAbortError,
  AuthenticationError,
  BadRequestError,
  InsufficientCreditsError,
  InternalServerError,
  NotFoundError,
  PayloadTooLargeError,
  PrismCrawlError,
  RateLimitError,
  VERSION,
  decodeHtml,
} from "../src/index.js";
import { ENDPOINTS } from "../src/resources.gen.js";

const spec = JSON.parse(readFileSync(new URL("../openapi.json", import.meta.url), "utf8"));
const REQUEST_ID = "66ca8deb-1dc2-4017-865f-c4fb0e3c7c0d";

type Reply = Response | Error | (() => Response | Promise<Response>);

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "x-request-id": REQUEST_ID, ...headers },
  });

const ok = (content: Record<string, unknown> = {}) =>
  json(200, { success: true, request_id: REQUEST_ID, data: { format: "json", content } });

const fail = (status: number, code: string, message: string, extra: Record<string, unknown> = {}) =>
  json(status, { success: false, request_id: REQUEST_ID, data: null, error: { code, message, ...extra } });

function mockFetch(...replies: Reply[]) {
  const calls: { url: URL; init: RequestInit }[] = [];
  const fetch = vi.fn(async (url: URL | string, init: RequestInit = {}) => {
    calls.push({ url: new URL(url), init });
    const reply = replies.length > 1 ? replies.shift()! : replies[0]!;
    if (reply instanceof Error) throw reply;
    if (typeof reply === "function") return reply();
    return reply.clone();
  });
  const body = (i = -1) => JSON.parse(String(calls.at(i)!.init.body));
  const header = (name: string, i = -1) => (calls.at(i)!.init.headers as Record<string, string>)[name];
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls, body, header };
}

const client = (mock: ReturnType<typeof mockFetch>, options: ConstructorParameters<typeof PrismCrawl>[0] = {}) =>
  new PrismCrawl({ apiKey: "test-key", fetch: mock.fetch, ...options });

const connectError = () => Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("configuration", () => {
  it("reads the API key from the environment", async () => {
    vi.stubEnv("PRISMCRAWL_API_KEY", "env-key");
    const mock = mockFetch(ok());
    await new PrismCrawl({ fetch: mock.fetch }).google.search({ query: "q" });
    expect(mock.header("x-api-key")).toBe("env-key");
  });

  it("requires an API key", () => {
    vi.stubEnv("PRISMCRAWL_API_KEY", "");
    expect(() => new PrismCrawl()).toThrow(/PRISMCRAWL_API_KEY/);
  });

  it("reads the base URL from the environment", async () => {
    vi.stubEnv("PRISMCRAWL_BASE_URL", "https://staging.example.com/");
    const mock = mockFetch(ok());
    await client(mock).google.search({ query: "q" });
    expect(mock.calls[0]!.url.href).toBe("https://staging.example.com/v1/google/search");
  });

  it("rejects a negative maxRetries", () => {
    expect(() => new PrismCrawl({ apiKey: "k", maxRetries: -1 })).toThrow(PrismCrawlError);
  });
});

describe("requests", () => {
  it("sends the expected request", async () => {
    const mock = mockFetch(ok({ results: [] }));
    const response = await client(mock, { defaultHeaders: { "x-extra": "1" } }).google.maps.search(
      { query: "coffee shop", coordinates: { latitude: 30.2672, longitude: -97.7431 } },
      { extraBody: { future_param: true } },
    );
    const call = mock.calls[0]!;
    expect(call.init.method).toBe("POST");
    expect(call.url.href).toBe("https://api.prismcrawl.com/v1/google/maps/search");
    expect(mock.header("x-api-key")).toBe("test-key");
    expect(mock.header("x-extra")).toBe("1");
    expect(mock.header("content-type")).toBe("application/json");
    expect(mock.header("user-agent")).toBe(`prismcrawl-node/${VERSION}`);
    expect(mock.body()).toEqual({
      query: "coffee shop",
      coordinates: { latitude: 30.2672, longitude: -97.7431 },
      future_param: true,
    });
    expect(response.request_id).toBe(REQUEST_ID);
  });

  it("drops undefined params but keeps false and null", async () => {
    const mock = mockFetch(ok());
    await client(mock).google.search({ query: "q", html: false, device: null, start: undefined });
    expect(mock.body()).toEqual({ query: "q", html: false, device: null });
  });

  it("does not let per-request headers replace the API key", async () => {
    const mock = mockFetch(ok());
    await client(mock).google.search({ query: "q" }, { headers: { "x-api-key": "other", "x-trace": "t" } });
    expect(mock.header("x-api-key")).toBe("test-key");
    expect(mock.header("x-trace")).toBe("t");
  });

  it("exposes bing as an alias of microsoft", async () => {
    const mock = mockFetch(ok());
    const c = client(mock);
    expect(c.bing).toBe(c.microsoft);
    await c.bing.search({ query: "q" });
    expect(mock.calls[0]!.url.pathname).toBe("/v1/microsoft/search");
  });
});

describe("history", () => {
  it("fetches metadata and JSON artifacts", async () => {
    const mock = mockFetch(json(200, { success: true, request_id: REQUEST_ID, data: { status: "done" } }));
    const c = client(mock);
    const metadata = await c.yelp.reviews.get(REQUEST_ID);
    expect(metadata.data).toEqual({ status: "done" });
    expect(mock.calls[0]!.init.method).toBe("GET");
    expect(mock.calls[0]!.url.pathname).toBe(`/v1/yelp/reviews/${REQUEST_ID}`);
    expect(mock.calls[0]!.url.search).toBe("");
    expect(mock.calls[0]!.init.body).toBeUndefined();

    await c.yelp.reviews.get(REQUEST_ID, { artifact: "json" });
    expect(mock.calls[1]!.url.searchParams.get("artifact")).toBe("json");
  });

  it("returns HTML artifacts as text", async () => {
    const mock = mockFetch(new Response("<html>hi</html>", { headers: { "content-type": "text/html; charset=utf-8" } }));
    const html: string = await client(mock).google.search.get(REQUEST_ID, { artifact: "html" });
    expect(html).toBe("<html>hi</html>");
  });

  it("escapes the request id", async () => {
    const mock = mockFetch(ok());
    await client(mock).google.search.get("../../admin");
    expect(mock.calls[0]!.url.pathname).toBe("/v1/google/search/..%2F..%2Fadmin");
  });

  it("rejects an invalid artifact", () => {
    const c = client(mockFetch(ok()));
    expect(() => c.google.search.get(REQUEST_ID, { artifact: "pdf" as "json" })).toThrow(PrismCrawlError);
  });
});

describe("errors", () => {
  it.each([
    [400, BadRequestError],
    [401, AuthenticationError],
    [402, InsufficientCreditsError],
    [404, NotFoundError],
    [405, APIStatusError],
    [413, PayloadTooLargeError],
    [500, InternalServerError],
    [503, InternalServerError],
  ])("maps %i to %s", async (status, Cls) => {
    const mock = mockFetch(fail(status, "some_code", "Something failed"));
    const error = await client(mock, { maxRetries: 0 })
      .google.search({ query: "q" })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Cls);
    expect(error).toBeInstanceOf(APIStatusError);
    expect(error).toBeInstanceOf(PrismCrawlError);
    const e = error as APIStatusError;
    expect(e.status).toBe(status);
    expect(e.code).toBe("some_code");
    expect(e.requestId).toBe(REQUEST_ID);
    expect(e.message).toContain("Something failed");
    expect(e.message).toContain(REQUEST_ID);
    expect(e.name).toBe(Cls.name);
  });

  it("handles non-JSON error bodies", async () => {
    const mock = mockFetch(new Response("Bad Gateway", { status: 502, headers: { "content-type": "text/plain" } }));
    const error = (await client(mock, { maxRetries: 0 })
      .google.search({ query: "q" })
      .catch((e: unknown) => e)) as InternalServerError;
    expect(error).toBeInstanceOf(InternalServerError);
    expect(error.body).toBe("Bad Gateway");
    expect(error.code).toBeUndefined();
  });

  it("exposes rate limit details and doesn't wait for distant resets", async () => {
    const mock = mockFetch(fail(429, "rate_limited", "Slow down", { rule: "per_minute", reset_at: "2999-01-01T00:00:00Z" }));
    const error = (await client(mock)
      .google.search({ query: "q" })
      .catch((e: unknown) => e)) as RateLimitError;
    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.rule).toBe("per_minute");
    expect(error.resetAt).toBe("2999-01-01T00:00:00Z");
    expect(mock.calls).toHaveLength(1);
  });
});

describe("retries", () => {
  it("retries a rate limit with Retry-After", async () => {
    const mock = mockFetch(json(429, {}, { "retry-after": "0" }), ok());
    await client(mock).google.search({ query: "q" });
    expect(mock.calls).toHaveLength(2);
  });

  it("retries server errors, then gives up", async () => {
    const mock = mockFetch(fail(500, "internal", "boom"));
    await expect(client(mock, { maxRetries: 1 }).google.search({ query: "q" })).rejects.toBeInstanceOf(
      InternalServerError,
    );
    expect(mock.calls).toHaveLength(2);
  });

  it("retries a server error, then succeeds", async () => {
    const mock = mockFetch(fail(503, "unavailable", "busy"), ok());
    await client(mock).google.search({ query: "q" });
    expect(mock.calls).toHaveLength(2);
  });

  it("does not retry client errors", async () => {
    const mock = mockFetch(fail(400, "invalid_request", "query is required"));
    await expect(client(mock).google.search({ query: "q" })).rejects.toBeInstanceOf(BadRequestError);
    expect(mock.calls).toHaveLength(1);
  });

  it("retries connect failures for POST", async () => {
    const mock = mockFetch(connectError(), ok());
    await client(mock).google.search({ query: "q" });
    expect(mock.calls).toHaveLength(2);
  });

  it("does not retry other network failures for POST", async () => {
    const mock = mockFetch(new TypeError("socket hang up"), ok());
    await expect(client(mock).google.search({ query: "q" })).rejects.toBeInstanceOf(APIConnectionError);
    expect(mock.calls).toHaveLength(1);
  });

  it("retries network failures for GET", async () => {
    const mock = mockFetch(new TypeError("socket hang up"), ok());
    await client(mock).google.search.get(REQUEST_ID);
    expect(mock.calls).toHaveLength(2);
  });

  it("respects a per-request maxRetries", async () => {
    const mock = mockFetch(fail(500, "internal", "boom"), ok());
    await expect(client(mock).google.search({ query: "q" }, { maxRetries: 0 })).rejects.toBeInstanceOf(
      InternalServerError,
    );
    expect(mock.calls).toHaveLength(1);
  });
});

describe("timeouts and cancellation", () => {
  const hang = (_url: URL | string, init: RequestInit = {}) =>
    new Promise<Response>((_, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    });

  it("times out", async () => {
    const c = new PrismCrawl({ apiKey: "k", fetch: hang as typeof fetch, timeout: 20 });
    await expect(c.google.search({ query: "q" })).rejects.toBeInstanceOf(APITimeoutError);
  });

  it("applies a per-request timeout", async () => {
    const c = new PrismCrawl({ apiKey: "k", fetch: hang as typeof fetch });
    await expect(c.google.search({ query: "q" }, { timeout: 20 })).rejects.toBeInstanceOf(APITimeoutError);
  });

  it("can be aborted", async () => {
    const c = new PrismCrawl({ apiKey: "k", fetch: hang as typeof fetch });
    const controller = new AbortController();
    const promise = c.google.search({ query: "q" }, { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(APIUserAbortError);
  });
});

describe("pagination", () => {
  it("follows next_page_token", async () => {
    const mock = mockFetch(
      ok({ results: [1], has_next_page: true, next_page_token: "t1" }),
      ok({ results: [2], has_next_page: true, next_page_token: "t2" }),
      ok({ results: [3], has_next_page: false }),
    );
    const results: unknown[] = [];
    for await (const page of client(mock).google.maps.reviews.pages({ id: "place", sort_by: "relevance" })) {
      results.push((page.data as { content: { results: unknown } }).content.results);
    }
    expect(results).toEqual([[1], [2], [3]]);
    expect([0, 1, 2].map((i) => mock.body(i).next_page_token)).toEqual([undefined, "t1", "t2"]);
    expect([0, 1, 2].every((i) => mock.body(i).sort_by === "relevance")).toBe(true);
  });

  it("increments page and honors maxPages", async () => {
    const mock = mockFetch(ok({ results: [], has_next_page: true }));
    let count = 0;
    for await (const _ of client(mock).yelp.reviews.pages({ id: "biz", page: 3 }, { maxPages: 3 })) count++;
    expect(count).toBe(3);
    expect([0, 1, 2].map((i) => mock.body(i).page)).toEqual([3, 4, 5]);
  });

  it("stops when there is no token", async () => {
    const mock = mockFetch(ok({ results: [], has_next_page: true }));
    let count = 0;
    for await (const _ of client(mock).google.maps.reviews.pages({ id: "place" })) count++;
    expect(count).toBe(1);
  });
});

describe("decodeHtml", () => {
  it("decodes Base64 Brotli HTML", async () => {
    const content = brotliCompressSync(Buffer.from("<html>café</html>")).toString("base64");
    const response = { success: true, request_id: REQUEST_ID, data: { format: "html+br+base64" as const, content } };
    await expect(decodeHtml(response)).resolves.toBe("<html>café</html>");
    await expect(decodeHtml(response.data)).resolves.toBe("<html>café</html>");
    await expect(decodeHtml(content)).resolves.toBe("<html>café</html>");
    await expect(decodeHtml({ data: { format: "json", content: {} } })).rejects.toBeInstanceOf(PrismCrawlError);
  });
});

describe("coverage of the spec", () => {
  const postPaths = Object.entries(spec.paths as Record<string, Record<string, unknown>>)
    .filter(([, item]) => "post" in item)
    .map(([path]) => path)
    .sort();

  it("has an endpoint for every POST operation", () => {
    expect(ENDPOINTS.map((e) => e.path).sort()).toEqual(postPaths);
  });

  it("wires every endpoint to its path", async () => {
    const mock = mockFetch(ok());
    const c = client(mock) as unknown as Record<string, unknown>;
    for (const ep of ENDPOINTS) {
      const fn = ep.attrPath.reduce<any>((node, key) => node[key], c);
      expect(fn.path).toBe(ep.path);
      await fn({});
      expect(mock.calls.at(-1)!.url.pathname).toBe(ep.path);
      await fn.get(REQUEST_ID);
      expect(mock.calls.at(-1)!.url.pathname).toBe(`${ep.path}/${REQUEST_ID}`);
      expect(typeof fn.pages === "function").toBe(ep.pagination !== null);
    }
  });
});
