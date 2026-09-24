// Look up an app on the Apple App Store: search, product details, and recent reviews.
//
//   npx tsx examples/app-research.ts "weather"

import PrismCrawl from "prismcrawl";

const query = process.argv.slice(2).join(" ") || "weather";
const client = new PrismCrawl();

const search = await client.apple.appStore.search({ query, country: "us", limit: 5 });
if (search.data.format !== "json" || !search.data.content.results.length) throw new Error("No apps found");

console.log("Top results:");
for (const app of search.data.content.results) {
  console.log(`  ${app.title} by ${app.developer ?? "?"} (id ${app.id})`);
}

// Product details and reviews for the top result, fetched in parallel.
const appId = search.data.content.results[0]?.id;
if (!appId) throw new Error("Top result has no id");
const [product, reviews] = await Promise.all([
  client.apple.appStore.product({ id: appId, country: "us" }),
  client.apple.appStore.reviews({ id: appId, country: "us" }),
]);

if (product.data.format === "json" && product.data.content.results[0]) {
  const details = product.data.content.results[0];
  console.log(`\n${details.title}: rated ${details.rating ?? "?"}, price ${details.price ?? "?"}`);
}

if (reviews.data.format === "json") {
  const stars = new Map<number, number>();
  for (const { rating } of reviews.data.content.results) {
    if (rating !== undefined) stars.set(rating, (stars.get(rating) ?? 0) + 1);
  }
  console.log("\nRecent review ratings:");
  for (const [rating, count] of [...stars].sort(([a], [b]) => b - a)) {
    console.log(`  ${rating}★ ${"#".repeat(count)} ${count}`);
  }
}
