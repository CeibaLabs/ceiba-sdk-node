# ceiba-sdk (@ceibalabs/ceiba-sdk) — implementation notes

## Workspace folder

Canonical npm name: `@ceibalabs/ceiba-sdk`. Local CeibaLabs folder: `ceiba-sdk-node` (per `_workspace/roadmap.md`).

## Week 1 (2026-05-06)

- **Stack:** TypeScript, tsup (ESM + CJS + types), `zod` for config parsing, `@ceibalabs/ceiba-core-domain` via `file:../ceiba-core-domain`.
- **Surface:** `CeibaRuntimeClient.authorize()`, `ceibaExpressMiddleware()`, `ceibaFastifyPreHandler()` (use preHandler on **protected routes only**).
- **Request context:** Express: `req.ceibaAccess`. Fastify: `request.ceibaAccess` after allow.
- **Proof:** With Runtime running and env from `.env.example`, run `npm run prove` (allow + `missing_api_key` denial).

## Next slices

- Tighter HTTP error mapping, optional retries (post-MVP caution), and example apps in `ceiba-examples`.
