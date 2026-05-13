# ceiba-sdk (@ceibalabs/ceiba-sdk) — implementation notes

## Workspace folder

Canonical npm name: `@ceibalabs/ceiba-sdk`. Local CeibaLabs folder: `ceiba-sdk-node` (per `_workspace/roadmap.md`).

## Week 1 (2026-05-06)

- **Stack:** TypeScript, tsup (ESM + CJS + types), `zod` for config parsing, `@ceibalabs/ceiba-core-domain` via `file:../ceiba-core-domain`.
- **Surface:** `CeibaRuntimeClient.authorize()`, `ceibaExpressMiddleware()`, `ceibaFastifyPreHandler()` (use preHandler on **protected routes only**).
- **Request context:** Express: `req.ceibaAccess`. Fastify: `request.ceibaAccess` after allow.
- **Proof:** With Runtime running and env from `.env.example`, run `npm run prove` (allow + `missing_api_key` denial).

## Week 2 (2026-05-09) — Denial and transport HTTP mapping

- **`src/denial-http.ts`:** maps each `DenialReason` to a status and stable `error` string; maps Runtime **transport** HTTP codes when `authorize()` throws `CeibaRuntimeTransportError`.
- **Denials → status:** key/credential family **401** (`ceiba_unauthorized`); `policy_no_match` / `inactive_subscription` **403** (`ceiba_forbidden`); `quota_exceeded` / `rate_limited` **429** (`ceiba_quota_exceeded` / `ceiba_rate_limited`).
- **Transport → status:** Runtime **401/403** → **503** (project secret / service auth misconfiguration); **400** → **502**; **5xx** pass through; other → **502**. Response shape: `{ error: "ceiba_runtime_transport", runtimeStatus }`.
- **Exports:** `httpStatusForDenial`, `ceibaErrorCodeForDenial`, `httpStatusForRuntimeTransport` from package entry for direct `CeibaRuntimeClient` users.

## Week 2 (2026-05-13) — Runtime client: revoke and archive API keys

- **`CeibaRuntimeClient.revokeApiKey(apiKeyId)`** → `POST /rt/projects/{projectId}/api-keys/{apiKeyId}/revoke` with `x-ceiba-project-secret` (uses config **`projectId`**).
- **`CeibaRuntimeClient.archiveApiKey(apiKeyId)`** → `POST .../archive` (same headers).
- **Response:** `{ apiKeyId, status: 'revoked' | 'archived' }` typed as **`ApiKeyLifecycleResult`** (exported from package entry).
- **Repo:** **`0fa959f`** on **`feat/runtime-sdk-key-status-api`** (merge to **`dev`** pending review).

## Next slices

- Optional retries (post-MVP caution) and example apps in `ceiba-examples` once docs path unblocks.
