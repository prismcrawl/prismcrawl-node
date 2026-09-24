// Search Google and print the organic results.
//
//   export PRISMCRAWL_API_KEY="YOUR_API_KEY"
//   npx tsx examples/quickstart.ts "best espresso machines"

import PrismCrawl from "prismcrawl";

const query = process.argv.slice(2).join(" ") || "best espresso machines";
const client = new PrismCrawl();

const response = await client.google.search({ query, gl: "us" });
if (response.data.format !== "json") throw new Error("Expected JSON results");

for (const result of response.data.content.results) {
  if (result.type === "organic") {
    console.log(`${String(result.rank).padStart(2)}. ${result.title}\n    ${result.url}`);
  }
}

console.log(`\nrequest_id: ${response.request_id}`);
