import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

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
