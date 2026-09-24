import type { RequestOptions, Transport } from "./core.js";
import { PrismCrawlError } from "./errors.js";

export interface CallOptions extends RequestOptions {
  /** Additional JSON fields to send, for parameters newer than this SDK. */
  extraBody?: Record<string, unknown>;
}

export interface PageOptions extends CallOptions {
  /** Stop after this many pages. Defaults to no limit. */
  maxPages?: number;
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

export interface Endpoint<Params, Response> {
  /** Run the request. */
  (params: Params, options?: CallOptions): Promise<Response>;
  /** Retrieve the archived source HTML of a previous request. */
  get(requestId: string, options: HistoryOptions & { artifact: "html" }): Promise<string>;
  /** Retrieve a previous request's metadata, or its archived JSON with `{ artifact: "json" }`. */
  get(requestId: string, options?: HistoryOptions & { artifact?: "json" }): Promise<HistoryResponse>;
  /** The API path, such as `/v1/google/search`. */
  readonly path: string;
}

export interface PaginatedEndpoint<Params, Response> extends Endpoint<Params, Response> {
  /**
   * Iterate over pages of results, following the response's pagination until
   * `has_next_page` is false or `maxPages` pages have been fetched. Each page is a
   * separate request and uses one credit.
   */
  pages(params: Params, options?: PageOptions): AsyncGenerator<Response, void, undefined>;
}

type Pagination = "token" | "page";

function buildBody(params: unknown, extraBody?: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries((params ?? {}) as Record<string, unknown>)) {
    if (value !== undefined) body[key] = value;
  }
  return { ...body, ...extraBody };
}

/** Request body for the page after `page`, or undefined when there are no more pages. */
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

  const endpoint = Object.assign(call, { get, path }) as Endpoint<P, R>;
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
  return Object.assign(endpoint, { pages }) as PaginatedEndpoint<P, R>;
}
