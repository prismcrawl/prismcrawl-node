# Changelog

## 0.2.0

- Every current PrismCrawl endpoint: 127 endpoints across 21 sources, up from 26, including Google Flights, Hotels, Scholar, Trends, Shopping, Jobs, and Lens, YouTube, Walmart, eBay, Home Depot, Zillow, and more
- Related endpoints nest under their parent, such as `client.google.images.light(...)` alongside `client.google.images(...)`
- `.submit()` on every endpoint for async requests with signed webhooks, with idempotency keys and safe retries
- `verifyWebhook()` to check `Prism-Signature` on webhook deliveries
- `client.asyncJobs.status()` and `client.asyncJobs.result()` for async jobs
- `client.account.requests.list()`, `.pages()`, and `.get()` to search request history across endpoints
- Response types for `output: "md"` (Markdown) and `json_restrictor` (selected fields)
- Google Search accepts `url` in place of `query`
- Webhook fields are rejected at compile time on synchronous calls

## 0.1.0

First release.

- `PrismCrawl` client for every PrismCrawl API endpoint
- Request and response types generated from the OpenAPI spec
- `.get(requestId)` for request history and archived artifacts
- `.pages()` async iterators for paginated endpoints
- `decodeHtml()` for `html: true` responses
- Automatic retries for rate limits, server errors, and connection failures
- ESM and CommonJS builds with no runtime dependencies
