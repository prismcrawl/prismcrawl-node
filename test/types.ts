// Compile-time checks, run by `npm run typecheck`. Never executed.
import PrismCrawl, {
  type AsyncReceipt,
  type GoogleSearchResponse,
  type MarkdownSearchResponse,
  type ProjectedSearchResponse,
  type YelpReviewsRequest,
} from "../src/index.js";

export async function typeChecks(client: PrismCrawl) {
  const search: GoogleSearchResponse = await client.google.search({ query: "q", gl: "us", device: "mobile" });
  void search.request_id;

  // @ts-expect-error query or url is required
  await client.google.search({});
  await client.google.search({ url: "https://www.google.com/search?q=q" });
  // @ts-expect-error device only accepts known values
  await client.google.search({ query: "q", device: "watch" });
  // @ts-expect-error google.search is not paginated
  client.google.search.pages;

  await client.yelp.search({ query: "q", location: "Austin, TX" });
  await client.yelp.search({ query: "q", coordinates: { latitude: 30.27, longitude: -97.74 } });
  // @ts-expect-error yelp.search needs location or coordinates
  await client.yelp.search({ query: "q" });
  // @ts-expect-error yelp.search takes only one of location or coordinates
  await client.yelp.search({ query: "q", location: "Austin, TX", coordinates: { latitude: 1, longitude: 2 } });

  await client.google.flights.search({ departure_id: "JFK", arrival_id: "LAX", outbound_date: "2027-03-15" });
  // Multi-city trips put every leg in multi_city_json instead of the route fields.
  await client.google.flights.search({
    type: 3,
    multi_city_json: '[{"departure_id":"JFK","arrival_id":"LAX","date":"2027-03-15"}]',
  });
  // @ts-expect-error google.flights.search needs a route or multi_city_json
  await client.google.flights.search({ departure_id: "JFK" });

  const params: YelpReviewsRequest = { id: "biz", sort_by: "newest" };
  for await (const page of client.yelp.reviews.pages(params, { maxPages: 2 })) void page.data;

  const html: string = await client.google.search.get("id", { artifact: "html" });
  const meta: Record<string, unknown> = await client.google.search.get("id");
  void html;
  void meta;

  // Full results stay typed after narrowing on format.
  const full = await client.google.search({ query: "q" });
  if (full.data.format === "json") for (const result of full.data.content.results) void result.title;

  const md: MarkdownSearchResponse = await client.yelp.reviews({ id: "biz", output: "md" });
  const markdown: string = md.data.content;
  const projected: ProjectedSearchResponse = await client.google.search({ query: "q", json_restrictor: "results[].url" });
  void markdown;
  void projected;
  for await (const page of client.yelp.reviews.pages({ id: "biz", output: "md" })) void (page.data.content satisfies string);

  // Nested endpoints.
  await client.google.images({ query: "q" });
  await client.google.images.light({ query: "q" });
  for await (const page of client.google.images.pages({ query: "q" }, { maxPages: 1 })) void page;

  // Webhook fields are only for submit(), where they're required.
  // @ts-expect-error webhook_url is rejected on synchronous requests
  await client.google.search({ query: "q", webhook_url: "https://example.com/hook" });
  // @ts-expect-error submit() needs a webhook
  await client.google.search.submit({ query: "q" });
  const receipt: AsyncReceipt = await client.google.search.submit(
    { query: "q", webhook_url: "https://example.com/hook", webhook_secret: "s".repeat(32) },
    { idempotencyKey: "key" },
  );
  void receipt.data.job_id;

  const history = await client.account.requests.list({ provider: "google", status: "success" });
  for (const row of history.data.requests) void row.request_id;
}
