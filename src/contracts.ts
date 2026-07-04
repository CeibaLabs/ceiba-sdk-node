export type DenialReason =
  | "missing_api_key"
  | "invalid_api_key"
  | "revoked_api_key"
  | "archived_api_key"
  | "expired_api_key"
  | "policy_no_match"
  | "inactive_subscription"
  | "quota_exceeded"
  | "rate_limited";

export type RuntimeAuthorizeInput = {
  projectId: string;
  request: {
    method: string;
    path: string;
    ip: string | null;
  };
  credential: {
    kind: "api_key";
    presentedKey: string | null;
  };
};

export type AccessDecision = {
  allowed: boolean;
  denialReason: DenialReason | null;
  projectId: string;
  policyId: string | null;
  providerKind: "api_key";
  accessContext: {
    apiKeyId: string | null;
    externalSubjectType: string | null;
    externalSubjectId: string | null;
    planCode: string | null;
    subscriptionStatus: string | null;
  };
  limits: {
    rateLimitPerMinute: number | null;
    monthlyQuota: number | null;
    remainingThisMinute: number | null;
    remainingThisMonth: number | null;
  };
};

export type CeibaAccessContext = {
  projectId: string;
  policyId: string | null;
  apiKeyId: string | null;
  externalSubjectType: string | null;
  externalSubjectId: string | null;
  planCode: string | null;
  subscriptionStatus: string | null;
};

export type SdkDecisionResult = {
  allowed: boolean;
  denialReason: DenialReason | null;
  accessContext: CeibaAccessContext | null;
};

export function toSdkDecisionResult(decision: AccessDecision): SdkDecisionResult {
  if (!decision.allowed) {
    return {
      allowed: false,
      denialReason: decision.denialReason,
      accessContext: null,
    };
  }

  return {
    allowed: true,
    denialReason: null,
    accessContext: {
      projectId: decision.projectId,
      policyId: decision.policyId,
      apiKeyId: decision.accessContext.apiKeyId,
      externalSubjectType: decision.accessContext.externalSubjectType,
      externalSubjectId: decision.accessContext.externalSubjectId,
      planCode: decision.accessContext.planCode,
      subscriptionStatus: decision.accessContext.subscriptionStatus,
    },
  };
}
