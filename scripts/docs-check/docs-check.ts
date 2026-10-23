import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ignoredDirectories = new Set([
  ".cache",
  ".git",
  ".local",
  "dist",
  "node_modules",
]);

export type DocumentationCommand = {
  filePath: string;
  lineNumber: number;
  command: string;
};

export type DocumentationLink = {
  filePath: string;
  lineNumber: number;
  target: string;
};

export type DocumentationPath = {
  filePath: string;
  lineNumber: number;
  path: string;
};

export type CommentReference = {
  filePath: string;
  lineNumber: number;
  reference: string;
};

export type EnvironmentVariableRead = {
  filePath: string;
  lineNumber: number;
  name: string;
};

export type PackageManifest = {
  name?: string;
  scripts?: Record<string, string>;
};

export type PackageManifestRecord = {
  filePath: string;
  manifest: PackageManifest;
};

export type DocumentationCheckResult = {
  commands: DocumentationCommand[];
  links: DocumentationLink[];
  paths: DocumentationPath[];
  environmentVariables: EnvironmentVariableRead[];
  commentReferences: CommentReference[];
  errors: string[];
};

function walkFiles(directory: string, fileName?: string): string[] {
  if (!existsSync(directory)) return [];

  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) continue;
      files.push(...walkFiles(join(directory, entry.name), fileName));
      continue;
    }
    if (entry.isFile() && (!fileName || entry.name === fileName)) {
      files.push(join(directory, entry.name));
    }
  }
  return files;
}

function documentationFiles(rootDir: string): string[] {
  return [
    ...["README.md", "CONTRIBUTING.md", "GLOSSARY.md"]
      .map((fileName) => join(rootDir, fileName))
      .filter((filePath) => existsSync(filePath)),
    ...walkFiles(join(rootDir, "docs")),
  ]
    .filter((filePath) => filePath.endsWith(".md"))
    .sort();
}

// The guides a person reads by task: README, CONTRIBUTING and the top level of
// docs/. docs/adr/ and docs/agents/ follow their own templates, and GLOSSARY.md
// the domain-modeling skill's.
function isGuide(relativePath: string): boolean {
  return (
    relativePath === "README.md" ||
    relativePath === "CONTRIBUTING.md" ||
    /^docs\/[^/]+\.md$/.test(relativePath)
  );
}

/**
 * A guide opens with its title and then a line of prose saying who it is for
 * and when they would need it, so a reader can tell from the top whether they
 * are in the right place. Only the shape is checkable: the paragraph after the
 * title has to be prose, not a heading, list, table, quote or code.
 */
export function validateOpeningLine(markdown: string, filePath: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const titleIndex = lines.findIndex((line) => line.trim() !== "");
  if (titleIndex < 0 || !lines[titleIndex].startsWith("# ")) {
    return [`${filePath}:${Math.max(titleIndex, 0) + 1}: a guide starts with a "# " title.`];
  }

  // A comment is invisible to the reader, so the opening is the first line after
  // the title that is neither blank nor a whole-line HTML comment.
  const openingIndex = lines.findIndex(
    (line, index) =>
      index > titleIndex && line.trim() !== "" && !/^\s*<!--.*-->\s*$/.test(line),
  );
  const opening = openingIndex < 0 ? "" : lines[openingIndex];
  // Indented code is four spaces or a tab, so it is tested before trimming.
  const isIndentedCode = /^( {4}|\t)/.test(opening);
  const trimmed = opening.trimStart();
  // A line that is only an HTML tag is a block (<details>, <img>); a tag that
  // starts a sentence, such as <abbr>, is prose.
  const isNotProse =
    /^(#|[-*+] |\d+[.)] |\||>|```|~~~|!\[)/.test(trimmed) ||
    /^([-*_])( *\1){2,} *$/.test(trimmed) ||
    /^<[^>]+>$/.test(trimmed.trimEnd());
  if (!trimmed || isIndentedCode || isNotProse) {
    return [
      `${filePath}:${openingIndex < 0 ? titleIndex + 1 : openingIndex + 1}: ` +
        "the title is followed by a line of prose saying who the guide is for and when they would need it.",
    ];
  }
  return [];
}

function extractCommandFromLine(line: string, inCodeFence: boolean): string | undefined {
  const pnpmIndex = line.indexOf("pnpm");
  if (pnpmIndex < 0) return undefined;

  const isInlineCode = line.slice(0, pnpmIndex).includes("`");
  if (!inCodeFence && !isInlineCode) return undefined;

  const command = line
    .slice(pnpmIndex)
    .split("`", 1)[0]
    .split(" —", 1)[0]
    .split(" #", 1)[0]
    .trim()
    .replace(/[.,;:]$/, "");

  return command.startsWith("pnpm ") ? command : undefined;
}

export function extractDocumentedCommands(
  markdown: string,
  filePath: string,
): DocumentationCommand[] {
  const commands: DocumentationCommand[] = [];
  let inCodeFence = false;

  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    if (line.trimStart().startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }

    const command = extractCommandFromLine(line, inCodeFence);
    if (command) {
      commands.push({
        filePath,
        lineNumber: index + 1,
        command,
      });
    }
  }

  return commands;
}

export function extractLocalLinks(
  markdown: string,
  filePath: string,
): DocumentationLink[] {
  const links: DocumentationLink[] = [];
  const linkPattern = /\[[^\]]+\]\(([^)\s]+)(?:\s+["'][^)]*)?\)/g;

  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    for (const match of line.matchAll(linkPattern)) {
      const target = match[1];
      if (
        !target ||
        target.startsWith("//") ||
        /^[a-z][a-z\d+.-]*:/i.test(target)
      ) {
        continue;
      }

      links.push({
        filePath,
        lineNumber: index + 1,
        target,
      });
    }
  }

  return links;
}

/**
 * The anchors GitHub gives a doc's headings: the heading's text, lowercased,
 * with punctuation other than `-` and `_` dropped and each space made a `-`. A
 * repeated heading gets `-1`, `-2` and so on. Headings in fences are code, and
 * an explicit `<a id>` or `<a name>` counts as well.
 */
export function headingAnchors(markdown: string): Set<string> {
  const anchors = new Set<string>();
  const seen = new Map<string, number>();
  let inCodeFence = false;

  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    for (const match of line.matchAll(/<a\s[^>]*\b(?:id|name)=["']([^"']+)["']/g)) {
      anchors.add(match[1]);
    }

    const heading = line.match(/^ {0,3}#{1,6}\s+(.*?)(?:\s+#+)?\s*$/);
    if (!heading) continue;
    const slug = heading[1]
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/<[^>]+>/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N} _-]/gu, "")
      .replace(/ /g, "-");
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    anchors.add(count === 0 ? slug : `${slug}-${count}`);
  }

  return anchors;
}

// Read each target doc's anchors once, however many links point into it.
function anchorChecker(): (filePath: string, anchor: string) => boolean {
  const cache = new Map<string, Set<string>>();
  return (filePath, anchor) => {
    if (!cache.has(filePath)) {
      cache.set(filePath, headingAnchors(readFileSync(filePath, "utf8")));
    }
    let decoded = anchor;
    try {
      decoded = decodeURIComponent(anchor);
    } catch {
      // A malformed escape is checked as written.
    }
    return cache.get(filePath)!.has(decoded);
  };
}

export function validateLocalLinks(
  links: DocumentationLink[],
  rootDir: string,
): string[] {
  const errors: string[] = [];
  const hasAnchor = anchorChecker();

  for (const link of links) {
    const [withoutQuery, anchor] = link.target.split("#", 2);
    const targetPath = withoutQuery.split("?", 1)[0];

    // A bare `#anchor` points into the doc it is in.
    const sourcePath = join(rootDir, link.filePath);
    const resolvedTarget = targetPath ? resolve(dirname(sourcePath), targetPath) : sourcePath;
    const relativeTarget = relative(rootDir, resolvedTarget);
    const location = `${link.filePath}:${link.lineNumber}`;

    if (relativeTarget === ".." || relativeTarget.startsWith("../")) {
      errors.push(
        `${location}: local link "${link.target}" resolves outside the repository.`,
      );
      continue;
    }

    if (!existsSync(resolvedTarget)) {
      errors.push(
        `${location}: local link "${link.target}" resolves to "${relativeTarget}", but that path was not found.`,
      );
      continue;
    }

    if (anchor && resolvedTarget.endsWith(".md") && !hasAnchor(resolvedTarget, anchor)) {
      errors.push(
        `${location}: local link "${link.target}" points to "#${anchor}", but no heading in "${relativeTarget}" has that anchor.`,
      );
    }
  }

  return errors;
}

// Names that look like files but that the repository never holds.
const UNTRACKED_PATHS = new Set<string>([
  // docs/agents/domain.md says there is no glossary map.
  "GLOSSARY-MAP.md",
]);

// Top-level domains that are also the extension of some repository file
// (`Dockerfile.dev`), or plausibly will be.
const TOP_LEVEL_DOMAINS = new Set(["app", "com", "dev", "io", "net", "org", "uk"]);

function extensionOf(name: string): string | undefined {
  return name.match(/[^/]\.([a-z][a-z\d]*)$/i)?.[1].toLowerCase();
}

// `welltutored.fly.dev`, but not `Dockerfile.dev` or `vite.config.ts`.
function isHostname(token: string): boolean {
  return (
    /^[a-z\d-]+(\.[a-z\d-]+)+$/.test(token) &&
    TOP_LEVEL_DOMAINS.has(extensionOf(token) ?? "")
  );
}

/**
 * Pull the file paths a doc names in inline code. A path is a token of path
 * characters that doesn't start with `/` and ends in an extension some file in
 * the repository has. So URL routes (`/workspace`), identifiers with no
 * extension (`zod/v4`), globs (`*.yml`), hostnames (`welltutored.fly.dev`)
 * and member accesses (`clerkClient.users`) are skipped. Fenced blocks are skipped
 * too: they hold commands and output, not references.
 */
export function extractDocumentedPaths(
  markdown: string,
  filePath: string,
  extensions: ReadonlySet<string>,
): DocumentationPath[] {
  const paths: DocumentationPath[] = [];
  let inCodeFence = false;

  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    if (/^\s*(```|~~~)/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    for (const match of line.matchAll(/`([^`]+)`/g)) {
      const token = match[1];
      const extension = extensionOf(token);
      if (
        !/^[\w.@/-]+$/.test(token) ||
        token.startsWith("/") ||
        isHostname(token) ||
        !extension ||
        !extensions.has(extension)
      ) {
        continue;
      }
      paths.push({ filePath, lineNumber: index + 1, path: token });
    }
  }

  return paths;
}

/**
 * A named path must be the end of some file's path in the repository, so the
 * short names a doc uses in context (`routes/workspace.ts`) count. The match is
 * on whole segments: `workspace.ts` does not match `my-workspace.ts`.
 */
export function validateDocumentedPaths(
  paths: DocumentationPath[],
  repositoryFiles: string[],
  untrackedPaths: ReadonlySet<string> = UNTRACKED_PATHS,
): string[] {
  return paths
    .filter(
      ({ path }) =>
        !untrackedPaths.has(path) &&
        !repositoryFiles.some((file) => file === path || file.endsWith(`/${path}`)),
    )
    .map(
      ({ filePath, lineNumber, path }) =>
        `${filePath}:${lineNumber}: "${path}" names a file, but no file in the repository ends with that path. If it names a file a reader creates, add it to UNTRACKED_PATHS in scripts/src/docs-check.ts.`,
    );
}

const SOURCE_EXTENSIONS = new Set(["cjs", "cts", "js", "jsx", "mjs", "mts", "ts", "tsx"]);

// The code the Docs Check reads for its references to the docs. Generated code
// is skipped, and so are tests: a test sets variables to exercise the code, and
// its fixtures are not references.
function isSourceFile(relativePath: string): boolean {
  return (
    SOURCE_EXTENSIONS.has(extensionOf(relativePath) ?? "") &&
    !relativePath.split("/").includes("generated") &&
    !/\.test\.[^/]+$/.test(relativePath)
  );
}

// Config and workflow files, whose comments start with a hash.
function hasHashComments(relativePath: string): boolean {
  const name = relativePath.split("/").pop() ?? "";
  return (
    name.startsWith("Dockerfile") ||
    ["sh", "toml", "yaml", "yml"].includes(extensionOf(name) ?? "")
  );
}

function commentText(source: string, hashComments: boolean): Array<[number, string]> {
  const comments: Array<[number, string]> = [];
  let inBlockComment = false;

  for (const [index, line] of source.split(/\r?\n/).entries()) {
    if (hashComments) {
      // At the start of the line or after a space, so a URL's fragment is not
      // a comment.
      const match = line.match(/(?:^|\s)#(.*)$/);
      if (match) comments.push([index + 1, match[1]]);
      continue;
    }

    let rest = line;
    let text = "";
    while (rest) {
      if (inBlockComment) {
        const end = rest.indexOf("*/");
        text += ` ${end < 0 ? rest : rest.slice(0, end)}`;
        if (end < 0) break;
        inBlockComment = false;
        rest = rest.slice(end + 2);
        continue;
      }
      // After a space or at the start, so `https://` is not a comment.
      const lineComment = rest.match(/(?:^|\s)\/\/(.*)$/);
      const blockStart = rest.search(/(?:^|\s)\/\*/);
      if (lineComment && (blockStart < 0 || (lineComment.index ?? 0) <= blockStart)) {
        text += ` ${lineComment[1]}`;
        break;
      }
      if (blockStart < 0) break;
      inBlockComment = true;
      rest = rest.slice(rest.indexOf("/*", blockStart) + 2);
    }
    if (text.trim()) comments.push([index + 1, text]);
  }

  return comments;
}

/**
 * Pull the docs a code, config or workflow comment points to: a path under
 * docs/ or a bare name at the root, ending in the Markdown extension and
 * optionally an anchor. A renamed doc or heading leaves these behind silently,
 * since nothing renders them.
 */
export function extractCommentReferences(
  source: string,
  filePath: string,
  hashComments = hasHashComments(filePath),
): CommentReference[] {
  return commentText(source, hashComments).flatMap(([lineNumber, text]) =>
    [...text.matchAll(/(?<![\w./-])((?:docs\/[\w./-]*?)?[\w-]+\.md(?:#[\w-]+)?)(?![\w/-])/g)].map(
      (match) => ({ filePath, lineNumber, reference: match[1] }),
    ),
  );
}

export function validateCommentReferences(
  references: CommentReference[],
  rootDir: string,
): string[] {
  const hasAnchor = anchorChecker();
  return references.flatMap(({ filePath, lineNumber, reference }) => {
    const [path, anchor] = reference.split("#", 2);
    const location = `${filePath}:${lineNumber}`;
    if (!existsSync(join(rootDir, path))) {
      return [`${location}: the comment names "${path}", but that file was not found.`];
    }
    if (anchor && !hasAnchor(join(rootDir, path), anchor)) {
      return [
        `${location}: the comment names "${reference}", but no heading in "${path}" has that anchor.`,
      ];
    }
    return [];
  });
}

function lineNumberAt(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}

/**
 * Pull the environment variables a source file reads by name from
 * `process.env`: a dotted or quoted key, or a destructured property. A computed
 * key names no variable here, and an assignment is not a read. An upper-case
 * dotted key read from a parameter named `environment` counts too, since
 * backend/src/core/config.ts reads its settings through one that defaults to
 * `process.env`. (Written in words, since this file is itself checked.)
 */
export function extractEnvironmentVariables(
  source: string,
  filePath: string,
): EnvironmentVariableRead[] {
  const reads: EnvironmentVariableRead[] = [];
  const push = (index: number, name: string) =>
    reads.push({ filePath, lineNumber: lineNumberAt(source, index), name });

  for (const match of source.matchAll(
    /process\.env(?:\.([A-Za-z_$][\w$]*)|\[\s*(["'`])([^"'`]+)\2\s*\])(?![\w$]|\s*=[^=])/g,
  )) {
    push(match.index, match[1] ?? match[3]);
  }

  for (const match of source.matchAll(/\benvironment\.([A-Z_][A-Z0-9_]*)(?![\w$]|\s*=[^=])/g)) {
    push(match.index, match[1]);
  }

  for (const match of source.matchAll(/\{([^{}]*)\}\s*=\s*process\.env\b/g)) {
    for (const property of match[1].split(",")) {
      const name = property.trim().split(/\s*[:=]/, 1)[0];
      if (/^[A-Za-z_$][\w$]*$/.test(name)) push(match.index, name);
    }
  }

  return reads.sort((a, b) => a.lineNumber - b.lineNumber);
}

function inlineCode(markdown: string): Set<string> {
  return new Set([...markdown.matchAll(/`([^`]+)`/g)].map((match) => match[1]));
}

/**
 * Every variable the code reads is named, in inline code, in
 * docs/configuration.md: in its table, or in the paragraph that points to the
 * doc covering a tool's variables.
 */
export function validateEnvironmentVariables(
  reads: EnvironmentVariableRead[],
  configurationMarkdown: string,
): string[] {
  const named = inlineCode(configurationMarkdown);
  return reads
    .filter(({ name }) => !named.has(name))
    .map(
      ({ filePath, lineNumber, name }) =>
        `${filePath}:${lineNumber}: the code reads "${name}", but docs/configuration.md does not name it. Add it to the table, or to the paragraph on variables only the tooling reads.`,
    );
}

function readPackageManifests(rootDir: string): PackageManifestRecord[] {
  const packagePaths = new Set<string>([
    join(rootDir, "package.json"),
    ...walkFiles(join(rootDir, "backend"), "package.json"),
    ...walkFiles(join(rootDir, "frontend"), "package.json"),
    ...walkFiles(join(rootDir, "scripts"), "package.json"),
  ]);

  return [...packagePaths]
    .filter((filePath) => existsSync(filePath))
    .sort()
    .map((filePath) => ({
      filePath,
      manifest: JSON.parse(readFileSync(filePath, "utf8")) as PackageManifest,
    }));
}

function packageForFilter(
  filter: string | undefined,
  manifests: PackageManifestRecord[],
): PackageManifestRecord | undefined {
  if (!filter) {
    return manifests.find(
      ({ filePath, manifest }) =>
        filePath === "package.json" ||
        manifest.name === "workspace" ||
        manifest.name === undefined,
    );
  }
  return manifests.find(({ manifest }) => manifest.name === filter);
}

function parseScriptReference(command: string): {
  filter?: string;
  script?: string;
  unsupported?: string;
} {
  const tokens = command.match(/(?:"[^"]*"|'[^']*'|\S+)/g)?.map((token) =>
    token.replace(/^['"]|['"]$/g, ""),
  ) ?? [];

  let index = 1;
  let filter: string | undefined;
  if (tokens[index] === "--filter") {
    filter = tokens[index + 1];
    index += 2;
  } else if (tokens[index]?.startsWith("--filter=")) {
    filter = tokens[index].slice("--filter=".length);
    index += 1;
  }

  if (!tokens[index]) {
    return { filter, unsupported: "no script name" };
  }
  if (tokens[index] === "run") {
    return {
      filter,
      script: tokens[index + 1],
      ...(tokens[index + 1] ? {} : { unsupported: "no script name after run" }),
    };
  }

  if (tokens[index].startsWith("-")) {
    return { filter, unsupported: `unsupported pnpm option "${tokens[index]}"` };
  }

  return { filter, script: tokens[index] };
}

function extractPnpmCommands(shellCommand: string): string[] {
  return shellCommand
    .split(/\s*(?:&&|\|\||;|\|)\s*/)
    .map((segment) => {
      const pnpmIndex = segment.indexOf("pnpm");
      return pnpmIndex >= 0 ? segment.slice(pnpmIndex).trim() : undefined;
    })
    .filter((command): command is string => Boolean(command));
}

export function validateDocumentedCommands(
  commands: DocumentationCommand[],
  manifests: PackageManifestRecord[],
): string[] {
  const errors: string[] = [];

  for (const documented of commands) {
    const reference = parseScriptReference(documented.command);
    const location = `${documented.filePath}:${documented.lineNumber}`;
    if (reference.unsupported) {
      errors.push(
        `${location}: "${documented.command}" has ${reference.unsupported}.`,
      );
      continue;
    }

    const packageRecord = packageForFilter(reference.filter, manifests);
    if (!packageRecord) {
      errors.push(
        `${location}: "${documented.command}" references package ` +
          `"${reference.filter ?? "the root package"}", but that package was not found.`,
      );
      continue;
    }

    if (!reference.script || !packageRecord.manifest.scripts?.[reference.script]) {
      errors.push(
        `${location}: "${documented.command}" references script ` +
          `"${reference.script ?? "(missing)"}" in ` +
          `"${packageRecord.manifest.name ?? packageRecord.filePath}", but that script was not found.`,
      );
    }
  }

  return errors;
}

export type WorkflowCommand = {
  filePath: string;
  lineNumber: number;
  command: string;
};

// pnpm's own subcommands, which a workflow calls directly and which name no
// script. Documentation writes `pnpm run <script>`; a workflow also has to
// install. Only the ones a workflow plausibly runs are listed.
const PNPM_BUILTIN_COMMANDS = new Set([
  "add",
  "audit",
  "config",
  "dlx",
  "exec",
  "fetch",
  "install",
  "link",
  "prune",
  "rebuild",
  "remove",
  "store",
  "update",
  "why",
]);

function namesAScript(command: string): boolean {
  const firstArgument = command.split(/\s+/)[1];
  return firstArgument === undefined || !PNPM_BUILTIN_COMMANDS.has(firstArgument);
}

/**
 * Pull every `pnpm` invocation out of a workflow's `run:` steps.
 *
 * Deliberately a line scan rather than a YAML parse: the only thing this needs
 * from the document is which shell commands it runs, and `run:` is the one key
 * that carries them. A block scalar (`run: |`) continues until the indentation
 * drops back to the key's own level.
 */
export function extractWorkflowCommands(
  content: string,
  filePath: string,
): WorkflowCommand[] {
  const lines = content.split(/\r?\n/);
  const commands: WorkflowCommand[] = [];

  const push = (lineNumber: number, shellCommand: string) => {
    commands.push(
      ...extractPnpmCommands(shellCommand)
        .filter(namesAScript)
        .map((command) => ({
          filePath,
          lineNumber,
          command,
        })),
    );
  };

  for (let index = 0; index < lines.length; index += 1) {
    const runMatch = lines[index].match(/^(\s*)-?\s*run:\s*(.*)$/);
    if (!runMatch) continue;

    const [, leadingSpace, inlineValue] = runMatch;
    const value = inlineValue.trim();
    if (value !== "|" && value !== ">" && value !== "|-" && value !== ">-") {
      push(index + 1, value.replace(/^['"]|['"]$/g, ""));
      continue;
    }

    const keyIndent = leadingSpace.length;
    for (let block = index + 1; block < lines.length; block += 1) {
      const line = lines[block];
      if (line.trim() === "") continue;
      const indent = line.length - line.trimStart().length;
      if (indent <= keyIndent) break;
      push(block + 1, line.trim());
      index = block;
    }
  }

  return commands;
}

export function validateWorkflowCommands(
  content: string,
  manifests: PackageManifestRecord[],
  filePath: string,
): string[] {
  return validateDocumentedCommands(
    extractWorkflowCommands(content, filePath).map(
      ({ filePath: file, lineNumber, command }) => ({
        filePath: file,
        lineNumber,
        command,
      }),
    ),
    manifests,
  );
}

function workflowFiles(rootDir: string): string[] {
  const workflowsDir = join(rootDir, ".github", "workflows");
  if (!existsSync(workflowsDir)) return [];

  return readdirSync(workflowsDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        (entry.name.endsWith(".yml") || entry.name.endsWith(".yaml")),
    )
    .map((entry) => join(workflowsDir, entry.name))
    .sort();
}

export function checkDocumentation(rootDir: string): DocumentationCheckResult {
  const files = documentationFiles(rootDir).map((filePath) => ({
    relativePath: relative(rootDir, filePath),
    markdown: readFileSync(filePath, "utf8"),
  }));
  const commands = files.flatMap(({ relativePath, markdown }) =>
    extractDocumentedCommands(markdown, relativePath),
  );
  const links = files.flatMap(({ relativePath, markdown }) =>
    extractLocalLinks(markdown, relativePath),
  );
  // A walk rather than `git ls-files`: the dev image has no git. Ignored
  // directories are skipped, but a local untracked file such as `.env` still
  // counts here, so CI is the stricter run.
  const repositoryFiles = walkFiles(rootDir).map((filePath) => relative(rootDir, filePath));
  const extensions = new Set(
    repositoryFiles
      .map(extensionOf)
      .filter((extension): extension is string => Boolean(extension)),
  );
  const paths = files.flatMap(({ relativePath, markdown }) =>
    extractDocumentedPaths(markdown, relativePath, extensions),
  );
  // One read of the code and config, which every rule about their references
  // to the docs shares.
  const codeFiles = repositoryFiles
    .filter((relativePath) => isSourceFile(relativePath) || hasHashComments(relativePath))
    .sort()
    .map((relativePath) => ({
      relativePath,
      source: readFileSync(join(rootDir, relativePath), "utf8"),
    }));
  const environmentVariables = codeFiles
    .filter(({ relativePath }) => isSourceFile(relativePath))
    .flatMap(({ relativePath, source }) => extractEnvironmentVariables(source, relativePath));
  const commentReferences = codeFiles.flatMap(({ relativePath, source }) =>
    extractCommentReferences(source, relativePath),
  );
  const configurationPath = join(rootDir, "docs", "configuration.md");
  const environmentErrors = validateEnvironmentVariables(
    environmentVariables,
    existsSync(configurationPath) ? readFileSync(configurationPath, "utf8") : "",
  );
  const manifests = readPackageManifests(rootDir);
  // The workflows call pnpm scripts too, and a deploy that names a script that
  // no longer exists fails after it has already shipped the image.
  const workflowErrors = workflowFiles(rootDir).flatMap((filePath) =>
    validateWorkflowCommands(
      readFileSync(filePath, "utf8"),
      manifests,
      relative(rootDir, filePath),
    ),
  );

  const openingErrors = files
    .filter(({ relativePath }) => isGuide(relativePath))
    .flatMap(({ relativePath, markdown }) => validateOpeningLine(markdown, relativePath));

  return {
    commands,
    links,
    paths,
    environmentVariables,
    commentReferences,
    errors: [
      ...validateDocumentedCommands(commands, manifests),
      ...validateLocalLinks(links, rootDir),
      ...validateDocumentedPaths(paths, repositoryFiles),
      ...workflowErrors,
      ...openingErrors,
      ...environmentErrors,
      ...validateCommentReferences(commentReferences, rootDir),
    ],
  };
}

function repositoryRoot(): string {
  return resolve(fileURLToPath(new URL("../..", import.meta.url)));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const result = checkDocumentation(repositoryRoot());
  if (result.errors.length > 0) {
    console.error("Documentation command check failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Documentation check passed (${result.commands.length} commands, ${result.links.length} local links, ${result.paths.length} file paths, ${result.environmentVariables.length} environment variable reads and ${result.commentReferences.length} doc references in comments checked).`,
    );
  }
}