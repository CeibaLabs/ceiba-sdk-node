import type { RequestHandler } from "express";
import type { preHandlerHookHandler } from "fastify";
import { ceibaExpressMiddleware } from "../express.js";
import { ceibaFastifyPreHandler } from "../fastify.js";
import type { CeibaRuntimeClient } from "../runtime-client.js";

function assertFrameworkCompatibility(client: CeibaRuntimeClient) {
  const expressHandler: RequestHandler = ceibaExpressMiddleware(client, "project-id");
  const fastifyHandler: preHandlerHookHandler = ceibaFastifyPreHandler({
    client,
    projectId: "project-id",
  });

  void expressHandler;
  void fastifyHandler;
}

void assertFrameworkCompatibility;
