import {
  APIConnectionError,
  APITimeoutError,
  APIUserAbortError,
  PrismCrawlError,
  makeStatusError,
} from "./errors.js";
import { VERSION } from "./version.js";

export const DEFAULT_BASE_URL = "https://api.prismcrawl.com";
export const DEFAULT_TIMEOUT_MS = 120_000;
export const DEFAULT_MAX_RETRIES = 2;

// Don't wait longer than this for a rate limit; throw RateLimitError instead.
const MAX_RETRY_WAIT_MS = 30_000;
const INITIAL_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 8_000;

// Network errors that mean the request never reached the server.
const CONNECT_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "UND_ERR_CONNECT_TIMEOUT",
]);

export interface ClientOptions {
  /** Your PrismCrawl API key. Defaults to the `PRISMCRAWL_API_KEY` environment variable. */
  apiKey?: string;
  /** API base URL. Defaults to `PRISMCRAWL_BASE_URL` or `https://api.prismcrawl.com`. */
  baseURL?: string;
  /** Request timeout in milliseconds. Defaults to 120000. */
  timeout?: number;
  /** Retries for connection failures, rate limits, and server errors. Defaults to 2. */
  maxRetries?: number;
  /** Extra headers sent with every request. */
  defaultHeaders?: Record<string, string>;
  /** A custom `fetch` implementation, for proxies or testing. Defaults to `globalThis.fetch`. */
  fetch?: typeof fetch;
}

export interface RequestOptions {
  /** Cancel the request. */
  signal?: AbortSignal;
  /** Override the client timeout for this call, in milliseconds. */
  timeout?: number;
  /** Override the client's retry count for this call. */
  maxRetries?: number;
  /** Extra headers for this call. */
  headers?: Record<string, string>;
}

interface TransportRequest extends RequestOptions {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  query?: Record<string, string>;
  text?: boolean;
  /** Safe to resend after a timeout or dropped connection (GETs, and POSTs with an Idempotency-Key). */
  idempotent?: boolean;
}

const env = (name: string): string | undefined => {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[name];
};

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new APIUserAbortError());
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new APIUserAbortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

const backoff = (attempt: number) =>
  Math.min(INITIAL_RETRY_DELAY_MS * 2 ** attempt, MAX_RETRY_DELAY_MS) * (0.75 + Math.random() * 0.5);

function retryAfterMs(headers: Headers, body: unknown): number | undefined {
  const header = headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const date = Date.parse(header);
    if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  }
  const resetAt = (body as { error?: { reset_at?: unknown } } | undefined)?.error?.reset_at;
  if (typeof resetAt === "string") {
    const date = Date.parse(resetAt);
    if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  }
  return undefined;
}

/** Delay before retrying a response, or undefined if it shouldn't be retried. Failed requests use no credits. */
function statusRetryDelay(status: number, headers: Headers, body: unknown, attempt: number): number | undefined {
  if (status === 429) {
    const wait = retryAfterMs(headers, body);
    if (wait === undefined) return backoff(attempt);
    return wait <= MAX_RETRY_WAIT_MS ? wait : undefined;
  }
  return status >= 500 ? backoff(attempt) : undefined;
}

function isConnectError(error: unknown): boolean {
  for (let e: unknown = error, depth = 0; e && depth < 5; e = (e as { cause?: unknown }).cause, depth++) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string" && CONNECT_ERROR_CODES.has(code)) return true;
  }
  return false;
}

async function readBody(response: Response, text: boolean): Promise<unknown> {
  const raw = await response.text();
  if (text) return raw;
  const type = response.headers.get("content-type") ?? "";
  if (!raw) return undefined;
  if (type.includes("json") || !type) {
    try {
      return JSON.parse(raw);
    } catch {
      if (response.ok) throw new PrismCrawlError(`Could not parse JSON response: ${raw.slice(0, 200)}`);
      return raw;
    }
  }
  return raw;
}

/** HTTP transport shared by every endpoint. */
export class Transport {
  readonly baseURL: string;
  readonly timeout: number;
  readonly maxRetries: number;
  readonly #apiKey: string;
  readonly #headers: Record<string, string>;
  readonly #fetch: typeof fetch;

  constructor(options: ClientOptions = {}) {
    const apiKey = (options.apiKey ?? env("PRISMCRAWL_API_KEY"))?.trim();
    if (!apiKey) {
      throw new PrismCrawlError(
        "No API key provided. Pass { apiKey } or set the PRISMCRAWL_API_KEY environment variable. " +
          "Create a key in the PrismCrawl dashboard.",
      );
    }
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    if (!Number.isInteger(maxRetries) || maxRetries < 0) throw new PrismCrawlError("maxRetries must be an integer >= 0");
    const fetchImpl = options.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new PrismCrawlError("fetch is not available. Use Node.js 18 or later, or pass { fetch }.");
    }
    this.#apiKey = apiKey;
    this.baseURL = (options.baseURL ?? env("PRISMCRAWL_BASE_URL") ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = maxRetries;
    this.#headers = options.defaultHeaders ?? {};
    this.#fetch = fetchImpl;
  }

  async request<T>(req: TransportRequest): Promise<T> {
    const url = new URL(this.baseURL + req.path);
    for (const [key, value] of Object.entries(req.query ?? {})) url.searchParams.set(key, value);
    const headers: Record<string, string> = {
      accept: "application/json",
      "user-agent": `prismcrawl-node/${VERSION}`,
      ...this.#headers,
      ...req.headers,
      "x-api-key": this.#apiKey,
    };
    if (req.body !== undefined) headers["content-type"] = "application/json";
    const init = {
      method: req.method,
      headers,
      body: req.body === undefined ? undefined : JSON.stringify(req.body),
    };
    const maxRetries = req.maxRetries ?? this.maxRetries;
    const timeout = req.timeout ?? this.timeout;

    for (let attempt = 0; ; attempt++) {
      let delay: number | undefined;
      const controller = new AbortController();
      const onAbort = () => controller.abort();
      req.signal?.addEventListener("abort", onAbort, { once: true });
      if (req.signal?.aborted) controller.abort();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeout);

      try {
        const response = await this.#fetch(url, { ...init, signal: controller.signal });
        const body = await readBody(response, Boolean(req.text) && response.ok);
        if (response.ok) return body as T;
        delay = statusRetryDelay(response.status, response.headers, body, attempt);
        if (delay === undefined || attempt >= maxRetries) throw makeStatusError(response.status, body, response.headers);
      } catch (error) {
        if (error instanceof PrismCrawlError) throw error;
        if (req.signal?.aborted) throw new APIUserAbortError({ cause: error });
        // A connect failure means the request was never sent. Anything later (timeout,
        // dropped connection) may have completed a billable search, so only GETs and
        // idempotency-keyed submissions retry.
        const retryable = req.method === "GET" || req.idempotent === true || (!timedOut && isConnectError(error));
        if (!retryable || attempt >= maxRetries) {
          if (timedOut) throw new APITimeoutError({ cause: error });
          throw new APIConnectionError(`Connection error: ${(error as Error)?.message ?? error}`, { cause: error });
        }
        delay = backoff(attempt);
      } finally {
        clearTimeout(timer);
        req.signal?.removeEventListener("abort", onAbort);
      }
      await sleep(delay, req.signal);
    }
  }
}
