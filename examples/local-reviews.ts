// Find a place on Google Maps, then read and summarize its reviews.
//
// Shows passing an id from one endpoint to another, and paginating with .pages().
//
//   npx tsx examples/local-reviews.ts "coffee shop"

import PrismCrawl from "prismcrawl";

const query = process.argv.slice(2).join(" ") || "coffee shop";
const client = new PrismCrawl();

const places = await client.google.maps.search({
  query,
  coordinates: { latitude: 30.2672, longitude: -97.7431 }, // Austin, TX
});
const place = places.data.format === "json" ? places.data.content.results[0] : undefined;
if (!place?.place_id) throw new Error("No places found");
console.log(`${place.title} (${place.address ?? "no address"})\n`);

// Each page is a separate request and uses one credit, so cap it.
const ratings: number[] = [];
for await (const page of client.google.maps.reviews.pages({ id: place.place_id, limit: 10 }, { maxPages: 2 })) {
  if (page.data.format !== "json") break;
  for (const review of page.data.content.results) {
    if (review.rating === undefined) continue;
    ratings.push(review.rating);
    const text = (review.text ?? "").replaceAll("\n", " ");
    console.log(`  ${review.rating}★  ${text.slice(0, 90)}`);
  }
}

if (ratings.length) {
  const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  console.log(`\n${ratings.length} reviews, average ${average.toFixed(2)}★`);
}
