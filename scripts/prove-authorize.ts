/**
 * Week 1 proof: SDK Runtime client → POST /rt/authorize with shared contract body.
 *
 * Prereqs: ceiba-runtime running (see ceiba-runtime/.env.example).
 *
 *   CEIBA_RUNTIME_URL=http://localhost:8080 \
 *   CEIBA_PROJECT_ID=<uuid> \
 *   CEIBA_PROJECT_SECRET=dev-project-secret \
 *   npm run prove
 */
import { randomUUID } from "node:crypto";
import { CeibaRuntimeClient, parseCeibaSdkConfig } from "../src/index.js";

/** Local smoke-test defaults only — must not be real secrets or production URLs. */
const projectId = process.env.CEIBA_PROJECT_ID ?? randomUUID();

const config = parseCeibaSdkConfig({
  runtimeBaseUrl: process.env.CEIBA_RUNTIME_URL ?? "http://localhost:8080",
  projectId,
  projectSecret: process.env.CEIBA_PROJECT_SECRET ?? "dev-project-secret",
});

const client = new CeibaRuntimeClient(config);

const baseInput = {
  projectId: config.projectId,
  request: { method: "GET", path: "/v1/hello", ip: "127.0.0.1" as string | null },
  credential: { kind: "api_key" as const, presentedKey: "ceiba-proof-key" as string | null },
};

const allow = await client.authorize(baseInput);
if (!allow.allowed) {
  console.error("expected allow stub, got", allow);
  process.exit(1);
}
console.log("allow path ok:", allow.allowed, "policyId:", allow.policyId);

const deny = await client.authorize({
  ...baseInput,
  credential: { kind: "api_key", presentedKey: null },
});
if (deny.allowed || deny.denialReason !== "missing_api_key") {
  console.error("expected missing_api_key denial, got", deny);
  process.exit(1);
}
console.log("deny path ok:", deny.denialReason);

console.log("SDK → Runtime proof succeeded.");
