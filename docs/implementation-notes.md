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

## Launch validation (2026-05-19, read-only)

- **`dev`** at **`f35608e`**: `npm run typecheck` + `npm run build` pass; `CeibaRuntimeClient` surface matches Runtime `/rt/authorize` + api-keys routes documented in `ceiba-docs`.
- `npm run prove` not run (requires live Runtime env).

## Next slices

- Optional retries (post-MVP caution) and example apps in `ceiba-examples` once docs path unblocks.

## 2026-07-03 — API-key lifecycle empty JSON payload

- `revokeApiKey` and `archiveApiKey` now send an explicit empty JSON object because their shared lifecycle helper sets `Content-Type: application/json`.
- Added focused request-construction coverage for both lifecycle methods.
- Public method signatures, Runtime routes, response types, and lifecycle semantics are unchanged.

## 2026-07-03 — Public package boundary

- Replaced the SDK's local/private Core Domain dependency with an SDK-owned contracts module containing only the existing public authorize request, access decision, denial, and access-context shapes plus the unchanged decision mapper.
- Removed `@ceibalabs/ceiba-core-domain` from the manifest, lockfile, tsup externals, generated JavaScript, declarations, source maps, and packed artifact.
- Added canonical repository, homepage, issue tracker, public publish access, and Node `>=20` package metadata while preserving optional Express and Fastify peers.
- Added a `prepack` build and boundary check that rejects missing output, private-package references, and local absolute paths.
- Added `npm run smoke:package`, which packs into a temporary directory, scans the extracted artifact, installs it in a clean external fixture, loads ESM and CommonJS entries, compiles public contract imports, and removes the fixture.
- Verification passed: clean `npm ci`, 3 tests, typecheck, build, dry-run pack, packed-artifact scan, clean-fixture ESM/CommonJS/declaration smoke, production dependency audit with zero vulnerabilities, and diff hygiene.

## 2026-07-04 — Optional adapter package boundary review

- Founder review tightened the clean-consumer declaration smoke by removing `skipLibCheck`; this exposed root declarations that required both optional framework peers even for Runtime-client-only consumers.
- Split the published SDK into a framework-free root entry plus `@ceibalabs/ceiba-sdk/express` and `@ceibalabs/ceiba-sdk/fastify` adapter entrypoints.
- Core ESM, CommonJS, and declarations now load and compile without Express or Fastify installed.
- Adapter entrypoints retain framework-native request augmentation and handler compatibility, verified strictly against Express and Fastify types.
- The packed artifact smoke now checks root and adapter runtime resolution, strict core declarations without peers, and strict framework declarations with their peer types installed.
- Typecheck, 3 tests, build, package-boundary verification, dry-run pack, external fixture smoke, production dependency audit, and diff hygiene pass.

## 2026-07-04 — Tag-triggered release workflow (`chore/sdk-release-pipeline`)

- Added `.github/workflows/release.yml`, a single-job GitHub Actions workflow that triggers only on `v*.*.*` tag pushes plus `workflow_dispatch` for dry runs; it never triggers on `push` to `main`/`dev` or on pull requests.
- Pipeline order matches the acceptance criteria and reuses existing scripts rather than reimplementing them in YAML: `npm ci` → `npm test` → `npm run typecheck` → `npm run build` → `npm run smoke:package` → print the package name from `package.json` (never hardcoded) → publish.
- Confirmed empirically (not just asserted) that `npm run build` alone only runs `tsup`; it does **not** itself invoke `verify:pack`. The `prepack` lifecycle script (`npm run build && npm run verify:pack`) instead fires automatically whenever the real `npm pack`/`npm publish` CLI command runs. `smoke:package` calls `npm pack` internally, so running `npm run build` followed by `npm run smoke:package` in CI does exercise the full build → boundary-check → pack → extract → clean-fixture-install → ESM/CommonJS/type smoke chain, just not literally "inside" the `build` script itself.
- Publish step uses npm trusted publishing (OIDC): `permissions: id-token: write` at the workflow level, `registry-url` set via `actions/setup-node`, and an explicit `npm install -g npm@latest` step so the CLI meets the `>=11.5.1` version needed for OIDC token exchange regardless of what a given Node.js version bundles. No `NPM_TOKEN`/`NODE_AUTH_TOKEN` is read. A documented, inactive token-based fallback (gated behind the same tag-only condition) is included as a YAML comment, with OIDC called out as the preferred path — registering the actual npm Trusted Publisher link for this repo + workflow file remains a separate, later operator action on npmjs.com, not something this branch performs.
- The publish step's `if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/')` means a `workflow_dispatch` dry run always skips publish; only a real tag push can reach it. No tag was created and no publish ran in this branch.
- Validated locally without pushing the branch (no `act`/`actionlint` available in this environment):
  - `python3` + `PyYAML` parsed the workflow and asserted: valid YAML; trigger is `push.tags: ["v*.*.*"]` plus `workflow_dispatch` only (no `branches`, no `pull_request`); `permissions.id-token == "write"`; step run-commands include `npm ci`, `npm test`, `npm run typecheck`, `npm run build`, `npm run smoke:package` in that order; the publish step's `if` matches the tag-only gate; no `NPM_TOKEN` string appears in the active publish step.
  - Ran the exact same command sequence directly in this working tree, in CI order — `npm ci`, `npm test` (3 passing), `npm run typecheck`, `npm run build`, `npm run smoke:package` — mirroring the manual proof style already used for `6b70a5f`/`f9963a9`. All passed, confirming the workflow's step sequence is valid against the current `dev` tip (`f9963a9`) before any release automation exists.
- No SDK source, adapter, export, or `package.json` `name`/`version` change in this branch. No real `npm publish`, no version bump, no tag created.
