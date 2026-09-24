# Changelog

## 0.1.0

First release.

- `PrismCrawl` client for every PrismCrawl API endpoint
- Request and response types generated from the OpenAPI spec
- `.get(requestId)` for request history and archived artifacts
- `.pages()` async iterators for paginated endpoints
- `decodeHtml()` for `html: true` responses
- Automatic retries for rate limits, server errors, and connection failures
- ESM and CommonJS builds with no runtime dependencies
