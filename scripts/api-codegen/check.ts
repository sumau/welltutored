import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Fails when the generated API code in the working tree isn't what Orval
// produces from backend/openapi.yaml. The dev image has no git, so instead of
// diffing against a commit this keeps a copy of each folder, regenerates, and
// compares; the copy is put back either way, so the check never edits files.

// Every file under a directory, keyed by its path relative to that directory.
// A missing directory reads as empty, so a folder Orval stops writing shows up
// as removed files rather than an error.
export type Tree = Map<string, Buffer>;

export function readTree(root: string): Tree {
  const tree: Tree = new Map();
  const visit = (directory: string) => {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else tree.set(relative(root, path), readFileSync(path));
    }
  };
  visit(root);
  return tree;
}

export function writeTree(root: string, tree: Tree): void {
  rmSync(root, { recursive: true, force: true });
  for (const [path, contents] of tree) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
}

export type Difference = {
  path: string;
  // added: only Orval produced it; removed: only the working tree has it.
  status: "changed" | "added" | "removed";
};

export function diffTrees(committed: Tree, regenerated: Tree): Difference[] {
  const paths = [...new Set([...committed.keys(), ...regenerated.keys()])].sort();
  const differences: Difference[] = [];
  for (const path of paths) {
    const before = committed.get(path);
    const after = regenerated.get(path);
    if (!before) differences.push({ path, status: "added" });
    else if (!after) differences.push({ path, status: "removed" });
    else if (!before.equals(after)) differences.push({ path, status: "changed" });
  }
  return differences;
}

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, "..", "..");
const configPath = resolve(here, "orval.config.ts");

// The folder each output in the config writes: its target inside its workspace.
export function outputFolders(config: Record<string, unknown>): string[] {
  return Object.entries(config).map(([name, project]) => {
    const output = (project as { output?: { workspace?: string; target?: string } }).output;
    if (!output?.workspace || !output.target) {
      throw new Error(`API codegen check: output "${name}" needs a workspace and a target.`);
    }
    return resolve(output.workspace, output.target);
  });
}

function runOrval(): Promise<number> {
  const child = spawn("pnpm", ["exec", "orval", "--config", configPath], {
    cwd: here,
    stdio: ["ignore", "ignore", "inherit"],
  });

  return new Promise((resolve) => {
    child.once("error", (error) => {
      console.error(`API codegen check could not run Orval: ${error.message}`);
      resolve(1);
    });
    child.once("exit", (code, signal) => {
      if (signal) console.error(`API codegen check: Orval stopped by ${signal}.`);
      resolve(signal ? 1 : (code ?? 1));
    });
  });
}

async function main(): Promise<void> {
  const { default: config } = await import(configPath);
  const committed = new Map<string, Tree>(
    outputFolders(config).map((folder) => [folder, readTree(folder)]),
  );

  const differences: string[] = [];
  try {
    const exitCode = await runOrval();
    if (exitCode !== 0) {
      console.error("API codegen check: Orval failed on backend/openapi.yaml.");
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
        "Run `pnpm --filter @welltutored/scripts run api-codegen` and commit the result.",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  console.log("Generated API code matches backend/openapi.yaml.");
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  void main();
}
