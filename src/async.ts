import type { RequestOptions, Transport } from "./core.js";
import { PrismCrawlError } from "./errors.js";

/** Lifecycle of an async job. */
export type AsyncJobStatus = "queued" | "running" | "complete" | "failed" | "expired";

/** Webhook delivery state for an async job. */
export type AsyncWebhookStatus = "not_configured" | "waiting" | "pending" | "sending" | "delivered" | "failed";

/** Returned by `.submit()` and `client.asyncJobs.status()`. */
export interface AsyncReceipt {
  success: true;
  /** The request ID used in history and in the final response. */
  request_id: string;
  data: {
    job_id: string;
    status: AsyncJobStatus;
    status_url: string;
    result_url: string;
    accepted_at: string;
    /** When the stored result expires (one hour after completion), or null before then. */
    result_expires_at: string | null;
    /** HTTP status of the completed search, or null before completion. */
    result_status: number | null;
    error: string | null;
    webhook: {
      status: AsyncWebhookStatus;
      attempts: number;
      /** HTTP status from your webhook's last response, or 0 when unavailable. */
      response_status: number;
    };
  };
}

/**
 * Async job status and results. Webhooks are the primary way to receive results; use
 * these for troubleshooting, no more often than every five seconds.
 */
export interface AsyncResource {
  /** Current status of an async job. */
  status(jobId: string, options?: RequestOptions): Promise<AsyncReceipt>;
  /**
   * The completed response, exactly as the endpoint would have returned it. Resolves with
   * the job receipt while the job is still running. Throws the original error if the
   * search failed, and a 410 `APIStatusError` once the result has expired.
   */
  result(jobId: string, options?: RequestOptions): Promise<unknown>;
}

const jobPath = (jobId: string) => {
  if (typeof jobId !== "string" || !jobId) throw new PrismCrawlError("jobId must be a non-empty string");
  return `/v1/async/requests/${encodeURIComponent(jobId)}`;
};

export function createAsyncResource(transport: Transport): AsyncResource {
  return {
    status: (jobId, options = {}) => transport.request<AsyncReceipt>({ ...options, method: "GET", path: jobPath(jobId) }),
    result: (jobId, options = {}) => transport.request<unknown>({ ...options, method: "GET", path: `${jobPath(jobId)}/result` }),
  };
}

type WebCrypto = { randomUUID(): string; subtle: SubtleCrypto; getRandomValues<T extends ArrayBufferView>(array: T): T };

/** Web Crypto, from the global on modern runtimes or `node:crypto` on Node 18. */
export async function webCrypto(): Promise<WebCrypto> {
  const global = (globalThis as { crypto?: WebCrypto }).crypto;
  if (global?.subtle && typeof global.randomUUID === "function") return global;
  // Node 18 only exposes Web Crypto through node:crypto. The specifier is a variable so
  // browser and edge bundlers don't try to resolve it; those runtimes have the global.
  const specifier = "node:crypto";
  const nodeCrypto = (await import(/* webpackIgnore: true */ /* @vite-ignore */ specifier)) as { webcrypto: WebCrypto };
  return nodeCrypto.webcrypto;
}

export async function newIdempotencyKey(): Promise<string> {
  return (await webCrypto()).randomUUID();
}
