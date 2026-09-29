import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative } from "node:path";

const forbiddenContent = [
  {
    label: "private Core Domain package",
    pattern: /@ceibalabs\/ceiba-core-domain/,
  },
  {
    label: "local Core Domain dependency",
    pattern: /file:\.\.\/ceiba-core-domain/,
  },
  {
    label: "macOS local path",
    pattern: /\/Users\/[^"'\s]+/,
  },
  {
    label: "Linux local path",
    pattern: /\/home\/[^"'\s]+/,
  },
  {
    label: "Windows local path",
    pattern: /[A-Za-z]:\\Users\\[^"'\s]+/,
  },
  {
    label: "local file URL",
    pattern: /file:\/\/\/[^"'\s]+/,
  },
];

export function listFiles(root) {
  const files = [];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = `${root}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...listFiles(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }

  return files;
}

export function assertNoPackageBoundaryLeaks(root, files = listFiles(root)) {
  const failures = [];

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    for (const forbidden of forbiddenContent) {
      if (forbidden.pattern.test(content)) {
        failures.push(`${relative(root, file)} contains ${forbidden.label}`);
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(`Package boundary verification failed:\n- ${failures.join("\n- ")}`);
  }
}

export function assertRegularFiles(paths) {
  for (const path of paths) {
    if (!statSync(path).isFile()) {
      throw new Error(`Expected package output is not a file: ${path}`);
    }
  }
}
