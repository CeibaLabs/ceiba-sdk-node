import type { AccessDecision, RuntimeAuthorizeInput } from "@ceibalabs/ceiba-core-domain";
import type { CeibaSdkConfig } from "./config.js";

export class CeibaRuntimeClient {
  constructor(private readonly config: CeibaSdkConfig) {}

  async authorize(input: RuntimeAuthorizeInput): Promise<AccessDecision> {
    const url = new URL("/rt/authorize", this.config.runtimeBaseUrl);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ceiba-project-secret": this.config.projectSecret,
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new CeibaRuntimeTransportError(res.status, text);
    }

    return (await res.json()) as AccessDecision;
  }
}

export class CeibaRuntimeTransportError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`Ceiba Runtime HTTP ${status}: ${body}`);
    this.name = "CeibaRuntimeTransportError";
  }
}
