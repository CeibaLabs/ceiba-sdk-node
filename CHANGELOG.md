# Changelog

Versions follow [semantic versioning](https://semver.org). While this package is pre-1.0,
minor versions may contain breaking changes; patch versions will not.

## 0.1.0

First release published by the tag-triggered pipeline, and the first whose contents can be
traced back to a commit.

- Express middleware (`ceibaExpressMiddleware`) and Fastify pre-handler
  (`ceibaFastifyPreHandler`).
- `CeibaRuntimeClient` and `parseCeibaSdkConfig` for talking to Ceiba Runtime.
- Normalized access context on allow, stable denial mapping on deny, and transport errors
  kept distinct from access denials.
- Programmatic API key lifecycle: create, read, list, expire, revoke, archive.
- Requires Node 20 or later. Tested against Node 20 and 22, Express 4.21+ and 5, Fastify 5.

### A note on 0.0.1

`0.0.1` was published by hand on 2026-07-23. The commit npm recorded for it
(`6a8bf551c1bab8f9ec63912163f062d864f2d84f`) is not in this repository and there is no tag
for it, so what that version contains cannot be verified from source. It is left on the
registry rather than unpublished, but it should not be treated as a supported release.
