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
- **Errors:** non-2xx → **`CeibaRuntimeTransportError`** (same as **`authorize`**). No key creation, list, or expiry APIs in this slice.
- **Repo:** feature **`0fa959f`** on **`feat/runtime-sdk-key-status-api`** (merge to **`dev`** pending review).

## Week 2 (2026-05-13) — Runtime client: create API key

- **`CeibaRuntimeClient.createApiKey(displayName)`** → `POST /rt/projects/{projectId}/api-keys` with JSON body and **`x-ceiba-project-secret`**.
- **Response:** **`ApiKeyCreateResult`** — **`apiKeyId`**, **`displayName`**, **`keyPrefix`**, **`plaintextKey`** (handle **`plaintextKey`** like a secret; shown once).
- **Errors:** non-2xx → **`CeibaRuntimeTransportError`**. No list/read/revoke/archive/expiry in this slice.
- **Repo:** feature **`87235cc`** on **`feat/runtime-sdk-key-create-api`** (merge to **`dev`** pending review).

## Week 2 (2026-05-14) — Runtime client: list and get API keys

- **`CeibaRuntimeClient.listApiKeys()`** → **`GET /rt/projects/{projectId}/api-keys`** with **`x-ceiba-project-secret`**; returns **`ApiKeyListResult`**.
- **`CeibaRuntimeClient.getApiKey(apiKeyId)`** → **`GET .../api-keys/{apiKeyId}`** (same header).
- **Types:** **`ApiKeySummary`**, **`ApiKeyListResult`** exported from package entry. No create/revoke/archive/expiry changes in this slice.
- **Repo:** feature **`2b06263`** on **`feat/runtime-sdk-key-read-list`** (merge to **`dev`** pending review).

## Week 2 (2026-05-14) — Runtime client: set API key expiry

- **`CeibaRuntimeClient.setApiKeyExpiry(apiKeyId, expiresAt)`** → **`PATCH /rt/projects/{projectId}/api-keys/{apiKeyId}`** with **`{ expiresAt: string | null }`** and **`x-ceiba-project-secret`**; returns **`ApiKeySummary`**.
- **Errors:** non-2xx → **`CeibaRuntimeTransportError`** (including **409** when key is not **active**). No other route changes in this slice.
- **Repo:** feature **`7576ac1`** on **`feat/runtime-sdk-key-expiry`** (merge to **`dev`** pending review).

## Next slices

- Optional retries (post-MVP caution) and example apps in `ceiba-examples` once docs path unblocks.
