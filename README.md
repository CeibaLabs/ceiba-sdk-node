# Ceiba SDK

[![CI](https://github.com/CeibaLabs/ceiba-sdk-node/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/CeibaLabs/ceiba-sdk-node/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/%40ceibalabs%2Fceiba-sdk.svg)](https://www.npmjs.com/package/@ceibalabs/ceiba-sdk)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node >=20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](package.json)

[Docs](https://docs.useceiba.com) · [Quickstart](https://docs.useceiba.com/quickstart) · [Examples](https://github.com/CeibaLabs/ceiba-examples) · [Issues](https://github.com/CeibaLabs/ceiba-sdk-node/issues)

Add API keys, plans, quotas, usage-aware access control, and subscription-gated protection to your existing Node API.

Ceiba is a lightweight, Node-first API productization layer for teams that want to protect and commercialize an API **without adopting a full gateway**.

This package is the official Node.js SDK for integrating Ceiba into Express and Fastify applications.

## What this package does

- extracts Ceiba credentials from incoming requests
- sends authorization checks to Ceiba Runtime
- attaches normalized access context to the request
- blocks unauthorized requests with standard error responses
- keeps your app integration simple and consistent

<!-- ## What this package does not do

- it does **not** validate API keys locally
- it does **not** contain the policy engine
- it does **not** enforce billing or entitlement rules by itself
- it is **not** the source of truth for access decisions -->

All enforcement happens in **Ceiba Runtime**.

## Quickstart

Five steps from nothing to a protected route.

**1. Install**

```bash
npm install @ceibalabs/ceiba-sdk
```

**2. Create a project** in the [Control Plane](https://app.useceiba.com). Note the **project ID**, and
copy the **project secret** — it is shown once, at creation, and never again.

**3. Add an access policy** for the route you want to protect. The pattern is either an exact path or
a trailing `*` for a prefix: `/v1/*` covers `/v1` and everything beneath it. A pattern with no `*`
matches only that one path.

**4. Set three variables** on your API server. These stay server-side — `CEIBA_PROJECT_SECRET`
authenticates your backend to Runtime and must never reach a browser or mobile client.

```bash
CEIBA_RUNTIME_URL=https://api.useceiba.com
CEIBA_PROJECT_ID=<your-project-id>
CEIBA_PROJECT_SECRET=<your-project-secret>
```

**5. Wire the middleware** onto that route — see the framework examples below.

Then issue an API key to a caller (Control Plane, or [programmatically](https://docs.useceiba.com/programmatic-api-keys))
and test it:

```bash
curl -H "Authorization: Bearer <api-key>" https://your-api.example.com/v1/hello
```

The SDK also accepts the key as `X-API-Key` if a `Bearer` token does not suit your callers.

## Quick example

### Express

```ts
import express from "express";
import {
  CeibaRuntimeClient,
  parseCeibaSdkConfig,
} from "@ceibalabs/ceiba-sdk";
import { ceibaExpressMiddleware } from "@ceibalabs/ceiba-sdk/express";

const app = express();
const config = parseCeibaSdkConfig({
  runtimeBaseUrl: process.env.CEIBA_RUNTIME_URL,
  projectId: process.env.CEIBA_PROJECT_ID,
  projectSecret: process.env.CEIBA_PROJECT_SECRET,
});
const client = new CeibaRuntimeClient(config);

app.get("/api/weather", ceibaExpressMiddleware(client, config.projectId), (req, res) => {
  res.json({
    ok: true,
    ceiba: req.ceibaAccess,
  });
});

app.listen(3000);
```

### Fastify

```ts
import Fastify from "fastify";
import {
  CeibaRuntimeClient,
  parseCeibaSdkConfig,
} from "@ceibalabs/ceiba-sdk";
import { ceibaFastifyPreHandler } from "@ceibalabs/ceiba-sdk/fastify";

const app = Fastify();
const config = parseCeibaSdkConfig({
  runtimeBaseUrl: process.env.CEIBA_RUNTIME_URL,
  projectId: process.env.CEIBA_PROJECT_ID,
  projectSecret: process.env.CEIBA_PROJECT_SECRET,
});
const client = new CeibaRuntimeClient(config);

app.get(
  "/api/weather",
  { preHandler: ceibaFastifyPreHandler({ client, projectId: config.projectId }) },
  async (request) => ({
    ok: true,
    ceiba: request.ceibaAccess,
  }),
);

await app.listen({ port: 3000 });
```

## What you get back

On an allowed request the middleware attaches `req.ceibaAccess` (Express) or
`request.ceibaAccess` (Fastify) and calls through to your handler:

```ts
type CeibaAccessContext = {
  projectId: string;
  policyId: string | null;            // the policy that matched
  apiKeyId: string | null;            // the key that was presented
  externalSubjectType: string | null; // your own caller taxonomy, if set on the key
  externalSubjectId: string | null;   // your own caller identifier, if set on the key
  planCode: string | null;            // "free" | "starter" | "pro"
  subscriptionStatus: string | null;  // e.g. "active", "trialing"
};
```

`planCode` and `subscriptionStatus` are the useful ones for gating behaviour inside your handler —
you can vary a response by plan without a second lookup.

## When a request is denied

Your handler is **not** called. The middleware sends a JSON body and an appropriate status itself:

```json
{ "error": "ceiba_forbidden", "denialReason": "policy_no_match" }
```

There are nine denial reasons, across four error codes and three statuses:

| Status | `error` | `denialReason` | Meaning |
|---|---|---|---|
| `401` | `ceiba_unauthorized` | `missing_api_key` | No `Authorization: Bearer` or `X-API-Key` on the request |
| `401` | `ceiba_unauthorized` | `invalid_api_key` | Key is not recognised for this project |
| `401` | `ceiba_unauthorized` | `revoked_api_key` | Key was revoked |
| `401` | `ceiba_unauthorized` | `archived_api_key` | Key was archived |
| `401` | `ceiba_unauthorized` | `expired_api_key` | Key passed its `expiresAt` |
| `403` | `ceiba_forbidden` | `policy_no_match` | No active policy matches this method and path |
| `403` | `ceiba_forbidden` | `inactive_subscription` | The project's subscription is not active or trialing |
| `429` | `ceiba_quota_exceeded` | `quota_exceeded` | Monthly request quota is used up |
| `429` | `ceiba_rate_limited` | `rate_limited` | Per-minute rate limit hit |

Branch on `denialReason` rather than `error` — it is the specific one, and `error` only groups them.

**Only the two `429`s are worth retrying.** Everything else is a configuration or credential problem
and will fail again identically.

`policy_no_match` is the one most people hit first, and it is almost always the policy pattern rather
than the key — check that the pattern actually covers the path being called. A pattern without a
trailing `*` matches only that exact path.

If Runtime itself is unreachable, the middleware responds
`{ "error": "ceiba_runtime_transport", "runtimeStatus": <number> }` instead. That is an availability
problem, not an authorization one, and is worth alerting on separately.

## Core Architecture (High-level)

Ceiba separates:

- **Control Plane** — where API owners configure projects, keys, policies, plans, and billing
- **Runtime** — where access decisions are evaluated and enforced
- **SDK** — the integration layer installed in the customer’s API (this package)

## Typical use cases

- add API key protection to an existing Express or Fastify API
- gate endpoints by subscription plan
- enforce quotas and limits using Ceiba Runtime
- attach a normalized access context to downstream handlers

## Ceiba ecosystem

- **Site** — <https://useceiba.com>
- **Docs** — <https://docs.useceiba.com> · [Quickstart](https://docs.useceiba.com/quickstart)
- **Control Plane** — <https://app.useceiba.com>
- **Node SDK** — this repository ([`@ceibalabs/ceiba-sdk`](https://www.npmjs.com/package/@ceibalabs/ceiba-sdk))
- **Examples** — [ceiba-examples](https://github.com/CeibaLabs/ceiba-examples)
- **Infrastructure** — [ceiba-infra](https://github.com/CeibaLabs/ceiba-infra)

## License

MIT
