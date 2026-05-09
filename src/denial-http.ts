import type { DenialReason } from "@ceibalabs/ceiba-core-domain";

/**
 * Maps Runtime `denialReason` to an HTTP status for the host application's response.
 * Does not encode business rules — only stable transport defaults for adapters.
 */
export function httpStatusForDenial(denialReason: DenialReason): number {
  switch (denialReason) {
    case "missing_api_key":
    case "invalid_api_key":
    case "revoked_api_key":
    case "archived_api_key":
    case "expired_api_key":
      return 401;
    case "policy_no_match":
    case "inactive_subscription":
      return 403;
    case "quota_exceeded":
    case "rate_limited":
      return 429;
    default: {
      const _exhaustive: never = denialReason;
      throw new Error(`unexpected denialReason: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Stable `error` string for JSON bodies alongside `denialReason`.
 */
export function ceibaErrorCodeForDenial(denialReason: DenialReason): string {
  switch (denialReason) {
    case "missing_api_key":
    case "invalid_api_key":
    case "revoked_api_key":
    case "archived_api_key":
    case "expired_api_key":
      return "ceiba_unauthorized";
    case "policy_no_match":
    case "inactive_subscription":
      return "ceiba_forbidden";
    case "quota_exceeded":
      return "ceiba_quota_exceeded";
    case "rate_limited":
      return "ceiba_rate_limited";
    default: {
      const _exhaustive: never = denialReason;
      throw new Error(`unexpected denialReason: ${String(_exhaustive)}`);
    }
  }
}

/**
 * When Runtime returns a non-2xx **transport** response (not an `AccessDecision`),
 * map it to a status appropriate for the integrating API. Runtime `401`/`403` here
 * mean project secret / service auth failure — treat as integration misconfiguration.
 */
export function httpStatusForRuntimeTransport(runtimeStatus: number): number {
  if (runtimeStatus === 401 || runtimeStatus === 403) {
    return 503;
  }
  if (runtimeStatus === 400) {
    return 502;
  }
  if (runtimeStatus >= 500) {
    return runtimeStatus;
  }
  return 502;
}
