// Compile-time checks, run by `npm run typecheck`. Never executed.
import PrismCrawl, { type GoogleSearchResponse, type YelpReviewsRequest } from "../src/index.js";

export async function typeChecks(client: PrismCrawl) {
  const search: GoogleSearchResponse = await client.google.search({ query: "q", gl: "us", device: "mobile" });
  void search.request_id;

  // @ts-expect-error query is required
  await client.google.search({});
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

  const params: YelpReviewsRequest = { id: "biz", sort_by: "newest" };
  for await (const page of client.yelp.reviews.pages(params, { maxPages: 2 })) void page.data;

  const html: string = await client.google.search.get("id", { artifact: "html" });
  const meta: Record<string, unknown> = await client.google.search.get("id");
  void html;
  void meta;
}
