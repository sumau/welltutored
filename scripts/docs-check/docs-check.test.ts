import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  checkDocumentation,
  extractCommentReferences,
  extractDocumentedCommands,
  extractDocumentedPaths,
  extractEnvironmentVariables,
  extractLocalLinks,
  extractWorkflowCommands,
  headingAnchors,
  validateCommentReferences,
  validateDocumentedCommands,
  validateDocumentedPaths,
  validateEnvironmentVariables,
  validateLocalLinks,
  validateOpeningLine,
  validateWorkflowCommands,
  type PackageManifestRecord,
} from "./docs-check.js";

test("extracts inline and fenced pnpm commands with source locations", () => {
  const commands = extractDocumentedCommands(
    [
      "- `pnpm --filter @workspace/backend run dev` — start the API",
      "",
      "```sh",
      "SMOKE_BASE_URL=https://example.test pnpm smoke:launch",
      "```",
      "",
      "The phrase pnpm workspaces is not a command.",
    ].join("\n"),
    "docs/example.md",
  );

  assert.deepEqual(commands, [
    {
      filePath: "docs/example.md",
      lineNumber: 1,
      command: "pnpm --filter @workspace/backend run dev",
    },
    {
      filePath: "docs/example.md",
      lineNumber: 4,
      command: "pnpm smoke:launch",
    },
  ]);
});

test("validates root and filtered workspace scripts", () => {
  const manifests: PackageManifestRecord[] = [
    {
      filePath: "package.json",
      manifest: { scripts: { build: "echo build" } },
    },
    {
      filePath: "backend/package.json",
      manifest: {
        name: "@workspace/backend",
        scripts: { dev: "echo dev" },
      },
    },
  ];

  assert.deepEqual(
    validateDocumentedCommands(
      [
        { filePath: "README.md", lineNumber: 1, command: "pnpm run build" },
        {
          filePath: "README.md",
          lineNumber: 2,
          command: "pnpm --filter @workspace/backend run dev",
        },
      ],
      manifests,
    ),
    [],
  );
});

test("reports missing packages and scripts with documentation locations", () => {
  const errors = validateDocumentedCommands(
    [
      {
        filePath: "docs/example.md",
        lineNumber: 4,
        command: "pnpm --filter @workspace/missing run dev",
      },
      {
        filePath: "docs/example.md",
        lineNumber: 8,
        command: "pnpm run missing",
      },
    ],
    [
      {
        filePath: "package.json",
        manifest: { scripts: {} },
      },
    ],
  );

  assert.deepEqual(errors, [
    'docs/example.md:4: "pnpm --filter @workspace/missing run dev" references package "@workspace/missing", but that package was not found.',
    'docs/example.md:8: "pnpm run missing" references script "missing" in "package.json", but that script was not found.',
  ]);
});

test("extracts local Markdown links, including same-doc anchors, but not external URLs", () => {
  const links = extractLocalLinks(
    [
      "[code checks](code-checks.md)",
      "[specific section](code-checks.md#api-server)",
      "[outside](../CONTRIBUTING.md)",
      "[anchor only](#overview)",
      "[website](https://example.test/docs)",
      "[protocol-relative](//example.test/docs)",
    ].join("\n"),
    "docs/pipeline.md",
  );

  assert.deepEqual(links, [
    {
      filePath: "docs/pipeline.md",
      lineNumber: 1,
      target: "code-checks.md",
    },
    {
      filePath: "docs/pipeline.md",
      lineNumber: 2,
      target: "code-checks.md#api-server",
    },
    {
      filePath: "docs/pipeline.md",
      lineNumber: 3,
      target: "../CONTRIBUTING.md",
    },
    {
      filePath: "docs/pipeline.md",
      lineNumber: 4,
      target: "#overview",
    },
  ]);
});

test("validates local link existence and repository boundaries", () => {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const errors = validateLocalLinks(
    [
      {
        filePath: "docs/pipeline.md",
        lineNumber: 10,
        target: "code-checks.md",
      },
      {
        filePath: "docs/pipeline.md",
        lineNumber: 11,
        target: "missing.md#section",
      },
      {
        filePath: "docs/pipeline.md",
        lineNumber: 12,
        target: "../../outside.md",
      },
    ],
    rootDir,
  );

  assert.deepEqual(errors, [
    'docs/pipeline.md:11: local link "missing.md#section" resolves to "docs/missing.md", but that path was not found.',
    'docs/pipeline.md:12: local link "../../outside.md" resolves outside the repository.',
  ]);
});

test("gives headings GitHub's anchors", () => {
  const anchors = headingAnchors(
    [
      "# Smoke checks",
      "## Fly.io",
      "## `TRUSTED_ORIGINS`",
      "## Rehearsing a push on a Neon branch",
      "### Step 1: [the owner](owner.md) & co.",
      "## Fly.io",
      "```md",
      "## Not a heading",
      "```",
      '<a id="custom-anchor"></a>',
      "## Closed heading ##",
    ].join("\n"),
  );

  assert.deepEqual(
    [...anchors],
    [
      "smoke-checks",
      "flyio",
      "trusted_origins",
      "rehearsing-a-push-on-a-neon-branch",
      "step-1-the-owner--co",
      "flyio-1",
      "custom-anchor",
      "closed-heading",
    ],
  );
});

test("reports a link whose anchor matches no heading in its target", () => {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const errors = validateLocalLinks(
    [
      { filePath: "docs/pipeline.md", lineNumber: 1, target: "first-deploy.md#owner" },
      { filePath: "docs/pipeline.md", lineNumber: 2, target: "first-deploy.md#no-such-heading" },
      { filePath: "docs/pipeline.md", lineNumber: 3, target: "#no-such-heading" },
      { filePath: "docs/pipeline.md", lineNumber: 4, target: "missing.md#section" },
    ],
    rootDir,
  );

  // A missing file is reported once, for the file.
  assert.deepEqual(errors, [
    'docs/pipeline.md:2: local link "first-deploy.md#no-such-heading" points to "#no-such-heading", but no heading in "docs/first-deploy.md" has that anchor.',
    'docs/pipeline.md:3: local link "#no-such-heading" points to "#no-such-heading", but no heading in "docs/pipeline.md" has that anchor.',
    'docs/pipeline.md:4: local link "missing.md#section" resolves to "docs/missing.md", but that path was not found.',
  ]);
});

test("extracts doc references from code and config comments only", () => {
  assert.deepEqual(
    extractCommentReferences(
      [
        "// The guarded update from docs/first-deploy.md#owner, then a link.",
        'const path = "docs/strings-are-not-comments.md";',
        "fetch(\"https://example.test/README.md\"); // see GLOSSARY.md.",
        "/* A block comment naming",
        " * docs/pipeline.md across lines. */",
        "const glob = `*.md`;",
      ].join("\n"),
      "lib/example.ts",
    ),
    [
      { filePath: "lib/example.ts", lineNumber: 1, reference: "docs/first-deploy.md#owner" },
      { filePath: "lib/example.ts", lineNumber: 3, reference: "GLOSSARY.md" },
      { filePath: "lib/example.ts", lineNumber: 5, reference: "docs/pipeline.md" },
    ],
  );

  assert.deepEqual(
    extractCommentReferences(
      [
        "# See docs/first-deploy.md for the secrets.",
        'url = "https://example.test/#docs/fragment.md"',
        "  strategy = \"bluegreen\" # docs/pipeline.md",
      ].join("\n"),
      "fly.toml",
    ),
    [
      { filePath: "fly.toml", lineNumber: 1, reference: "docs/first-deploy.md" },
      { filePath: "fly.toml", lineNumber: 3, reference: "docs/pipeline.md" },
    ],
  );
});

test("reports comment references to missing docs and anchors", () => {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  assert.deepEqual(
    validateCommentReferences(
      [
        { filePath: "fly.toml", lineNumber: 1, reference: "docs/pipeline.md" },
        { filePath: "fly.toml", lineNumber: 2, reference: "docs/first-deploy.md#owner" },
        { filePath: "fly.toml", lineNumber: 3, reference: "docs/deploying.md" },
        { filePath: "fly.toml", lineNumber: 4, reference: "docs/first-deploy.md#the-owner" },
      ],
      rootDir,
    ),
    [
      'fly.toml:3: the comment names "docs/deploying.md", but that file was not found.',
      'fly.toml:4: the comment names "docs/first-deploy.md#the-owner", but no heading in "docs/first-deploy.md" has that anchor.',
    ],
  );
});

test("extracts pnpm commands from inline and block run steps", () => {
  const commands = extractWorkflowCommands(
    [
      "jobs:",
      "  verify:",
      "    steps:",
      "      - uses: actions/checkout@v4",
      "      - name: Install dependencies",
      "        run: pnpm install --frozen-lockfile",
      "      - name: Verify",
      "        run: pnpm run verify:ci && pnpm docs:check",
      "      - name: Smoke",
      "        run: |",
      "          echo checking",
      "          pnpm run smoke:launch",
      "      - name: Deploy",
      "        run: flyctl deploy --remote-only",
    ].join("\n"),
    ".github/workflows/ci.yml",
  );

  // `pnpm install` names no script, and neither does a non-pnpm step.
  assert.deepEqual(commands, [
    {
      filePath: ".github/workflows/ci.yml",
      lineNumber: 8,
      command: "pnpm run verify:ci",
    },
    {
      filePath: ".github/workflows/ci.yml",
      lineNumber: 8,
      command: "pnpm docs:check",
    },
    {
      filePath: ".github/workflows/ci.yml",
      lineNumber: 12,
      command: "pnpm run smoke:launch",
    },
  ]);
});

test("validates the pnpm scripts a workflow runs", () => {
  const errors = validateWorkflowCommands(
    [
      "jobs:",
      "  deploy:",
      "    steps:",
      "      - name: Launch smoke",
      "        run: pnpm run missing",
    ].join("\n"),
    [
      {
        filePath: "package.json",
        manifest: { scripts: {} },
      },
    ],
    ".github/workflows/ci.yml",
  );

  assert.deepEqual(errors, [
    '.github/workflows/ci.yml:5: "pnpm run missing" references script "missing" in "package.json", but that script was not found.',
  ]);
});

test("accepts a guide that opens with prose after its title", () => {
  assert.deepEqual(
    validateOpeningLine(
      ["# Smoke checks", "", "For whoever runs a smoke check.", "", "## The Launch Smoke"].join("\n"),
      "docs/smoke-checks.md",
    ),
    [],
  );
});

test("rejects a guide without a title or an opening line", () => {
  assert.deepEqual(validateOpeningLine("Some prose.\n", "docs/untitled.md"), [
    'docs/untitled.md:1: a guide starts with a "# " title.',
  ]);

  for (const opening of [
    "## Usage",
    "- a list",
    "1. a step",
    "1) a step",
    "| a | table |",
    "> a quote",
    "```sh",
    "~~~sh",
    "    pnpm run build",
    "---",
    "![a diagram](diagram.svg)",
    "<details>",
  ]) {
    assert.deepEqual(
      validateOpeningLine(["# Guide", "", opening].join("\n"), "docs/guide.md"),
      [
        "docs/guide.md:3: the title is followed by a line of prose saying who the guide is for and when they would need it.",
      ],
      opening,
    );
  }

  assert.deepEqual(validateOpeningLine("# Guide\n", "docs/guide.md"), [
    "docs/guide.md:1: the title is followed by a line of prose saying who the guide is for and when they would need it.",
  ]);

  assert.deepEqual(validateOpeningLine(" \n", "docs/empty.md"), [
    'docs/empty.md:1: a guide starts with a "# " title.',
  ]);
});

test("accepts prose that starts with inline HTML or follows a comment", () => {
  for (const lines of [
    ["# Guide", "", "<abbr>CI</abbr> runs for whoever opens a pull request."],
    ["# Guide", "<!-- generated -->", "", "For whoever runs a smoke check."],
  ]) {
    assert.deepEqual(validateOpeningLine(lines.join("\n"), "docs/guide.md"), [], lines.join("|"));
  }
});

test("extracts file paths from inline code, skipping routes, identifiers, hostnames and fences", () => {
  const paths = extractDocumentedPaths(
    [
      "The router is `routes/workspace.ts`, served at `/workspace`.",
      "Import from `zod/v4`; the host is `welltutored.co.uk`; see `*.yml`.",
      "```sh",
      "cat `missing.ts`",
      "```",
      "Build with `docker/Dockerfile.dev`.",
      "Deploy to `welltutored.fly.dev`, configured in `vite.config.ts`.",
    ].join("\n"),
    "docs/architecture.md",
    new Set(["ts", "dev", "yml"]),
  );

  assert.deepEqual(paths, [
    { filePath: "docs/architecture.md", lineNumber: 1, path: "routes/workspace.ts" },
    { filePath: "docs/architecture.md", lineNumber: 6, path: "docker/Dockerfile.dev" },
    { filePath: "docs/architecture.md", lineNumber: 7, path: "vite.config.ts" },
  ]);
});

test("validates file paths by their end, on whole segments, with an allowlist", () => {
  const errors = validateDocumentedPaths(
    [
      { filePath: "docs/architecture.md", lineNumber: 1, path: "routes/workspace.ts" },
      { filePath: "docs/architecture.md", lineNumber: 2, path: "README.md" },
      { filePath: "docs/architecture.md", lineNumber: 3, path: "routes/missing.ts" },
      { filePath: "docs/architecture.md", lineNumber: 4, path: "workspace.ts" },
      { filePath: "docs/local-docker.md", lineNumber: 5, path: ".env.local" },
    ],
    ["README.md", "backend/src/routes/my-workspace.ts", "backend/src/routes/workspace.ts"],
    new Set([".env.local"]),
  );

  assert.deepEqual(errors, [
    'docs/architecture.md:3: "routes/missing.ts" names a file, but no file in the repository ends with that path. If it names a file a reader creates, add it to UNTRACKED_PATHS in scripts/src/docs-check.ts.',
  ]);

  assert.deepEqual(
    validateDocumentedPaths(
      [{ filePath: "docs/architecture.md", lineNumber: 1, path: "workspace.ts" }],
      ["backend/src/routes/my-workspace.ts"],
      new Set(),
    ),
    ['docs/architecture.md:1: "workspace.ts" names a file, but no file in the repository ends with that path. If it names a file a reader creates, add it to UNTRACKED_PATHS in scripts/src/docs-check.ts.'],
  );
});

test("extracts the environment variables the code reads by name", () => {
  const reads = extractEnvironmentVariables(
    [
      "const port = process.env.PORT ?? '8080';",
      'const level = process.env["LOG_LEVEL"];',
      "const {",
      "  DATABASE_URL,",
      "  NODE_ENV: mode = 'development',",
      "  ...rest",
      "} = process.env;",
      "const value = process.env[key];",
      "process.env.TRUSTED_ORIGINS = 'https://example.test';",
      "if (process.env.CI === 'true') {}",
      "const options = { ...process.env };",
      "const origin = environment.PUBLIC_ORIGIN?.trim();",
    ].join("\n"),
    "lib/example.ts",
  );

  assert.deepEqual(reads, [
    { filePath: "lib/example.ts", lineNumber: 1, name: "PORT" },
    { filePath: "lib/example.ts", lineNumber: 2, name: "LOG_LEVEL" },
    { filePath: "lib/example.ts", lineNumber: 3, name: "DATABASE_URL" },
    { filePath: "lib/example.ts", lineNumber: 3, name: "NODE_ENV" },
    { filePath: "lib/example.ts", lineNumber: 10, name: "CI" },
    { filePath: "lib/example.ts", lineNumber: 12, name: "PUBLIC_ORIGIN" },
  ]);
});

test("reports environment variables docs/configuration.md does not name", () => {
  const errors = validateEnvironmentVariables(
    [
      { filePath: "lib/example.ts", lineNumber: 1, name: "PORT" },
      { filePath: "lib/example.ts", lineNumber: 2, name: "BASE_PATH" },
      { filePath: "lib/example.ts", lineNumber: 3, name: "LOG_LEVEL" },
    ],
    ["| `PORT` | runtime |", "", "LOG_LEVEL is mentioned, but not as code."].join("\n"),
  );

  assert.deepEqual(errors, [
    'lib/example.ts:2: the code reads "BASE_PATH", but docs/configuration.md does not name it. Add it to the table, or to the paragraph on variables only the tooling reads.',
    'lib/example.ts:3: the code reads "LOG_LEVEL", but docs/configuration.md does not name it. Add it to the table, or to the paragraph on variables only the tooling reads.',
  ]);
});

test("all currently documented pnpm commands match the repository scripts", () => {
  const repositoryRoot = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const result = checkDocumentation(repositoryRoot);
  assert.deepEqual(result.errors, []);
  assert.ok(result.commands.length > 0);
  assert.ok(result.paths.length > 0);
  assert.ok(result.environmentVariables.length > 0);
  assert.ok(result.commentReferences.length > 0);
});