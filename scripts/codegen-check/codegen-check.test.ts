import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { diffTrees, readTree, writeTree, type Tree } from "./codegen-check.js";

const tree = (files: Record<string, string>): Tree =>
  new Map(Object.entries(files).map(([path, text]) => [path, Buffer.from(text)]));

test("matching trees have no differences", () => {
  assert.deepEqual(diffTrees(tree({ "a.ts": "x" }), tree({ "a.ts": "x" })), []);
});

test("reports changed, added and removed files in path order", () => {
  assert.deepEqual(
    diffTrees(
      tree({ "b.ts": "old", "c.ts": "gone", "same.ts": "s" }),
      tree({ "a.ts": "new", "b.ts": "new", "same.ts": "s" }),
    ),
    [
      { path: "a.ts", status: "added" },
      { path: "b.ts", status: "changed" },
      { path: "c.ts", status: "removed" },
    ],
  );
});

test("a missing folder reads as empty", () => {
  assert.equal(readTree(join(tmpdir(), "welltutored-codegen-check-missing")).size, 0);
});

test("writeTree replaces a folder with exactly the snapshot", () => {
  const root = mkdtempSync(join(tmpdir(), "welltutored-codegen-check-"));
  try {
    const folder = join(root, "generated");
    const snapshot = tree({ "api.ts": "one", "types/user.ts": "two" });
    writeTree(folder, tree({ "stale.ts": "orval output" }));
    writeTree(folder, snapshot);
    assert.deepEqual(diffTrees(snapshot, readTree(folder)), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
