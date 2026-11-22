// README examples, type-checked by `npm run typecheck`. Never executed.
import PrismCrawl, {
  APIStatusError,
  InsufficientCreditsError,
  RateLimitError,
  WebhookVerificationError,
  decodeHtml,
  verifyWebhook,
  type GoogleSearchRequest,
  type GoogleSearchResponse,
  type YelpReviewsResult,
} from "../src/index.js";

export async function readmeExamples(client: PrismCrawl, customFetch: typeof fetch) {
  const response = await client.google.search({ query: "best espresso machines", gl: "us" });
  if (response.data.format === "json") {
    for (const result of response.data.content.results) {
      console.log(result.rank, result.title, result.url);
    }
  }

  await client.google.maps.search({
    query: "coffee shop",
    coordinates: { latitude: 30.2672, longitude: -97.7431 },
    zoom: 14,
  });
  await client.google.maps.reviews({ id: "ChIJ...", limit: 20 });
  await client.amazon.search({ query: "espresso machine" });

  for await (const page of client.yelp.reviews.pages({ id: "halcyon-austin-2" }, { maxPages: 5 })) {
    if (page.data.format === "json") {
      for (const review of page.data.content.results) console.log(review.rating, review.text);
    }
  }

  await client.google.search.get(response.request_id);
  await client.google.search.get(response.request_id, { artifact: "json" });
  const source: string = await client.google.search.get(response.request_id, { artifact: "html" });

  const htmlResponse = await client.google.search({ query: "best espresso machines", html: true });
  const html: string = await decodeHtml(htmlResponse);

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

  const controller = new AbortController();
  await client.google.search({ query: "..." }, { timeout: 10_000, maxRetries: 0, signal: controller.signal });
  await client.google.search({ query: "..." }, { extraBody: { new_param: true } });

  new PrismCrawl({
    apiKey: "YOUR_API_KEY",
    baseURL: "https://api.prismcrawl.com",
    timeout: 120_000,
    maxRetries: 2,
    defaultHeaders: { "x-my-header": "value" },
    fetch: customFetch,
  });

  const req: GoogleSearchRequest = { query: "q" };
  const res: GoogleSearchResponse | undefined = undefined;
  const r: YelpReviewsResult | undefined = undefined;
  void [source, html, req, res, r];
}

export async function aiAnswers(client: PrismCrawl) {
  const response = await client.google.search({ query: "compare electric cars for a family", udm: 50 });
  if (response.data.format === "json") {
    for (const feature of response.data.content.serp_features) {
      if (feature.type === "ai_summary") console.log(feature);
    }
  }
}

export async function newReadmeExamples(client: PrismCrawl) {
  const first = await client.google.aiMode({ query: "compare electric cars for a family", continuable: true });
  if (first.data.format === "json" && first.data.content.subsequent_request_token) {
    await client.google.aiMode({
      query: "which has the most cargo space?",
      subsequent_request_token: first.data.content.subsequent_request_token,
    });
  }

  const md = await client.google.search({ query: "best espresso machines", output: "md" });
  console.log(md.data.content);
  const urls = await client.google.search({ query: "best espresso machines", json_restrictor: "results[].{title,url}" });
  console.log(urls.data.content);

  await client.google.decode({ urls: ["https://www.google.com/url?..."] });

  await client.account.requests.list({ provider: "google", status: "failure", limit: 20 });
  for await (const page of client.account.requests.pages({ from: "2026-11-01T00:00:00Z" })) {
    for (const request of page.data.requests) console.log(request.request_id);
  }

  const receipt = await client.google.search.submit({
    query: "best espresso machines",
    webhook_url: "https://example.com/prismcrawl-webhook",
    webhook_secret: process.env.PRISMCRAWL_WEBHOOK_SECRET!,
  });
  console.log(receipt.data.job_id, receipt.data.status);
}

export async function POST(request: Request) {
  try {
    const event = await verifyWebhook({
      payload: await request.text(),
      headers: request.headers,
      secret: process.env.PRISMCRAWL_WEBHOOK_SECRET!,
    });
    void event.body;
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof WebhookVerificationError) return new Response(null, { status: 400 });
    throw error;
  }
}
