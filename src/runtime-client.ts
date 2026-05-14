import type { AccessDecision, RuntimeAuthorizeInput } from "@ceibalabs/ceiba-core-domain";
import type { CeibaSdkConfig } from "./config.js";

/** Result of `revokeApiKey` / `archiveApiKey` (Runtime machine-facing lifecycle). */
export type ApiKeyLifecycleResult = {
  apiKeyId: string;
  status: "revoked" | "archived";
};

/** Result of `createApiKey` — `plaintextKey` is returned once at creation. */
export type ApiKeyCreateResult = {
  apiKeyId: string;
  displayName: string;
  keyPrefix: string;
  plaintextKey: string;
};

/** Safe read model for an API key (no hash or plaintext). ISO date strings from Runtime. */
export type ApiKeySummary = {
  apiKeyId: string;
  displayName: string;
  keyPrefix: string;
  status: "active" | "revoked" | "archived";
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  archivedAt: string | null;
  lastUsedAt: string | null;
};

export type ApiKeyListResult = {
  apiKeys: ApiKeySummary[];
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
   * Creates an API key for this SDK config's project. Returns the full plaintext once;
   * persist it securely — Runtime does not retain it.
   */
  async createApiKey(displayName: string): Promise<ApiKeyCreateResult> {
    const url = new URL(`/rt/projects/${this.config.projectId}/api-keys`, this.config.runtimeBaseUrl);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ceiba-project-secret": this.config.projectSecret,
      },
      body: JSON.stringify({ displayName }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new CeibaRuntimeTransportError(res.status, text);
    }

    return (await res.json()) as ApiKeyCreateResult;
  }

  /** Lists API keys for this SDK config's project (no secret material). */
  async listApiKeys(): Promise<ApiKeyListResult> {
    return (await this.getApiKeyJson(
      `/rt/projects/${this.config.projectId}/api-keys`,
    )) as ApiKeyListResult;
  }

  /** Fetches one API key by id for this project (404 from Runtime if missing / wrong project). */
  async getApiKey(apiKeyId: string): Promise<ApiKeySummary> {
    return (await this.getApiKeyJson(
      `/rt/projects/${this.config.projectId}/api-keys/${apiKeyId}`,
    )) as ApiKeySummary;
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

  private async getApiKeyJson(path: string): Promise<unknown> {
    const url = new URL(path, this.config.runtimeBaseUrl);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-ceiba-project-secret": this.config.projectSecret,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new CeibaRuntimeTransportError(res.status, text);
    }

    return res.json();
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
