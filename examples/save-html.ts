// Save the source HTML of a search results page, then look the request up in history.
//
//   npx tsx examples/save-html.ts "best espresso machines"

import { writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import PrismCrawl, { NotFoundError, decodeHtml, type HistoryResponse } from "prismcrawl";

const query = process.argv.slice(2).join(" ") || "best espresso machines";
const client = new PrismCrawl();

const response = await client.google.search({ query, html: true });
const html = await decodeHtml(response);
await writeFile("results.html", html);
console.log(`Saved ${html.length.toLocaleString()} characters to results.html`);

// New requests take a few seconds to show up in history.
let history: HistoryResponse | undefined;
for (let attempt = 0; attempt < 10 && !history; attempt++) {
  try {
    history = await client.google.search.get(response.request_id);
  } catch (error) {
    if (!(error instanceof NotFoundError)) throw error;
    await sleep(3000);
  }
}
if (!history) throw new Error("Request not in history yet; try again shortly");

const meta = history.data as { status_code?: number; duration_ms?: number };
console.log(`Request ${response.request_id}: status ${meta.status_code}, took ${meta.duration_ms} ms`);
