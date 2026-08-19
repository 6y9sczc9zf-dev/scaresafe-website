import assert from "node:assert/strict";
import test from "node:test";

async function request(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the public ScareSafe landing page", async () => {
  const response = await request();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Know the scares before they happen/);
  assert.match(html, /Every scare mapped helps another horror fan/);
  assert.match(html, /ScareSafe Until Dawn/i);
  assert.doesNotMatch(html, /ScareSafe Admin|Admin dashboard|\/admin/);
});

test("keeps the admin route protected", async () => {
  const response = await request("/admin");
  assert.ok([302, 307, 308].includes(response.status));
  assert.match(response.headers.get("location") ?? "", /\/admin\/login/);
});

test("blocks admin routes from crawlers", async () => {
  const response = await request("/robots.txt");
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /Disallow: \/admin/);
  assert.match(body, /Disallow: \/api\/admin/);
});
