import { PrismCrawlError } from "./errors.js";

interface HtmlData {
  format: "html+br+base64";
  content: string;
}

type HtmlInput = { data: HtmlData | { format: string; content: unknown } } | HtmlData | string;

/**
 * Decode the source HTML from a response made with `html: true`.
 *
 * Accepts the whole response, its `data` object, or the Base64 `content` string. The
 * content is Base64-encoded, Brotli-compressed HTML. Decoding uses `node:zlib`, so it
 * works in Node.js 18+, Bun, and Deno.
 */
export async function decodeHtml(input: HtmlInput): Promise<string> {
  let content: unknown = input;
  if (typeof content === "object" && content !== null && "data" in content) content = content.data;
  if (typeof content === "object" && content !== null) {
    const data = content as { format?: unknown; content?: unknown };
    if (data.format !== "html+br+base64") {
      throw new PrismCrawlError("Response does not contain HTML. Make the request with html: true.");
    }
    content = data.content;
  }
  if (typeof content !== "string") {
    throw new PrismCrawlError("Expected a response, its data object, or a Base64 string.");
  }
  let zlib: typeof import("node:zlib");
  try {
    zlib = await import("node:zlib");
  } catch (cause) {
    throw new PrismCrawlError("decodeHtml needs node:zlib, which this runtime doesn't provide.", { cause });
  }
  return zlib.brotliDecompressSync(Buffer.from(content, "base64")).toString("utf8");
}
