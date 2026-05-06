import type { RuntimeAuthorizeInput } from "@ceibalabs/ceiba-core-domain";
import { toSdkDecisionResult } from "@ceibalabs/ceiba-core-domain";
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import type { CeibaRuntimeClient } from "./runtime-client.js";

function getHeader(req: FastifyRequest, name: string): string | undefined {
  const raw = req.headers[name.toLowerCase()];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0];
  return undefined;
}

function extractApiKey(req: FastifyRequest): string | null {
  const auth = getHeader(req, "authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || null;
  }
  const key = getHeader(req, "x-api-key");
  if (key) return key;
  return null;
}

function clientIp(req: FastifyRequest): string | null {
  const xff = getHeader(req, "x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  return req.ip ?? null;
}

export type CeibaFastifyPreHandlerOptions = {
  client: CeibaRuntimeClient;
  projectId: string;
};

declare module "fastify" {
  interface FastifyRequest {
    ceibaAccess?: import("@ceibalabs/ceiba-core-domain").CeibaAccessContext;
  }
}

/**
 * Use as route `preHandler` on protected routes only (not global).
 */
export function ceibaFastifyPreHandler(
  opts: CeibaFastifyPreHandlerOptions,
): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const presentedKey = extractApiKey(request);
    const input: RuntimeAuthorizeInput = {
      projectId: opts.projectId,
      request: {
        method: request.method,
        path: request.url.split("?")[0] ?? request.url,
        ip: clientIp(request),
      },
      credential: { kind: "api_key", presentedKey },
    };

    const decision = await opts.client.authorize(input);
    const sdk = toSdkDecisionResult(decision);
    if (!sdk.allowed) {
      return reply.code(401).send({
        error: "ceiba_unauthorized",
        denialReason: sdk.denialReason,
      });
    }
    request.ceibaAccess = sdk.accessContext!;
  };
}
