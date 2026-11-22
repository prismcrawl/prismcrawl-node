import type { RequestOptions, Transport } from "./core.js";
import type { HistoryResponse } from "./endpoint.js";
import { PrismCrawlError } from "./errors.js";
import type { components } from "./openapi.gen.js";

/** Filters for `client.account.requests.list()`. */
export interface RequestListParams {
  /** Exact request ID, matched case-insensitively. */
  q?: string;
  /** Inclusive lower bound on completion time, as an ISO 8601 timestamp. */
  from?: string;
  /** Inclusive upper bound on completion time, as an ISO 8601 timestamp. */
  to?: string;
  /** Provider or service ID, such as `google`, `google_maps`, or `yelp_reviews`. */
  provider?: string;
  /** The original request's outcome. */
  status?: "success" | "failure";
  /** Recorded response format, or `zero_trace` for limited zero-trace audit records. */
  format?: "json" | "html+br+base64" | "md" | "zero_trace";
  /** Whether the saved response archive is available and unexpired. */
  archive?: "available" | "unavailable";
  /** Rows per page, 1 to 100. Defaults to 50. */
  limit?: number;
  /** `next_cursor` from the previous page. Omit for the first page. */
  cursor?: string;
}

/** A page of request history. */
export type RequestListResponse = components["schemas"]["RequestHistoryListResponse"];

export interface RequestListPageOptions extends RequestOptions {
  /** Stop after this many pages. Defaults to no limit. */
  maxPages?: number;
}

export interface AccountRequestsResource {
  /** Search your request history, newest first. */
  list(params?: RequestListParams, options?: RequestOptions): Promise<RequestListResponse>;
  /** Yield each page of request history, following `next_cursor`. */
  pages(params?: RequestListParams, options?: RequestListPageOptions): AsyncGenerator<RequestListResponse, void, undefined>;
  /** Metadata for any past request, by request ID. */
  get(requestId: string, options?: RequestOptions): Promise<HistoryResponse>;
}

export interface AccountResource {
  readonly requests: AccountRequestsResource;
}

const query = (params: RequestListParams = {}): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null) out[key] = String(value);
  return out;
};

export function createAccountResource(transport: Transport): AccountResource {
  const list = (params?: RequestListParams, options: RequestOptions = {}) =>
    transport.request<RequestListResponse>({ ...options, method: "GET", path: "/v1/account/requests", query: query(params) });

  async function* pages(params: RequestListParams = {}, options: RequestListPageOptions = {}) {
    const { maxPages, ...request } = options;
    let cursor = params.cursor;
    for (let fetched = 0; maxPages === undefined || fetched < maxPages; fetched++) {
      const page = await list({ ...params, cursor }, request);
      yield page;
      cursor = page.data.next_cursor || undefined;
      if (!cursor) return;
    }
  }

  const get = (requestId: string, options: RequestOptions = {}) => {
    if (typeof requestId !== "string" || !requestId) throw new PrismCrawlError("requestId must be a non-empty string");
    return transport.request<HistoryResponse>({
      ...options,
      method: "GET",
      path: `/v1/account/requests/${encodeURIComponent(requestId)}`,
    });
  };

  return { requests: { list, pages, get } };
}
