# Examples

Runnable scripts for common PrismCrawl tasks. Each one reads your API key from `PRISMCRAWL_API_KEY`, and most take an optional query argument.

```bash
npm install prismcrawl
export PRISMCRAWL_API_KEY="YOUR_API_KEY"
npx tsx examples/quickstart.ts "best espresso machines"
```

In this repository, `npm install` first; the examples then run against the local source.

| Script | What it shows | Credits |
|---|---|---|
| [`quickstart.ts`](quickstart.ts) | Google search, printing the organic results | 1 |
| [`local-reviews.ts`](local-reviews.ts) | Find a place on Google Maps, then page through its reviews | 3 |
| [`app-research.ts`](app-research.ts) | App Store search, then product details and reviews in parallel | 3 |
| [`compare-engines.ts`](compare-engines.ts) | Google, Bing, and DuckDuckGo concurrently | 3 |
| [`save-html.ts`](save-html.ts) | Save a results page's source HTML, then look it up in history | 1 |
