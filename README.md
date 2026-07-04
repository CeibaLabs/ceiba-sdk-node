# Ceiba SDK

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

## Install

```bash
npm install @ceibalabs/ceiba-sdk
```

## Quick example

### Express

```ts
import express from "express";
import {
  CeibaRuntimeClient,
  ceibaExpressMiddleware,
  parseCeibaSdkConfig,
} from "@ceibalabs/ceiba-sdk";

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
  ceibaFastifyPreHandler,
  parseCeibaSdkConfig,
} from "@ceibalabs/ceiba-sdk";

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

## Docs

- Main site: https://useceiba.com
- Quickstart: https://docs.useceiba.com/quickstart

## License

MIT
