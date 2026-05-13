import type { AccessDecision, RuntimeAuthorizeInput } from "@ceibalabs/ceiba-core-domain";
import type { CeibaSdkConfig } from "./config.js";

/** Result of `revokeApiKey` / `archiveApiKey` (Runtime machine-facing lifecycle). */
export type ApiKeyLifecycleResult = {
  apiKeyId: string;
  status: "revoked" | "archived";
};

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

  /**
   * Revokes an API key for this SDK config's project (requires active project + valid secret).
   * Idempotent when the key is already revoked. Archived keys cannot be revoked (Runtime returns 409).
   */
  async revokeApiKey(apiKeyId: string): Promise<ApiKeyLifecycleResult> {
    return this.postApiKeyLifecycle(
      `/rt/projects/${this.config.projectId}/api-keys/${apiKeyId}/revoke`,
    );
  }

  /**
   * Archives an API key for this SDK config's project. Idempotent when already archived.
   */
  async archiveApiKey(apiKeyId: string): Promise<ApiKeyLifecycleResult> {
    return this.postApiKeyLifecycle(
      `/rt/projects/${this.config.projectId}/api-keys/${apiKeyId}/archive`,
    );
  }

  private async postApiKeyLifecycle(path: string): Promise<ApiKeyLifecycleResult> {
    const url = new URL(path, this.config.runtimeBaseUrl);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ceiba-project-secret": this.config.projectSecret,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new CeibaRuntimeTransportError(res.status, text);
    }

    return (await res.json()) as ApiKeyLifecycleResult;
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
