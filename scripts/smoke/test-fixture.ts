import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import { spawn } from "node:child_process";

// Loopback servers and a runner shared by the HTTP Smokes' tests.

export type Respond = (
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
) => void;

export type Server = {
  close: () => Promise<void>;
  requests: string[];
  url: string;
};

const smokeRoot = dirname(fileURLToPath(import.meta.url));
const scriptsRoot = resolve(smokeRoot, "..");

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function writeJson(
  response: ServerResponse<IncomingMessage>,
  body: unknown,
  status = 200,
) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

export function writePage(
  response: ServerResponse<IncomingMessage>,
  body = "<!doctype html><title>Well Tutored</title>",
  contentType = "text/html",
) {
  response.writeHead(200, { "content-type": contentType });
  response.end(body);
}

/** A loopback server that records every request and answers with `respond`. */
export async function startServer(respond: Respond): Promise<Server> {
  const requests: string[] = [];
  const server = createServer((request, response) => {
    requests.push(`${request.method ?? "GET"} ${request.url ?? "/"}`);
    respond(request, response);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");

  return {
    url: `http://127.0.0.1:${address.port}`,
    requests,
    close: async () => {
      server.close();
      await once(server, "close");
    },
  };
}

/** Runs a Smoke in a child process, as CI does, and collects its output. */
export function runSmoke(
  file: string,
  args: string[],
  env: Record<string, string>,
): Promise<{ exitCode: number | null; output: string }> {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", resolve(smokeRoot, file), ...args],
    {
      cwd: scriptsRoot,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  return new Promise((resolveResult, reject) => {
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.once("error", reject);
    child.once("close", (exitCode) => resolveResult({ exitCode, output }));
  });
}
