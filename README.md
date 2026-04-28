# Ceiba SDK (Node.js)

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

## What this package does not do

- it does **not** validate API keys locally
- it does **not** contain the policy engine
- it does **not** enforce billing or entitlement rules by itself
- it is **not** the source of truth for access decisions

All enforcement happens in **Ceiba Runtime**.

...More Information coming soon =)  
