import { spawn } from "node:child_process";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { diffTrees, readTree, writeTree, type Tree } from "./check.js";

// Fails when the generated API code in the working tree isn't what Orval
// produces from backend/openapi.yaml. The dev image has no git, so instead of
// diffing against a commit this keeps a copy of each folder, regenerates, and
// compares; the copy is put back either way, so the check never edits files.

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// The output folders in backend/orval.config.ts.
const generatedFolders = [
  "frontend/src/client/generated",
  "backend/src/api/schemas/generated",
].map((folder) => resolve(repositoryRoot, folder));

function runOrval(): Promise<number> {
  const child = spawn(
    "pnpm",
    ["--filter", "@welltutored/backend", "exec", "orval", "--config", "./orval.config.ts"],
    { stdio: ["ignore", "ignore", "inherit"] },
  );

  return new Promise((resolve) => {
    child.once("error", (error) => {
      console.error(`Codegen check could not run Orval: ${error.message}`);
      resolve(1);
    });
    child.once("exit", (code, signal) => {
      if (signal) console.error(`Codegen check: Orval stopped by ${signal}.`);
      resolve(signal ? 1 : (code ?? 1));
    });
  });
}

async function main(): Promise<void> {
  const committed = new Map<string, Tree>(
    generatedFolders.map((folder) => [folder, readTree(folder)]),
  );

  const differences: string[] = [];
  try {
    const exitCode = await runOrval();
    if (exitCode !== 0) {
      console.error("Codegen check: Orval failed on backend/openapi.yaml.");
      process.exitCode = exitCode;
      return;
    }
    for (const [folder, tree] of committed) {
      for (const { path, status } of diffTrees(tree, readTree(folder))) {
        differences.push(`  ${status.padEnd(8)} ${relative(repositoryRoot, resolve(folder, path))}`);
      }
    }
  } finally {
    for (const [folder, tree] of committed) writeTree(folder, tree);
  }

  if (differences.length > 0) {
    console.error(
      [
        "Generated API code doesn't match backend/openapi.yaml:",
        ...differences,
        "Run `pnpm --filter @welltutored/backend run codegen` and commit the result.",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  console.log("Generated API code matches backend/openapi.yaml.");
}

void main();
