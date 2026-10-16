import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import worker, { checkApi } from "./worker.js";
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
test("cron makes one anonymous readiness read and HTTP cannot trigger it", async () => {
  const calls = [];
  globalThis.fetch = async (...args) => { calls.push(args); return new Response('{"status":"ready"}'); };
  assert.equal((await worker.fetch()).status, 404);
  assert.equal(calls.length, 0);
  await worker.scheduled();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "https://stoqo-api.onrender.com/ready");
  assert.equal(calls[0][1].headers.Authorization, undefined);
  assert.equal(calls[0][1].redirect, "manual");
});
test("a failed readiness response is a failed scheduled event", async () => {
  globalThis.fetch = async () => new Response("Not ready", { status: 503 });
  await assert.rejects(checkApi(), /503/);
});
test("a redirect is rejected instead of requesting another target", async () => {
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls++;
    assert.equal(options.redirect, "manual");
    return new Response(null, { status: 302, headers: { Location: "https://other.example" } });
  };
  await assert.rejects(checkApi(), /302/);
  assert.equal(calls, 1);
});
