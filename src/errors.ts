/** Base class for every error thrown by this package. */
export class PrismCrawlError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** The request never produced an HTTP response (DNS, TLS, connection reset, ...). */
export class APIConnectionError extends PrismCrawlError {
  constructor(message = "Connection error.", options?: { cause?: unknown }) {
    super(message, options);
  }
}

/** The request timed out. */
export class APITimeoutError extends APIConnectionError {
  constructor(options?: { cause?: unknown }) {
    super("Request timed out.", options);
  }
}

/** The request was cancelled with an `AbortSignal`. */
export class APIUserAbortError extends PrismCrawlError {
  constructor(options?: { cause?: unknown }) {
    super("Request was aborted.", options);
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string; rule?: string; reset_at?: string };
  request_id?: string;
}

/** The API returned a non-2xx response. */
export class APIStatusError extends PrismCrawlError {
  /** HTTP status code. */
  readonly status: number;
  /** Machine-readable error code from the response body, such as `invalid_request`. */
  readonly code: string | undefined;
  /** PrismCrawl request id. Include it when contacting support. */
  readonly requestId: string | undefined;
  /** The decoded response body: parsed JSON when possible, otherwise text. */
  readonly body: unknown;
  /** Response headers. */
  readonly headers: Headers;

  constructor(status: number, body: unknown, headers: Headers) {
    const error = errorObject(body);
    const requestId = headers.get("x-request-id") ?? (isRecord(body) ? (body as ErrorBody).request_id : undefined);
    const message = error?.message ?? `Request failed with status ${status}.`;
    super(`[${status}${error?.code ? " " + error.code : ""}] ${message}${requestId ? ` (request_id: ${requestId})` : ""}`);
    this.status = status;
    this.code = error?.code;
    this.requestId = requestId;
    this.body = body;
    this.headers = headers;
  }
}

/** 400: the request body or pagination token is invalid. No credit is used. */
export class BadRequestError extends APIStatusError {}
/** 401: the API key is missing, invalid, expired, or revoked. */
export class AuthenticationError extends APIStatusError {}
/** 402: the account has no search credits left. */
export class InsufficientCreditsError extends APIStatusError {}
/** 404: the request or archived artifact does not exist for this API key. */
export class NotFoundError extends APIStatusError {}
/** 413: the request body is too large. */
export class PayloadTooLargeError extends APIStatusError {}
/** 5xx: PrismCrawl could not complete the request. No credit is used. */
export class InternalServerError extends APIStatusError {}

/** 429: a rate limit was hit. */
export class RateLimitError extends APIStatusError {
  /** The limit that was hit, when the API names one. */
  readonly rule: string | undefined;
  /** ISO-8601 time when the limit resets, when the API provides one. */
  readonly resetAt: string | undefined;

  constructor(status: number, body: unknown, headers: Headers) {
    super(status, body, headers);
    const error = errorObject(body);
    this.rule = error?.rule;
    this.resetAt = error?.reset_at;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function errorObject(body: unknown): ErrorBody["error"] | undefined {
  return isRecord(body) && isRecord(body.error) ? (body.error as ErrorBody["error"]) : undefined;
}

const STATUS_ERRORS: Record<number, typeof APIStatusError> = {
  400: BadRequestError,
  401: AuthenticationError,
  402: InsufficientCreditsError,
  404: NotFoundError,
  413: PayloadTooLargeError,
  429: RateLimitError,
};

export function makeStatusError(status: number, body: unknown, headers: Headers): APIStatusError {
  const Cls = STATUS_ERRORS[status] ?? (status >= 500 ? InternalServerError : APIStatusError);
  return new Cls(status, body, headers);
}
