import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  assert.match(html, /ScareSafe Till Dawn/i);
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

test("keeps browser jumpscare creation behind the verified admin route", async () => {
  const dashboard = await readFile(new URL("../app/components/AdminDashboard.tsx", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/admin/action/route.ts", import.meta.url), "utf8");
  assert.match(dashboard, /Add verified jumpscare/);
  assert.match(route, /verifyAdmin/);
  assert.match(route, /kind === "createJumpscare"/);
  assert.match(route, /submit_scare_mapping_proposal/);
});

test("keeps full-catalogue movie search admin-only", async () => {
  const dashboard = await readFile(new URL("../app/components/AdminDashboard.tsx", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/admin/movie-search/route.ts", import.meta.url), "utf8");
  assert.match(dashboard, /Search all movies/);
  assert.match(route, /verifyAdmin/);
  assert.match(route, /functions\/v1\/tvdb\/search/);
  assert.match(route, /TheMovieDB\.com/);
});

test("keeps movie-scoped jumpscare edits and overrides behind admin verification", async () => {
  const dashboard = await readFile(new URL("../app/components/AdminDashboard.tsx", import.meta.url), "utf8");
  const actionRoute = await readFile(new URL("../app/api/admin/action/route.ts", import.meta.url), "utf8");
  const dataRoute = await readFile(new URL("../app/api/admin/data/route.ts", import.meta.url), "utf8");
  assert.match(dashboard, /Manage by movie/);
  assert.match(dashboard, /Published jumpscares/);
  assert.match(dashboard, /Save & approve/);
  assert.match(actionRoute, /verifyAdmin/);
  assert.match(actionRoute, /admin_update_jumpscare_candidate/);
  assert.match(actionRoute, /admin_verify_candidate/);
  assert.match(actionRoute, /admin_moderate_content/);
  assert.match(dataRoute, /verification_candidates/);
});
