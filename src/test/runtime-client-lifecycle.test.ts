import assert from "node:assert/strict";
import test from "node:test";
import { CeibaRuntimeClient } from "../runtime-client.js";

test("key lifecycle POSTs send an explicit empty JSON object", async (t) => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async (input, init) => {
    const url = input instanceof URL ? input.toString() : input.toString();
    requests.push({ url, init });
    const status = url.endsWith("/revoke") ? "revoked" : "archived";
    return Response.json({ apiKeyId: "00000000-0000-4000-8000-000000000001", status });
  }) as typeof fetch;

  const client = new CeibaRuntimeClient({
    runtimeBaseUrl: "http://runtime.test",
    projectId: "00000000-0000-4000-8000-000000000000",
    projectSecret: "test-project-secret",
  });

  await client.revokeApiKey("00000000-0000-4000-8000-000000000001");
  await client.archiveApiKey("00000000-0000-4000-8000-000000000002");

  assert.equal(requests.length, 2);
  for (const request of requests) {
    assert.equal(request.init?.method, "POST");
    assert.equal(request.init?.body, "{}");
    assert.equal(
      new Headers(request.init?.headers).get("content-type"),
      "application/json",
    );
  }
});
