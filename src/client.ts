import { Transport, type ClientOptions } from "./core.js";
import { createResources, type Resources } from "./resources.gen.js";

// Merges the generated namespaces (google, bing, yelp, ...) into the class type.
export interface PrismCrawl extends Resources {}

/**
 * PrismCrawl API client.
 *
 * @example
 * ```ts
 * import PrismCrawl from "prismcrawl";
 *
 * const client = new PrismCrawl({ apiKey: "..." }); // or set PRISMCRAWL_API_KEY
 * const response = await client.google.search({ query: "best espresso machines" });
 * ```
 */
export class PrismCrawl {
  /** The HTTP transport. Exposed for advanced use. */
  readonly transport: Transport;

  constructor(options: ClientOptions = {}) {
    this.transport = new Transport(options);
    Object.assign(this, createResources(this.transport));
  }

  /** API base URL this client sends requests to. */
  get baseURL(): string {
    return this.transport.baseURL;
  }
}
