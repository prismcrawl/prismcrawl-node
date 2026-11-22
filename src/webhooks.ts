import { webCrypto } from "./async.js";
import { PrismCrawlError } from "./errors.js";

/** The webhook signature is missing, malformed, stale, or doesn't match. Respond with a 4xx. */
export class WebhookVerificationError extends PrismCrawlError {}

export interface VerifyWebhookOptions {
  /** The raw request body, exactly as received. Don't parse and re-serialize it first. */
  payload: string | Uint8Array | ArrayBuffer;
  /** The request headers, as a `Headers` object or a plain object. */
  headers: Headers | Record<string, string | string[] | undefined>;
  /** The `webhook_secret` you sent with the async request. */
  secret: string;
  /** Reject signatures older than this many seconds. Defaults to 300. */
  toleranceSeconds?: number;
  /** Current time in milliseconds, for testing. Defaults to `Date.now()`. */
  now?: number;
}

/** A verified async delivery. */
export interface WebhookEvent {
  /** Unique per job. Retries reuse it, so use it to ignore duplicate deliveries. */
  eventId: string;
  /** The request ID of the completed search. */
  requestId: string | undefined;
  /** HTTP status the search returned. The body is that response, including errors. */
  resultStatus: number;
  /** When this delivery was signed, in Unix seconds. */
  timestamp: number;
  /** The completed response: parsed JSON, or a string for HTML and other text responses. */
  body: unknown;
}

const header = (headers: VerifyWebhookOptions["headers"], name: string): string | undefined => {
  if (typeof (headers as Headers).get === "function") return (headers as Headers).get(name) ?? undefined;
  for (const [key, value] of Object.entries(headers as Record<string, string | string[] | undefined>)) {
    if (key.toLowerCase() === name) return Array.isArray(value) ? value[0] : value;
  }
  return undefined;
};

const toBytes = (payload: VerifyWebhookOptions["payload"]): Uint8Array => {
  if (typeof payload === "string") return new TextEncoder().encode(payload);
  if (payload instanceof Uint8Array) return payload;
  if (payload instanceof ArrayBuffer) return new Uint8Array(payload);
  throw new WebhookVerificationError("payload must be the raw body as a string, Uint8Array, or ArrayBuffer");
};

/**
 * Verify an async result delivered to your webhook and return it.
 *
 * Checks the `Prism-Signature` HMAC-SHA256 over the timestamp and raw body in constant
 * time and rejects stale timestamps. Throws `WebhookVerificationError` if anything is off.
 * Respond with any 2xx within 10 seconds to acknowledge the delivery.
 */
export async function verifyWebhook(options: VerifyWebhookOptions): Promise<WebhookEvent> {
  const { payload, headers, secret, toleranceSeconds = 300, now = Date.now() } = options;
  if (!secret) throw new WebhookVerificationError("secret is required");
  const signature = header(headers, "prism-signature");
  if (!signature) throw new WebhookVerificationError("Missing Prism-Signature header");

  const parts = new Map(
    signature.split(",").map((part) => {
      const index = part.indexOf("=");
      return [part.slice(0, index).trim(), part.slice(index + 1).trim()] as const;
    }),
  );
  const t = parts.get("t");
  const v1 = parts.get("v1");
  if (!t || !/^\d+$/.test(t) || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) {
    throw new WebhookVerificationError("Malformed Prism-Signature header");
  }
  const timestamp = Number(t);
  if (Math.abs(now / 1000 - timestamp) > toleranceSeconds) {
    throw new WebhookVerificationError("Webhook timestamp is outside the allowed tolerance");
  }

  const body = toBytes(payload);
  const prefix = new TextEncoder().encode(`${t}.`);
  const signed = new Uint8Array(prefix.length + body.length);
  signed.set(prefix);
  signed.set(body, prefix.length);

  const { subtle } = await webCrypto();
  const key = await subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "verify",
  ]);
  const expected = new Uint8Array(v1.match(/../g)!.map((byte) => parseInt(byte, 16)));
  // subtle.verify compares in constant time.
  if (!(await subtle.verify("HMAC", key, expected, signed))) {
    throw new WebhookVerificationError("Webhook signature doesn't match");
  }

  const eventId = header(headers, "prism-event-id");
  if (!eventId) throw new WebhookVerificationError("Missing Prism-Event-Id header");
  const text = new TextDecoder().decode(body);
  let parsed: unknown = text;
  if ((header(headers, "content-type") ?? "").includes("json")) {
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new WebhookVerificationError("Webhook body isn't valid JSON");
    }
  }
  return {
    eventId,
    requestId: header(headers, "prism-request-id"),
    resultStatus: Number(header(headers, "prism-result-status") ?? 0),
    timestamp,
    body: parsed,
  };
}
