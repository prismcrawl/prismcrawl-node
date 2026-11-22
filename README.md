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
- **One key covers 127 endpoints across 21 sources:** Google, Bing, Amazon, Apple, YouTube, Walmart, eBay, Home Depot, DuckDuckGo, Yahoo, Yandex, Baidu, Naver, Brave, Yelp, Tripadvisor, OpenTable, Airbnb, Zillow, Instagram, and Facebook
- **Answers from AI search engines:** Google AI Overviews, Google AI Mode (with follow-up questions), Bing Copilot, Brave AI Mode, and Naver AI Mode, at no additional charge
- **Live, uncached results:** every request fetches fresh data from the source
- **Proven at scale:** 99% successful response rate and more than 1 billion SERPs every month
- **See every request:** filter your request history in the [dashboard](https://www.prismcrawl.com) by query, provider, status, format, or date. You can check the parameters, timing, and credits for each request, copy it as cURL, rerun it, or download the saved HTML/JSON. Request details are kept for 90 days and the HTML/JSON for 30 days. To skip storing the results of a request, pass `zero_trace: true`.

## What it can do

- **Search:** Google (including AI Overviews, AI Mode, Light, Forums, News, Images, Videos, Short Videos, Lens, and reverse image search), Bing (including Copilot, News, Images, and Videos), DuckDuckGo, Yahoo, Yandex, Baidu, Naver, and Brave
- **Maps and places:** Google Maps (search, directions, photos, posts, and reviews), Bing Maps, Apple Maps, DuckDuckGo Maps, Yelp, Tripadvisor, and OpenTable
- **Shopping:** Google Shopping, Amazon, Walmart, eBay, Home Depot, and Bing Shopping, with product details, sellers, and reviews
- **Travel:** Google Flights, Hotels, and Travel Explore, Airbnb, and Zillow listings
- **Research and data:** Google Scholar, Patents, Trends, Finance, Jobs, Events, Sports, and Ads Transparency
- **Video and social:** YouTube search, channels, videos, and transcripts, plus Instagram and Facebook profiles
- **App stores:** Google Play (apps, games, books, movies) and the Apple App Store: search, product details, and reviews
- **Google links:** decode Google `/goto` and `/url` result links into their destinations

## SDK features

- Every endpoint, with types for every parameter and response field, generated from the API spec
- No runtime dependencies; uses the built-in `fetch`
- Automatic retries for rate limits, server errors, and connection failures
- Async iterators for paginated endpoints
- Markdown output and `json_restrictor` field selection, with matching response types
- Async requests with signed webhooks, and a `verifyWebhook()` helper
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

Each endpoint is a function. Calling it runs the request. Every endpoint also has `.submit(...)` to run it asynchronously and `.get(requestId)` to fetch a previous request, and paginated endpoints (marked ⋯ below) have `.pages(...)`.

Some endpoints have related endpoints under them: `client.google.images(...)` runs Google Images, and `client.google.images.light(...)` runs Google Images Light.

<details>
<summary><strong>Google</strong> (67)</summary>

| Method | API endpoint | Description |
|---|---|---|
| `client.google.aboutThisResult(...)` | `POST /v1/google/about-this-result` | Google About This Result |
| `client.google.ads(...)` | `POST /v1/google/ads` | Google Ads |
| `client.google.ads.transparency(...)` ⋯ | `POST /v1/google/ads/transparency` | Google Ads Transparency |
| `client.google.ads.transparency.details(...)` | `POST /v1/google/ads/transparency/details` | Google Ads Transparency Ad Details |
| `client.google.aiMode(...)` | `POST /v1/google/ai-mode` | Google AI Mode |
| `client.google.aiOverview(...)` | `POST /v1/google/ai-overview` | Google AI Overview |
| `client.google.autocomplete(...)` | `POST /v1/google/autocomplete` | Google Autocomplete |
| `client.google.contributor.reviews(...)` ⋯ | `POST /v1/google/contributor/reviews` | Google Contributor Reviews |
| `client.google.decode(...)` | `POST /v1/google/decode` | Google Link Decoder |
| `client.google.events(...)` | `POST /v1/google/events` | Google Events |
| `client.google.finance(...)` | `POST /v1/google/finance` | Google Finance |
| `client.google.finance.markets(...)` | `POST /v1/google/finance/markets` | Google Finance Markets |
| `client.google.flights.autocomplete(...)` | `POST /v1/google/flights/autocomplete` | Google Flights Autocomplete |
| `client.google.flights.deals(...)` | `POST /v1/google/flights/deals` | Google Flights Deals |
| `client.google.flights.search(...)` | `POST /v1/google/flights/search` | Google Flights |
| `client.google.forums(...)` ⋯ | `POST /v1/google/forums` | Google Forums |
| `client.google.hotels.autocomplete(...)` | `POST /v1/google/hotels/autocomplete` | Google Hotels Autocomplete |
| `client.google.hotels.photos(...)` ⋯ | `POST /v1/google/hotels/photos` | Google Hotels Photos |
| `client.google.hotels.reviews(...)` ⋯ | `POST /v1/google/hotels/reviews` | Google Hotels Reviews |
| `client.google.hotels.search(...)` ⋯ | `POST /v1/google/hotels/search` | Google Hotels |
| `client.google.images(...)` ⋯ | `POST /v1/google/images` | Google Images |
| `client.google.images.light(...)` ⋯ | `POST /v1/google/images/light` | Google Images Light |
| `client.google.images.relatedContent(...)` | `POST /v1/google/images/related-content` | Google Images Related Content |
| `client.google.jobs(...)` ⋯ | `POST /v1/google/jobs` | Google Jobs |
| `client.google.jobs.listing(...)` | `POST /v1/google/jobs/listing` | Google Jobs Listing |
| `client.google.lens(...)` | `POST /v1/google/lens` | Google Lens |
| `client.google.light.search(...)` ⋯ | `POST /v1/google/light/search` | Google Light Search |
| `client.google.local(...)` | `POST /v1/google/local` | Google Local |
| `client.google.local.services(...)` | `POST /v1/google/local/services` | Google Local Services |
| `client.google.maps.autocomplete(...)` | `POST /v1/google/maps/autocomplete` | Google Maps Autocomplete |
| `client.google.maps.directions(...)` | `POST /v1/google/maps/directions` | Google Maps Directions |
| `client.google.maps.photos(...)` ⋯ | `POST /v1/google/maps/photos` | Google Maps Photos |
| `client.google.maps.photos.meta(...)` | `POST /v1/google/maps/photos/meta` | Google Maps Photo Metadata |
| `client.google.maps.posts(...)` ⋯ | `POST /v1/google/maps/posts` | Google Maps Posts |
| `client.google.maps.reviews(...)` ⋯ | `POST /v1/google/maps/reviews` | Google Maps Reviews |
| `client.google.maps.search(...)` | `POST /v1/google/maps/search` | Search Google Maps |
| `client.google.news(...)` ⋯ | `POST /v1/google/news` | Google News |
| `client.google.news.light(...)` ⋯ | `POST /v1/google/news/light` | Google News Light |
| `client.google.patents.details(...)` | `POST /v1/google/patents/details` | Google Patents Details |
| `client.google.patents.search(...)` ⋯ | `POST /v1/google/patents/search` | Google Patents |
| `client.google.play.apps.search(...)` ⋯ | `POST /v1/google/play/apps/search` | Google Play Apps |
| `client.google.play.books.search(...)` ⋯ | `POST /v1/google/play/books/search` | Google Play Books |
| `client.google.play.games.search(...)` ⋯ | `POST /v1/google/play/games/search` | Google Play Games |
| `client.google.play.movies.search(...)` ⋯ | `POST /v1/google/play/movies/search` | Google Play Movies |
| `client.google.play.product(...)` | `POST /v1/google/play/product` | Google Play Product |
| `client.google.play.reviews(...)` ⋯ | `POST /v1/google/play/reviews` | Google Play Reviews |
| `client.google.relatedQuestions(...)` ⋯ | `POST /v1/google/related-questions` | Google Related Questions |
| `client.google.reverseImage(...)` | `POST /v1/google/reverse-image` | Google Reverse Image |
| `client.google.scholar.author(...)` ⋯ | `POST /v1/google/scholar/author` | Google Scholar Author |
| `client.google.scholar.caseLaw(...)` ⋯ | `POST /v1/google/scholar/case-law` | Google Scholar Case Law |
| `client.google.scholar.cite(...)` | `POST /v1/google/scholar/cite` | Google Scholar Cite |
| `client.google.scholar.search(...)` ⋯ | `POST /v1/google/scholar/search` | Google Scholar |
| `client.google.search(...)` | `POST /v1/google/search` | Search Google |
| `client.google.shopping(...)` ⋯ | `POST /v1/google/shopping` | Google Shopping |
| `client.google.shopping.filters(...)` | `POST /v1/google/shopping/filters` | Google Shopping Filters |
| `client.google.shopping.immersiveProduct(...)` ⋯ | `POST /v1/google/shopping/immersive-product` | Google Immersive Product |
| `client.google.shopping.light(...)` ⋯ | `POST /v1/google/shopping/light` | Google Shopping Light |
| `client.google.shopping.product(...)` | `POST /v1/google/shopping/product` | Google Shopping Product |
| `client.google.shortVideos(...)` ⋯ | `POST /v1/google/short-videos` | Google Short Videos |
| `client.google.sports(...)` | `POST /v1/google/sports` | Google Sports |
| `client.google.travel.explore(...)` | `POST /v1/google/travel/explore` | Google Travel Explore |
| `client.google.trends(...)` | `POST /v1/google/trends` | Google Trends |
| `client.google.trends.autocomplete(...)` | `POST /v1/google/trends/autocomplete` | Google Trends Autocomplete |
| `client.google.trends.news(...)` | `POST /v1/google/trends/news` | Google Trends News |
| `client.google.trends.trendingNow(...)` | `POST /v1/google/trends/trending-now` | Google Trends Trending Now |
| `client.google.videos(...)` ⋯ | `POST /v1/google/videos` | Google Videos |
| `client.google.videos.light(...)` ⋯ | `POST /v1/google/videos/light` | Google Videos Light |

</details>

<details>
<summary><strong>Airbnb</strong> (1)</summary>

| Method | API endpoint | Description |
|---|---|---|
| `client.airbnb.search(...)` ⋯ | `POST /v1/airbnb/search` | Airbnb Search |

</details>

<details>
<summary><strong>Amazon</strong> (3)</summary>

| Method | API endpoint | Description |
|---|---|---|
| `client.amazon.autocomplete(...)` | `POST /v1/amazon/autocomplete` | Amazon Autocomplete |
| `client.amazon.product(...)` | `POST /v1/amazon/product` | Amazon Product |
| `client.amazon.search(...)` ⋯ | `POST /v1/amazon/search` | Search Amazon |

</details>

<details>
<summary><strong>Apple</strong> (6)</summary>

| Method | API endpoint | Description |
|---|---|---|
| `client.apple.appStore.product(...)` | `POST /v1/apple/app-store/product` | Apple App Store Product |
| `client.apple.appStore.reviews(...)` ⋯ | `POST /v1/apple/app-store/reviews` | Apple App Store Reviews |
| `client.apple.appStore.search(...)` ⋯ | `POST /v1/apple/app-store/search` | Apple App Store Search |
| `client.apple.maps.place(...)` | `POST /v1/apple/maps/place` | Apple Maps Places |
| `client.apple.maps.reviews(...)` | `POST /v1/apple/maps/reviews` | Apple Maps Reviews |
| `client.apple.maps.search(...)` | `POST /v1/apple/maps/search` | Apple Maps Search |

</details>

<details>
<summary><strong>Baidu</strong> (2)</summary>

| Method | API endpoint | Description |
|---|---|---|
| `client.baidu.news.search(...)` ⋯ | `POST /v1/baidu/news/search` | Baidu News |
| `client.baidu.search(...)` ⋯ | `POST /v1/baidu/search` | Baidu Search |

</details>

<details>
<summary><strong>Bing</strong> (9)</summary>

| Method | API endpoint | Description |
|---|---|---|
| `client.bing.copilot(...)` | `POST /v1/microsoft/copilot` | Bing Copilot |
| `client.bing.images.reverse(...)` ⋯ | `POST /v1/microsoft/images/reverse` | Bing Reverse Image |
| `client.bing.images.search(...)` ⋯ | `POST /v1/microsoft/images/search` | Bing Images |
| `client.bing.maps.search(...)` | `POST /v1/microsoft/maps/search` | Bing Maps |
| `client.bing.news.search(...)` ⋯ | `POST /v1/microsoft/news/search` | Bing News |
| `client.bing.search(...)` ⋯ | `POST /v1/microsoft/search` | Search Bing |
| `client.bing.shopping.product(...)` | `POST /v1/microsoft/shopping/product` | Bing Product |
| `client.bing.shopping.search(...)` ⋯ | `POST /v1/microsoft/shopping/search` | Bing Shopping |
| `client.bing.videos.search(...)` ⋯ | `POST /v1/microsoft/videos/search` | Bing Videos |

</details>

<details>
<summary><strong>Brave</strong> (1)</summary>

| Method | API endpoint | Description |
|---|---|---|
| `client.brave.aiMode(...)` ⋯ | `POST /v1/brave/ai-mode` | Brave AI Mode |

</details>

<details>
<summary><strong>DuckDuckGo</strong> (4)</summary>

| Method | API endpoint | Description |
|---|---|---|
| `client.duckduckgo.maps.search(...)` | `POST /v1/duckduckgo/maps/search` | DuckDuckGo Maps |
| `client.duckduckgo.news.search(...)` ⋯ | `POST /v1/duckduckgo/news/search` | DuckDuckGo News |
| `client.duckduckgo.search(...)` ⋯ | `POST /v1/duckduckgo/search` | DuckDuckGo Search |
| `client.duckduckgo.search.light(...)` ⋯ | `POST /v1/duckduckgo/search/light` | DuckDuckGo Light |

</details>

<details>
<summary><strong>eBay</strong> (3)</summary>

| Method | API endpoint | Description |
|---|---|---|
| `client.ebay.product(...)` | `POST /v1/ebay/product` | eBay Product |
| `client.ebay.search(...)` ⋯ | `POST /v1/ebay/search` | eBay Search |
| `client.ebay.seller(...)` ⋯ | `POST /v1/ebay/seller` | eBay Seller |

</details>

<details>
<summary><strong>Facebook</strong> (1)</summary>

| Method | API endpoint | Description |
|---|---|---|
| `client.facebook.profile(...)` | `POST /v1/facebook/profile` | Facebook Profile |

</details>

<details>
<summary><strong>Home Depot</strong> (3)</summary>

| Method | API endpoint | Description |
|---|---|---|
| `client.homeDepot.product(...)` | `POST /v1/home-depot/product` | Home Depot Product |
| `client.homeDepot.reviews(...)` ⋯ | `POST /v1/home-depot/reviews` | Home Depot Reviews |
| `client.homeDepot.search(...)` ⋯ | `POST /v1/home-depot/search` | Home Depot Search |

</details>

<details>
<summary><strong>Instagram</strong> (1)</summary>

| Method | API endpoint | Description |
|---|---|---|
| `client.instagram.profile(...)` ⋯ | `POST /v1/instagram/profile` | Instagram Profile |

</details>

<details>
<summary><strong>Naver</strong> (3)</summary>

| Method | API endpoint | Description |
|---|---|---|
| `client.naver.aiMode(...)` | `POST /v1/naver/ai-mode` | Naver AI Mode |
| `client.naver.aiOverview(...)` | `POST /v1/naver/ai-overview` | Naver AI Overview |
| `client.naver.search(...)` ⋯ | `POST /v1/naver/search` | Naver Search |

</details>

<details>
<summary><strong>OpenTable</strong> (1)</summary>

| Method | API endpoint | Description |
|---|---|---|
| `client.opentable.reviews(...)` ⋯ | `POST /v1/opentable/reviews` | OpenTable Reviews |

</details>

<details>
<summary><strong>Tripadvisor</strong> (3)</summary>

| Method | API endpoint | Description |
|---|---|---|
| `client.tripadvisor.place(...)` | `POST /v1/tripadvisor/place` | Tripadvisor Place |
| `client.tripadvisor.reviews(...)` ⋯ | `POST /v1/tripadvisor/reviews` | Tripadvisor Reviews |
| `client.tripadvisor.search(...)` ⋯ | `POST /v1/tripadvisor/search` | Tripadvisor Search |

</details>

<details>
<summary><strong>Walmart</strong> (4)</summary>

| Method | API endpoint | Description |
|---|---|---|
| `client.walmart.product(...)` | `POST /v1/walmart/product` | Walmart Product |
| `client.walmart.product.sellers(...)` | `POST /v1/walmart/product/sellers` | Walmart Sellers |
| `client.walmart.reviews(...)` ⋯ | `POST /v1/walmart/reviews` | Walmart Reviews |
| `client.walmart.search(...)` ⋯ | `POST /v1/walmart/search` | Walmart Search |

</details>

<details>
<summary><strong>Yahoo</strong> (4)</summary>

| Method | API endpoint | Description |
|---|---|---|
| `client.yahoo.images.search(...)` ⋯ | `POST /v1/yahoo/images/search` | Yahoo Images |
| `client.yahoo.search(...)` ⋯ | `POST /v1/yahoo/search` | Yahoo Search |
| `client.yahoo.trends(...)` ⋯ | `POST /v1/yahoo/trends` | Yahoo Trends |
| `client.yahoo.videos.search(...)` ⋯ | `POST /v1/yahoo/videos/search` | Yahoo Videos |

</details>

<details>
<summary><strong>Yandex</strong> (3)</summary>

| Method | API endpoint | Description |
|---|---|---|
| `client.yandex.images.search(...)` ⋯ | `POST /v1/yandex/images/search` | Yandex Images |
| `client.yandex.search(...)` ⋯ | `POST /v1/yandex/search` | Yandex Search |
| `client.yandex.videos.search(...)` ⋯ | `POST /v1/yandex/videos/search` | Yandex Videos |

</details>

<details>
<summary><strong>Yelp</strong> (3)</summary>

| Method | API endpoint | Description |
|---|---|---|
| `client.yelp.place(...)` | `POST /v1/yelp/place` | Yelp Place |
| `client.yelp.reviews(...)` ⋯ | `POST /v1/yelp/reviews` | Yelp Reviews |
| `client.yelp.search(...)` ⋯ | `POST /v1/yelp/search` | Yelp Search |

</details>

<details>
<summary><strong>YouTube</strong> (4)</summary>

| Method | API endpoint | Description |
|---|---|---|
| `client.youtube.channel(...)` ⋯ | `POST /v1/youtube/channel` | YouTube Channel |
| `client.youtube.search(...)` ⋯ | `POST /v1/youtube/search` | YouTube Search |
| `client.youtube.transcript(...)` | `POST /v1/youtube/transcript` | YouTube Video Transcript |
| `client.youtube.video(...)` ⋯ | `POST /v1/youtube/video` | YouTube Video |

</details>

<details>
<summary><strong>Zillow</strong> (1)</summary>

| Method | API endpoint | Description |
|---|---|---|
| `client.zillow.search(...)` ⋯ | `POST /v1/zillow/search` | Zillow Search |

</details>

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

Google AI Overviews and Bing's AI overview come back in `serp_features` with type `ai_summary`. Google AI Mode has its own endpoint, and supports follow-up questions:

```ts
const first = await client.google.aiMode({ query: "compare electric cars for a family", continuable: true });

if (first.data.format === "json" && first.data.content.subsequent_request_token) {
  await client.google.aiMode({
    query: "which has the most cargo space?",
    subsequent_request_token: first.data.content.subsequent_request_token,
  });
}
```

Follow-up tokens expire after 15 minutes. `client.naver.aiMode` works the same way.

## Markdown and field selection

Pass `output: "md"` to get Markdown instead of JSON, or `json_restrictor` to return only the fields you need. The response types follow the parameter you pass:

```ts
const md = await client.google.search({ query: "best espresso machines", output: "md" });
console.log(md.data.content); // a Markdown string

const urls = await client.google.search({ query: "best espresso machines", json_restrictor: "results[].{title,url}" });
console.log(urls.data.content); // only the selected fields
```

To paginate with `json_restrictor`, include `next_page_token` in the selection.

## Google result links

Google sometimes returns a result whose destination it hasn't revealed yet. Its `url` is then a Google `/goto` or `/url` link. Decode up to 10 of them per request:

```ts
const decoded = await client.google.decode({ urls: ["https://www.google.com/url?..."] });
```

Each decoded batch uses one credit.

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

Search your history across every endpoint with `client.account.requests`:

```ts
const recent = await client.account.requests.list({ provider: "google", status: "failure", limit: 20 });

for await (const page of client.account.requests.pages({ from: "2026-11-01T00:00:00Z" })) {
  for (const request of page.data.requests) console.log(request.request_id);
}
```

Requests made with `zero_trace: true` aren't archived. For those, `.get()` returns only the status code and whether a credit was charged.

## Async requests and webhooks

`.submit()` runs any endpoint asynchronously. PrismCrawl accepts the job right away, runs it, and POSTs the completed response to your webhook, signed with your secret. Results are kept for one hour after completion, so they survive disconnects.

```ts
const receipt = await client.google.search.submit({
  query: "best espresso machines",
  webhook_url: "https://example.com/prismcrawl-webhook",
  webhook_secret: process.env.PRISMCRAWL_WEBHOOK_SECRET!, // 32 to 256 printable ASCII characters
});
console.log(receipt.data.job_id, receipt.data.status);
```

Each submission has an `Idempotency-Key`. The SDK generates one; pass `{ idempotencyKey }` to choose your own, and reuse it with the same parameters to retry a submission safely. A receipt means the job was accepted, not that the search succeeded.

Verify each delivery with `verifyWebhook`, using the raw request body:

```ts
import { verifyWebhook, WebhookVerificationError } from "prismcrawl";

export async function POST(request: Request) {
  try {
    const event = await verifyWebhook({
      payload: await request.text(),
      headers: request.headers,
      secret: process.env.PRISMCRAWL_WEBHOOK_SECRET!,
    });
    // event.body is the endpoint's response; event.resultStatus is its HTTP status.
    // Retries reuse event.eventId, so skip events you've already handled.
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof WebhookVerificationError) return new Response(null, { status: 400 });
    throw error;
  }
}
```

It rejects bad signatures and timestamps older than five minutes. Respond with a 2xx within 10 seconds; failed deliveries are retried for up to an hour without running the search again.

For troubleshooting, `client.asyncJobs.status(jobId)` and `client.asyncJobs.result(jobId)` read a job directly. Don't poll them more often than every five seconds. Async requests can't use `zero_trace`.

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

Errors don't use credits.

## Retries, timeouts, and cancellation

The client retries up to 2 times, with exponential backoff, on:

- 429 responses, waiting until the limit resets if that's within 30 seconds
- 5xx responses
- connection failures

It never retries a search after the request was sent and the connection dropped, because the search may have completed and used a credit. `.submit()` is the exception: its `Idempotency-Key` makes resending safe, so it retries those too.

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

Each completed request uses one PrismCrawl credit, including searches that come back with no results. Errors are free. Fetching another page is a separate request and uses a credit, including each page from `.pages()`.

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
