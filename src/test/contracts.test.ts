import assert from "node:assert/strict";
import test from "node:test";
import type { AccessDecision } from "../contracts.js";
import { toSdkDecisionResult } from "../contracts.js";

const baseDecision: AccessDecision = {
  allowed: true,
  denialReason: null,
  projectId: "00000000-0000-4000-8000-000000000000",
  policyId: "00000000-0000-4000-8000-000000000001",
  providerKind: "api_key",
  accessContext: {
    apiKeyId: "00000000-0000-4000-8000-000000000002",
    externalSubjectType: "customer",
    externalSubjectId: "customer-1",
    planCode: "starter",
    subscriptionStatus: "active",
  },
  limits: {
    rateLimitPerMinute: 600,
    monthlyQuota: 250_000,
    remainingThisMinute: 599,
    remainingThisMonth: 249_999,
  },
};

test("allowed Runtime decisions preserve the public SDK access context", () => {
  assert.deepEqual(toSdkDecisionResult(baseDecision), {
    allowed: true,
    denialReason: null,
    accessContext: {
      projectId: baseDecision.projectId,
      policyId: baseDecision.policyId,
      apiKeyId: baseDecision.accessContext.apiKeyId,
      externalSubjectType: baseDecision.accessContext.externalSubjectType,
      externalSubjectId: baseDecision.accessContext.externalSubjectId,
      planCode: baseDecision.accessContext.planCode,
      subscriptionStatus: baseDecision.accessContext.subscriptionStatus,
    },
  });
});

test("denied Runtime decisions expose no access context", () => {
  assert.deepEqual(
    toSdkDecisionResult({
      ...baseDecision,
      allowed: false,
      denialReason: "quota_exceeded",
    }),
    {
      allowed: false,
      denialReason: "quota_exceeded",
      accessContext: null,
    },
  );
});
