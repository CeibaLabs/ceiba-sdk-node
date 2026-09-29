import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertNoPackageBoundaryLeaks,
  assertRegularFiles,
  listFiles,
} from "./package-boundary.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const distRoot = resolve(projectRoot, "dist");
const requiredOutputs = [
  resolve(distRoot, "index.js"),
  resolve(distRoot, "index.cjs"),
  resolve(distRoot, "index.d.ts"),
  resolve(distRoot, "express.js"),
  resolve(distRoot, "express.cjs"),
  resolve(distRoot, "express.d.ts"),
  resolve(distRoot, "fastify.js"),
  resolve(distRoot, "fastify.cjs"),
  resolve(distRoot, "fastify.d.ts"),
];

for (const output of requiredOutputs) {
  if (!existsSync(output)) {
    throw new Error(`Missing package output: ${output}`);
  }
}

assertRegularFiles(requiredOutputs);
assertNoPackageBoundaryLeaks(projectRoot, [
  resolve(projectRoot, "package.json"),
  ...listFiles(distRoot),
]);

console.log(`Package boundary verified across ${listFiles(distRoot).length} dist files.`);
