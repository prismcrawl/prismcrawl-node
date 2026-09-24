// Run the same query on Google, Bing, and DuckDuckGo at once and compare the results.
//
//   npx tsx examples/compare-engines.ts "best hiking boots"

import PrismCrawl, { type SearchResult } from "prismcrawl";

const query = process.argv.slice(2).join(" ") || "best hiking boots";
const client = new PrismCrawl();

const organicDomains = (response: { data: { format: string; content: unknown } }) =>
  response.data.format === "json"
    ? (response.data.content as { results: SearchResult[] }).results
        .filter((r) => r.type === "organic" && r.domain)
        .map((r) => r.domain as string)
    : [];

// The three requests run concurrently.
const [google, bing, duckduckgo] = await Promise.all([
  client.google.search({ query }),
  client.bing.search({ query }),
  client.duckduckgo.search({ query }),
]);

const results = {
  Google: organicDomains(google),
  Bing: organicDomains(bing),
  DuckDuckGo: organicDomains(duckduckgo),
};
for (const [engine, domains] of Object.entries(results)) {
  console.log(`${engine.padStart(10)}: ${domains.slice(0, 5).join(", ")}`);
}

const [first, ...rest] = Object.values(results).map((d) => new Set(d));
const shared = [...first!].filter((d) => rest.every((set) => set.has(d)));
console.log(`\nIn all three: ${shared.sort().join(", ") || "none"}`);
