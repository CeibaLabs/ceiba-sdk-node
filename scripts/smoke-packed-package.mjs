import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { assertNoPackageBoundaryLeaks, listFiles } from "./package-boundary.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const fixtureRoot = mkdtempSync(join(tmpdir(), "ceiba-sdk-package-"));
const extractedRoot = join(fixtureRoot, "extracted");
const consumerRoot = join(fixtureRoot, "consumer");
const commandEnv = {
  ...process.env,
  npm_config_cache: join(fixtureRoot, "npm-cache"),
};

function run(command, args, cwd, stdio = "inherit") {
  execFileSync(command, args, {
    cwd,
    env: commandEnv,
    stdio,
  });
}

try {
  run("npm", ["pack", "--json", "--pack-destination", fixtureRoot], projectRoot, "pipe");

  const tarballs = readdirSync(fixtureRoot).filter((file) => file.endsWith(".tgz"));
  if (tarballs.length !== 1) {
    throw new Error(`Expected one packed tarball, found ${tarballs.length}.`);
  }

  const tarball = join(fixtureRoot, tarballs[0]);
  mkdirSync(extractedRoot);
  run("tar", ["-xzf", tarball, "-C", extractedRoot], projectRoot);

  const packedRoot = join(extractedRoot, "package");
  if (!existsSync(join(packedRoot, "package.json"))) {
    throw new Error("Packed artifact did not contain package/package.json.");
  }
  assertNoPackageBoundaryLeaks(packedRoot, listFiles(packedRoot));

  mkdirSync(consumerRoot);
  writeFileSync(
    join(consumerRoot, "package.json"),
    JSON.stringify({ name: "ceiba-sdk-consumer-smoke", private: true, type: "module" }, null, 2),
  );
  run(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
      "--omit=peer",
      tarball,
    ],
    consumerRoot,
  );

  writeFileSync(
    join(consumerRoot, "esm-smoke.mjs"),
    `import {
  CeibaRuntimeClient,
  httpStatusForDenial,
  parseCeibaSdkConfig,
} from "@ceibalabs/ceiba-sdk";

const config = parseCeibaSdkConfig({
  runtimeBaseUrl: "https://runtime.example.test",
  projectId: "00000000-0000-4000-8000-000000000000",
  projectSecret: "fixture-secret",
});
const client = new CeibaRuntimeClient(config);

if (typeof client.authorize !== "function" || httpStatusForDenial("rate_limited") !== 429) {
  throw new Error("ESM public SDK smoke failed.");
}
`,
  );
  run("node", ["esm-smoke.mjs"], consumerRoot);

  writeFileSync(
    join(consumerRoot, "cjs-smoke.cjs"),
    `const {
  CeibaRuntimeClient,
  httpStatusForDenial,
  parseCeibaSdkConfig,
} = require("@ceibalabs/ceiba-sdk");

const config = parseCeibaSdkConfig({
  runtimeBaseUrl: "https://runtime.example.test",
  projectId: "00000000-0000-4000-8000-000000000000",
  projectSecret: "fixture-secret",
});
const client = new CeibaRuntimeClient(config);

if (typeof client.authorize !== "function" || httpStatusForDenial("missing_api_key") !== 401) {
  throw new Error("CommonJS public SDK smoke failed.");
}
`,
  );
  run("node", ["cjs-smoke.cjs"], consumerRoot);

  writeFileSync(
    join(consumerRoot, "types-smoke.ts"),
    `import {
  CeibaRuntimeClient,
  type AccessDecision,
  type CeibaAccessContext,
  type DenialReason,
  type RuntimeAuthorizeInput,
  type SdkDecisionResult,
} from "@ceibalabs/ceiba-sdk";

declare const client: CeibaRuntimeClient;
declare const input: RuntimeAuthorizeInput;
declare const decision: AccessDecision;
declare const result: SdkDecisionResult;
declare const context: CeibaAccessContext;
declare const reason: DenialReason;

void client;
void input;
void decision;
void result;
void context;
void reason;
`,
  );
  run(
    process.execPath,
    [
      resolve(projectRoot, "node_modules/typescript/bin/tsc"),
      "--noEmit",
      "--strict",
      "--skipLibCheck",
      "--target",
      "ES2022",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "types-smoke.ts",
    ],
    consumerRoot,
  );

  console.log(
    `Packed package smoke passed for ${basename(tarball)}: artifact scan, ESM, CommonJS, and declarations.`,
  );
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
