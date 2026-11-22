import { newIdempotencyKey, type AsyncReceipt } from "./async.js";
import type { RequestOptions, Transport } from "./core.js";
import { PrismCrawlError } from "./errors.js";
import type { MarkdownSearchResponse, ProjectedSearchResponse } from "./types.gen.js";

export interface CallOptions extends RequestOptions {
  /** Additional JSON fields to send, for parameters newer than this SDK. */
  extraBody?: Record<string, unknown>;
}

export interface PageOptions extends CallOptions {
  /** Stop after this many pages. Defaults to no limit. */
  maxPages?: number;
}

export interface SubmitOptions extends CallOptions {
  /**
   * Identifies this submission so retries can't start a second search. Defaults to a new
   * UUID. Reuse the same key, with identical parameters, to retry an uncertain submission.
   */
  idempotencyKey?: string;
}

export interface HistoryOptions extends RequestOptions {
  /**
   * Omit for request metadata. `"json"` returns the archived parsed response; `"html"`
   * returns the archived source HTML as a string. `zero_trace` requests have no artifacts.
   */
  artifact?: "json" | "html";
}

/** Metadata or an archived JSON artifact returned by `.get()`. */
export type HistoryResponse = Record<string, unknown>;

type WebhookFields = "webhook_url" | "webhook_secret";
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Parameters for a synchronous call. Webhook fields are only accepted by `.submit()`. */
export type SyncParams<Params> = DistributiveOmit<Params, WebhookFields>;

/** Parameters for `.submit()`: the endpoint's parameters plus a required signed webhook. */
export type AsyncParams<Params> = DistributiveOmit<Params, WebhookFields> & {
  /** Public HTTPS URL that receives the completed response by POST. */
  webhook_url: string;
  /** Shared secret (32 to 256 printable ASCII characters) used to sign deliveries. */
  webhook_secret: string;
};

type Markdown = { output: "md" };
type Projected = { json_restrictor: string };

export interface Endpoint<Params, Response> {
  /** `output: "md"` returns Markdown in `data.content`. */
  (params: SyncParams<Params> & Markdown, options?: CallOptions): Promise<MarkdownSearchResponse>;
  /** `json_restrictor` returns only the selected fields in `data.content`. */
  (params: SyncParams<Params> & Projected, options?: CallOptions): Promise<ProjectedSearchResponse>;
  (params: SyncParams<Params>, options?: CallOptions): Promise<Response>;
  /**
   * Run the request asynchronously. Resolves with a job receipt once PrismCrawl has
   * accepted it; the completed response is POSTed to `webhook_url`, signed with
   * `webhook_secret` (see `verifyWebhook`). A receipt doesn't mean the search succeeded.
   */
  submit(params: AsyncParams<Params>, options?: SubmitOptions): Promise<AsyncReceipt>;
  /** Request history: metadata, or an archived artifact, for a past request to this endpoint. */
  get(requestId: string, options: HistoryOptions & { artifact: "html" }): Promise<string>;
  get(requestId: string, options?: HistoryOptions & { artifact?: "json" }): Promise<HistoryResponse>;
  /** API path, such as `/v1/google/search`. */
  readonly path: string;
}

export interface PaginatedEndpoint<Params, Response> extends Endpoint<Params, Response> {
  /** Yield each page, following the response's pagination until there are no more pages. */
  pages(
    params: SyncParams<Params> & Markdown,
    options?: PageOptions,
  ): AsyncGenerator<MarkdownSearchResponse, void, undefined>;
  pages(
    params: SyncParams<Params> & Projected,
    options?: PageOptions,
  ): AsyncGenerator<ProjectedSearchResponse, void, undefined>;
  pages(params: SyncParams<Params>, options?: PageOptions): AsyncGenerator<Response, void, undefined>;
}

type Pagination = "token" | "page";

function buildBody(params: unknown, extraBody?: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries((params ?? {}) as Record<string, unknown>)) {
    if (value !== undefined) body[key] = value;
  }
  return { ...body, ...extraBody };
}

function nextBody(kind: Pagination, body: Record<string, unknown>, page: unknown): Record<string, unknown> | undefined {
  const content = (page as { data?: { content?: unknown } } | undefined)?.data?.content;
  if (typeof content !== "object" || content === null) return undefined;
  const { has_next_page, next_page_token } = content as { has_next_page?: unknown; next_page_token?: unknown };
  if (!has_next_page) return undefined;
  if (kind === "token") {
    return typeof next_page_token === "string" && next_page_token ? { ...body, next_page_token } : undefined;
  }
  return { ...body, page: (typeof body.page === "number" ? body.page : 1) + 1 };
}

function splitOptions<T extends CallOptions>(options: T | undefined) {
  const { extraBody, ...request } = options ?? ({} as T);
  return { extraBody, request };
}

export function createEndpoint<P, R>(transport: Transport, path: string): Endpoint<P, R>;
export function createEndpoint<P, R>(transport: Transport, path: string, pagination: Pagination): PaginatedEndpoint<P, R>;
export function createEndpoint<P, R>(
  transport: Transport,
  path: string,
  pagination?: Pagination,
): Endpoint<P, R> | PaginatedEndpoint<P, R> {
  const call = (params: P, options?: CallOptions): Promise<R> => {
    const { extraBody, request } = splitOptions(options);
    return transport.request<R>({ ...request, method: "POST", path, body: buildBody(params, extraBody) });
  };

  const submit = async (params: AsyncParams<P>, options: SubmitOptions = {}): Promise<AsyncReceipt> => {
    const { idempotencyKey, ...rest } = options;
    const { extraBody, request } = splitOptions(rest);
    const key = idempotencyKey ?? (await newIdempotencyKey());
    return transport.request<AsyncReceipt>({
      ...request,
      method: "POST",
      path,
      body: buildBody(params, extraBody),
      headers: { ...request.headers, prefer: "respond-async", "idempotency-key": key },
      // The key makes resubmitting safe: PrismCrawl returns the existing job instead of searching again.
      idempotent: true,
    });
  };

  const get = (requestId: string, options: HistoryOptions = {}): Promise<unknown> => {
    const { artifact, ...request } = options;
    if (artifact !== undefined && artifact !== "json" && artifact !== "html") {
      throw new PrismCrawlError('artifact must be "json", "html", or undefined');
    }
    return transport.request({
      ...request,
      method: "GET",
      path: `${path}/${encodeURIComponent(requestId)}`,
      query: artifact ? { artifact } : undefined,
      text: artifact === "html",
    });
  };

  const endpoint = Object.assign(call, { submit, get, path }) as unknown as Endpoint<P, R>;
  if (!pagination) return endpoint;

  async function* pages(params: P, options: PageOptions = {}): AsyncGenerator<R, void, undefined> {
    const { maxPages, ...rest } = options;
    const { extraBody, request } = splitOptions(rest);
    let body: Record<string, unknown> | undefined = buildBody(params, extraBody);
    for (let fetched = 0; body && (maxPages === undefined || fetched < maxPages); fetched++) {
      const page: R = await transport.request<R>({ ...request, method: "POST", path, body });
      yield page;
      body = nextBody(pagination!, body, page);
    }
  }
  return Object.assign(endpoint, { pages }) as unknown as PaginatedEndpoint<P, R>;
}
