# PrismCrawl TypeScript SDK

The official TypeScript and JavaScript client for [PrismCrawl](https://www.prismcrawl.com): live search results, AI answers, products, places, and reviews returned as structured JSON. Pass your API key and every PrismCrawl endpoint is one method call away. See the [API reference](https://www.prismcrawl.com/docs) for every endpoint and parameter.

```ts
import PrismCrawl from "prismcrawl";

const client = new PrismCrawl({ apiKey: "YOUR_API_KEY" });
const results = await client.google.search({ query: "best espresso machines" });
```

> **You need a PrismCrawl API key.** Sign up at [prismcrawl.com](https://www.prismcrawl.com) and create a key in the dashboard. It's free, and you don't need a card.
>
> **Pricing:** at volume, prepaid credit packages bring the price as low as **$0.15 per 1,000 successful requests**, and failed requests are free. That's **100x cheaper than SerpApi**. See [pricing](#pricing).

## Why PrismCrawl

- **As low as $0.15 per 1,000 successful requests** at volume, 100x cheaper than SerpApi
- **You only pay for successes.** Failed requests are free.
- **Free to start:** 100 free credits, and you don't need a card
- **No subscription:** prepaid credit packages from $5, valid for 90 days
- **One key covers 26 endpoints:** Google, Bing, DuckDuckGo, Amazon, Google Maps, Apple Maps, Yelp, Tripadvisor, Google Play, and the Apple App Store
- **Answers from AI search engines:** Google AI Overviews, Google AI Mode, and Bing's AI overview with citations, at no additional charge
- **Live, uncached results:** every request fetches fresh data from the source
- **Proven at scale:** 99% successful response rate and more than 1 billion SERPs every month
- **See every request:** filter your request history in the [dashboard](https://www.prismcrawl.com) by query, provider, status, format, or date. You can check the parameters, timing, and credits for each request, copy it as cURL, rerun it, or download the saved HTML/JSON. Request details are kept for 90 days and the HTML/JSON for 30 days. To skip storing the results of a request, pass `zero_trace: true`.

## What it can do

- **Search:** Google (including AI Overviews, AI Mode, Shopping, and Local results), Bing (including its AI overview with citations), DuckDuckGo, and Amazon
- **Maps and places:** Google Maps, Bing Maps, Apple Maps, DuckDuckGo Maps, Yelp, and Tripadvisor
- **Reviews:** Google Maps, Google contributors, Yelp, Tripadvisor, Apple Maps, Google Play, and the Apple App Store
- **App stores:** Google Play (apps, games, books, movies) and the Apple App Store: search, product details, and reviews
- **Shopping:** Google Shopping product details and merchant offers

## SDK features

- Every endpoint, with types for every parameter and response field, generated from the API spec
- No runtime dependencies; uses the built-in `fetch`
- Automatic retries for rate limits, server errors, and connection failures
- Async iterators for paginated endpoints
- Helpers for request history and source HTML
- ESM and CommonJS builds

## Installation

```bash
npm install prismcrawl
```

Requires Node.js 18 or later. It also runs on Bun, Deno, and other runtimes with `fetch`.

## Quick start

Create an API key in the [PrismCrawl dashboard](https://www.prismcrawl.com). New accounts get 100 free credits.

```ts
import PrismCrawl from "prismcrawl";

const client = new PrismCrawl({ apiKey: "YOUR_API_KEY" });

const response = await client.google.search({ query: "best espresso machines", gl: "us" });

if (response.data.format === "json") {
  for (const result of response.data.content.results) {
    console.log(result.rank, result.title, result.url);
  }
}
```

If you don't pass `apiKey`, the client reads the `PRISMCRAWL_API_KEY` environment variable:

```ts
const client = new PrismCrawl();
```

CommonJS works too:

```js
const { PrismCrawl } = require("prismcrawl");
```

Keep your API key on the server. Don't ship it to browsers.

More complete, runnable scripts are in [`examples/`](https://github.com/prismcrawl/prismcrawl-node/tree/main/examples).

## Endpoints

Each endpoint is a function. Calling it runs the request. Every endpoint also has `.get(requestId)` to fetch a previous request, and paginated endpoints have `.pages(...)`.

| Method | API endpoint |
|---|---|
| `client.google.search(...)` | `POST /v1/google/search` |
| `client.google.maps.search(...)` | `POST /v1/google/maps/search` |
| `client.google.maps.reviews(...)` | `POST /v1/google/maps/reviews` |
| `client.google.contributor.reviews(...)` | `POST /v1/google/contributor/reviews` |
| `client.google.shopping.product(...)` | `POST /v1/google/shopping/product` |
| `client.google.play.apps.search(...)` | `POST /v1/google/play/apps/search` |
| `client.google.play.games.search(...)` | `POST /v1/google/play/games/search` |
| `client.google.play.books.search(...)` | `POST /v1/google/play/books/search` |
| `client.google.play.movies.search(...)` | `POST /v1/google/play/movies/search` |
| `client.google.play.product(...)` | `POST /v1/google/play/product` |
| `client.google.play.reviews(...)` | `POST /v1/google/play/reviews` |
| `client.bing.search(...)` | `POST /v1/microsoft/search` |
| `client.bing.maps.search(...)` | `POST /v1/microsoft/maps/search` |
| `client.duckduckgo.search(...)` | `POST /v1/duckduckgo/search` |
| `client.duckduckgo.maps.search(...)` | `POST /v1/duckduckgo/maps/search` |
| `client.amazon.search(...)` | `POST /v1/amazon/search` |
| `client.apple.maps.search(...)` | `POST /v1/apple/maps/search` |
| `client.apple.maps.reviews(...)` | `POST /v1/apple/maps/reviews` |
| `client.apple.appStore.search(...)` | `POST /v1/apple/app-store/search` |
| `client.apple.appStore.product(...)` | `POST /v1/apple/app-store/product` |
| `client.apple.appStore.reviews(...)` | `POST /v1/apple/app-store/reviews` |
| `client.yelp.search(...)` | `POST /v1/yelp/search` |
| `client.yelp.reviews(...)` | `POST /v1/yelp/reviews` |
| `client.tripadvisor.search(...)` | `POST /v1/tripadvisor/search` |
| `client.tripadvisor.place(...)` | `POST /v1/tripadvisor/place` |
| `client.tripadvisor.reviews(...)` | `POST /v1/tripadvisor/reviews` |

`client.bing` and `client.microsoft` are the same namespace. The API paths use `microsoft`.

Parameters use the same snake_case names as the [API reference](https://www.prismcrawl.com/docs). Your editor shows each parameter's type and description.

```ts
const places = await client.google.maps.search({
  query: "coffee shop",
  coordinates: { latitude: 30.2672, longitude: -97.7431 },
  zoom: 14,
});

const reviews = await client.google.maps.reviews({ id: "ChIJ...", limit: 20 });

const products = await client.amazon.search({ query: "espresso machine" });
```

## AI answers

Google AI Overviews and Bing's AI overview come back in `serp_features` with type `ai_summary`. For Google's AI Mode, pass `udm: 50`:

```ts
const response = await client.google.search({ query: "compare electric cars for a family", udm: 50 });

if (response.data.format === "json") {
  for (const feature of response.data.content.serp_features) {
    if (feature.type === "ai_summary") console.log(feature);
  }
}
```

## Pagination

Paginated endpoints have a `.pages()` async iterator that takes the same parameters. It follows `next_page_token` (or `page`) until `has_next_page` is false.

```ts
for await (const page of client.yelp.reviews.pages({ id: "halcyon-austin-2" }, { maxPages: 5 })) {
  if (page.data.format === "json") {
    for (const review of page.data.content.results) console.log(review.rating, review.text);
  }
}
```

Each page is a separate request and uses one credit. Use `maxPages` to cap spending.

## Request history

Every response includes a `request_id`. Fetch a previous request with `.get()` on the endpoint that made it:

```ts
const response = await client.google.search({ query: "best espresso machines" });

const metadata = await client.google.search.get(response.request_id);
const archived = await client.google.search.get(response.request_id, { artifact: "json" }); // parsed response
const source = await client.google.search.get(response.request_id, { artifact: "html" }); // source HTML string
```

A new request can take a few seconds to appear in history. Until then, `.get()` rejects with `NotFoundError`.

Requests made with `zero_trace: true` aren't archived. For those, `.get()` returns only the status code and whether a credit was charged.

## Source HTML

Pass `html: true` to get the provider's original page instead of parsed JSON. The API returns it as Base64-encoded Brotli, and `decodeHtml` converts it back to a string:

```ts
import { decodeHtml } from "prismcrawl";

const response = await client.google.search({ query: "best espresso machines", html: true });
const html = await decodeHtml(response);
```

`decodeHtml` uses `node:zlib`, so it needs Node.js, Bun, or Deno.

## Errors

Every error extends `PrismCrawlError`. API errors carry the HTTP `status`, the error `code`, and the `requestId` to give support.

```ts
import { APIStatusError, InsufficientCreditsError, RateLimitError } from "prismcrawl";

try {
  await client.google.search({ query: "best espresso machines" });
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log("Rate limited until", error.resetAt);
  } else if (error instanceof InsufficientCreditsError) {
    console.log("Out of credits");
  } else if (error instanceof APIStatusError) {
    console.log(error.status, error.code, error.message, error.requestId);
  } else {
    throw error;
  }
}
```

| Status | Error |
|---|---|
| 400 | `BadRequestError` |
| 401 | `AuthenticationError` |
| 402 | `InsufficientCreditsError` |
| 404 | `NotFoundError` |
| 413 | `PayloadTooLargeError` |
| 429 | `RateLimitError` |
| 5xx | `InternalServerError` |
| other | `APIStatusError` |
| no response | `APIConnectionError`, `APITimeoutError` |
| aborted | `APIUserAbortError` |

Failed requests don't use credits.

## Retries, timeouts, and cancellation

The client retries up to 2 times, with exponential backoff, on:

- 429 responses, waiting until the limit resets if that's within 30 seconds
- 5xx responses
- connection failures

It never retries a search after the request was sent and the connection dropped, because the search may have completed and used a credit.

```ts
const client = new PrismCrawl({ maxRetries: 5, timeout: 60_000 });

// Per-request options
await client.google.search({ query: "..." }, { timeout: 10_000, maxRetries: 0 });

// Cancellation
const controller = new AbortController();
const promise = client.google.search({ query: "..." }, { signal: controller.signal });
controller.abort();
```

The default timeout is 120 seconds.

## Configuration

```ts
const client = new PrismCrawl({
  apiKey: "YOUR_API_KEY",
  baseURL: "https://api.prismcrawl.com", // or PRISMCRAWL_BASE_URL
  timeout: 120_000,
  maxRetries: 2,
  defaultHeaders: { "x-my-header": "value" },
  fetch: customFetch, // for proxies, logging, or tests
});
```

If the API adds a parameter before this SDK does, pass it with `extraBody`:

```ts
await client.google.search({ query: "..." }, { extraBody: { new_param: true } });
```

## Types

Every request and response type is exported:

```ts
import type { GoogleSearchRequest, GoogleSearchResponse, YelpReviewsResult } from "prismcrawl";
```

The raw OpenAPI types are exported too, as `components`, `paths`, and `operations`.

## Pricing

Each successful request uses one PrismCrawl credit. Failed requests are free. Fetching another page is a separate request and uses a credit, including each page from `.pages()`.

- 100 free credits for new accounts
- Prepaid credit packages from $5, with no subscription
- As low as $0.15 per 1,000 successful requests at volume, 100x cheaper than SerpApi
- Credits are valid for 90 days

See [prismcrawl.com](https://www.prismcrawl.com) for current pricing.

## Development

The endpoint definitions and types come from the API's OpenAPI spec. To regenerate them:

```bash
npm run generate:fetch   # download the latest spec, then regenerate
npm run generate         # regenerate from openapi.json
```

Run the checks:

```bash
npm install
npm run typecheck && npm test && npm run build && npm run check:package
```

## Resources

- [PrismCrawl](https://www.prismcrawl.com): sign up, create API keys, and view your request history
- [API reference](https://www.prismcrawl.com/docs): every endpoint and parameter
- [Examples](https://github.com/prismcrawl/prismcrawl-node/tree/main/examples): runnable scripts for common tasks
- [Python SDK](https://github.com/prismcrawl/prismcrawl-python)
- [MCP server](https://www.prismcrawl.com/mcp): connect Claude, Cursor, and other AI assistants to PrismCrawl ([GitHub](https://github.com/prismcrawl/prismcrawl-mcp))

## Support

Email support@prismcrawl.com. To report a bug in this SDK, [open an issue](https://github.com/prismcrawl/prismcrawl-node/issues).

## License

MIT
