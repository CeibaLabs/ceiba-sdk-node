import type { RuntimeAuthorizeInput } from "@ceibalabs/ceiba-core-domain";
import { toSdkDecisionResult } from "@ceibalabs/ceiba-core-domain";
import type { NextFunction, Request, Response } from "express";
import type { CeibaRuntimeClient } from "./runtime-client.js";

function getHeader(req: Request, name: string): string | undefined {
  const v = req.headers[name.toLowerCase()];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

function extractApiKey(req: Request): string | null {
  const auth = getHeader(req, "authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || null;
  }
  const key = getHeader(req, "x-api-key");
  if (key) return key;
  return null;
}

function clientIp(req: Request): string | null {
  const xff = getHeader(req, "x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  return req.socket.remoteAddress ?? null;
}

export function ceibaExpressMiddleware(client: CeibaRuntimeClient, projectId: string) {
  return async function ceibaAuthorize(req: Request, res: Response, next: NextFunction) {
    const presentedKey = extractApiKey(req);
    const input: RuntimeAuthorizeInput = {
      projectId,
      request: {
        method: req.method,
        path: req.path,
        ip: clientIp(req),
      },
      credential: { kind: "api_key", presentedKey },
    };

    try {
      const decision = await client.authorize(input);
      const sdk = toSdkDecisionResult(decision);
      if (!sdk.allowed) {
        return res.status(401).json({
          error: "ceiba_unauthorized",
          denialReason: sdk.denialReason,
        });
      }
      req.ceibaAccess = sdk.accessContext!;
      next();
    } catch (e) {
      next(e);
    }
  };
}

declare global {
  namespace Express {
    interface Request {
      /** Populated after successful Ceiba authorization. */
      ceibaAccess?: import("@ceibalabs/ceiba-core-domain").CeibaAccessContext;
    }
  }
}
