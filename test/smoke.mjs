// Dependency-free check of the built package, for Node versions the test runner
// doesn't support. Run `npm run build` first, then `node test/smoke.mjs`.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { brotliCompressSync } from "node:zlib";

const require = createRequire(import.meta.url);
const esm = await import("../dist/index.js");
const cjs = require("../dist/index.cjs");

for (const [label, mod] of [["esm", esm], ["cjs", cjs]]) {
  const calls = [];
  const replies = [
    new Response(JSON.stringify({ error: { code: "busy", message: "busy" } }), { status: 503 }),
    new Response(JSON.stringify({ success: true, request_id: "r", data: { format: "json", content: {} } }), {
      headers: { "content-type": "application/json" },
    }),
    new Response(JSON.stringify({ success: false, error: { code: "invalid_api_key", message: "invalid api key" } }), {
      status: 401,
      headers: { "content-type": "application/json", "x-request-id": "r2" },
    }),
  ];
  const fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return replies.shift();
  };
  const client = new mod.PrismCrawl({ apiKey: "k", fetch });
  assert.equal(mod.default, mod.PrismCrawl, `${label}: default export`);

  const res = await client.apple.appStore.reviews({ id: "1", country: "us" });
  assert.equal(res.request_id, "r");
  assert.equal(calls.length, 2, `${label}: retried 503`);
  assert.equal(calls[1].url, "https://api.prismcrawl.com/v1/apple/app-store/reviews");
  assert.deepEqual(JSON.parse(calls[1].init.body), { id: "1", country: "us" });
  assert.equal(calls[1].init.headers["x-api-key"], "k");

  await assert.rejects(client.bing.search({ query: "q" }), (error) => {
    assert.ok(error instanceof mod.AuthenticationError);
    assert.equal(error.status, 401);
    assert.equal(error.requestId, "r2");
    return true;
  });

  const content = brotliCompressSync(Buffer.from("<p>ok</p>")).toString("base64");
  assert.equal(await mod.decodeHtml({ data: { format: "html+br+base64", content } }), "<p>ok</p>");
  console.log(`${label}: ok`);
}
