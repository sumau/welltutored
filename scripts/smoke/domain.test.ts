import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { test } from "node:test";
import {
  escapeRegExp,
  runSmoke,
  startServer,
  writeJson,
  writePage,
  type Respond,
  type Server,
} from "./test-fixture.js";

function clerkEnvironment(instanceEnvironmentType = "production") {
  return {
    auth_config: { object: "auth_config" },
    display_config: {
      object: "display_config",
      instance_environment_type: instanceEnvironmentType,
    },
  };
}

// Stands in for the Public Origin, the Clerk Frontend API, and one other
// hostname (www, the .com or fly.dev) that should redirect to the origin.
type Fixture = {
  target: Server;
  clerk: Server;
  alias: Server;
  close: () => Promise<void>;
};

function permanentRedirectTo(target: string): Respond {
  return (request, response) => {
    response.writeHead(301, {
      location: new URL(request.url ?? "/", target).toString(),
    });
    response.end();
  };
}

async function startFixture(
  options: {
    clerk?: Respond;
    alias?: (target: string) => Respond;
  } = {},
): Promise<Fixture> {
  const target = await startServer((_request, response) => writePage(response));
  const clerk = await startServer(
    options.clerk ??
      ((_request, response) => writeJson(response, clerkEnvironment())),
  );
  const alias = await startServer(
    (options.alias ?? permanentRedirectTo)(target.url),
  );

  return {
    target,
    clerk,
    alias,
    close: async () => {
      await alias.close();
      await clerk.close();
      await target.close();
    },
  };
}

function runSmokeCommand(
  fixture: Fixture | undefined,
  env: {
    SMOKE_BASE_URL?: string;
    SMOKE_CLERK_FRONTEND_API?: string;
    SMOKE_REDIRECT_FROM?: string;
    SMOKE_TOTAL_TIMEOUT_MS?: string;
  } = {},
) {
  return runSmoke("domain.ts", [], {
    SMOKE_BASE_URL: fixture?.target.url ?? "",
    SMOKE_CLERK_FRONTEND_API: fixture?.clerk.url ?? "",
    SMOKE_REDIRECT_FROM: fixture?.alias.url ?? "",
    SMOKE_TIMEOUT_MS: "2000",
    SMOKE_TOTAL_TIMEOUT_MS: "60000",
    ...env,
  });
}

function allRequests(fixture: Fixture) {
  return [
    ...fixture.target.requests,
    ...fixture.clerk.requests,
    ...fixture.alias.requests,
  ];
}

test("requires an explicit target", async () => {
  const result = await runSmokeCommand(undefined);

  assert.notEqual(result.exitCode, 0, result.output);
  assert.match(
    result.output,
    /SMOKE_BASE_URL must name the target of this check\. There is no default/,
  );
});

test("a missing or malformed SMOKE_CLERK_FRONTEND_API fails before making requests", async () => {
  const fixture = await startFixture();

  try {
    for (const [clerkFrontendApi, expectedMessage] of [
      ["", "SMOKE_CLERK_FRONTEND_API must name the Clerk production instance"],
      [
        "https://clerk.example/v1",
        "SMOKE_CLERK_FRONTEND_API must be a bare origin",
      ],
    ]) {
      const result = await runSmokeCommand(fixture, {
        SMOKE_CLERK_FRONTEND_API: clerkFrontendApi,
      });
      assert.notEqual(result.exitCode, 0, result.output);
      assert.match(result.output, new RegExp(expectedMessage), result.output);
    }
    assert.deepEqual(allRequests(fixture), []);
  } finally {
    await fixture.close();
  }
});

test("a missing or malformed SMOKE_REDIRECT_FROM fails before making requests", async () => {
  const fixture = await startFixture();

  try {
    for (const [redirectFrom, expectedMessage] of [
      ["", "SMOKE_REDIRECT_FROM must list the origins that redirect"],
      [" , ", "SMOKE_REDIRECT_FROM must list the origins that redirect"],
      ["https://alias.example/home", "SMOKE_REDIRECT_FROM must list bare origins"],
      ["ftp://alias.example", "SMOKE_REDIRECT_FROM must use http or https"],
      [fixture.target.url, "SMOKE_REDIRECT_FROM lists the target"],
    ]) {
      const result = await runSmokeCommand(fixture, {
        SMOKE_REDIRECT_FROM: redirectFrom,
      });
      assert.notEqual(result.exitCode, 0, result.output);
      assert.match(result.output, new RegExp(expectedMessage), result.output);
    }
    assert.deepEqual(allRequests(fixture), []);
  } finally {
    await fixture.close();
  }
});

test("a healthy domain setup passes, without requesting the target itself", async () => {
  const fixture = await startFixture();

  try {
    const result = await runSmokeCommand(fixture);
    const reportedChecks = [...result.output.matchAll(/^\s+✓ (.+)$/gm)].map(
      ([, check]) => check,
    );

    assert.equal(result.exitCode, 0, result.output);
    assert.match(
      result.output,
      new RegExp(`Domain smoke check passed for ${escapeRegExp(fixture.target.url)}`),
    );
    assert.deepEqual(reportedChecks, [
      `${fixture.clerk.url}/v1/environment`,
      `${fixture.alias.url} redirects to ${fixture.target.url}`,
    ]);
    assert.deepEqual(fixture.target.requests, []);
    assert.deepEqual(fixture.clerk.requests, ["GET /v1/environment"]);
    assert.deepEqual(fixture.alias.requests, [
      "GET /enquire?smoke=redirect",
    ]);
  } finally {
    await fixture.close();
  }
});

for (const clerkCase of [
  {
    name: "malformed Clerk payloads",
    body: { ...clerkEnvironment(), auth_config: { object: "unexpected" } },
    expectedMessage: "/v1/environment: unexpected auth_config object.",
  },
  {
    name: "a development Clerk instance",
    body: clerkEnvironment("development"),
    expectedMessage:
      '/v1/environment: expected a production instance, received "development".',
  },
]) {
  test(`rejects ${clerkCase.name}`, async () => {
    const fixture = await startFixture({
      clerk: (_request, response) => writeJson(response, clerkCase.body),
    });

    try {
      const result = await runSmokeCommand(fixture);
      assert.notEqual(result.exitCode, 0, result.output);
      assert.match(
        result.output,
        new RegExp(escapeRegExp(clerkCase.expectedMessage)),
      );
    } finally {
      await fixture.close();
    }
  });
}

for (const aliasCase of [
  {
    name: "an origin that serves the site instead of redirecting",
    respond:
      () =>
      (_request: IncomingMessage, response: ServerResponse<IncomingMessage>) =>
        writePage(response),
    expectedMessage: "expected HTTP 301, received 200",
  },
  {
    name: "a temporary redirect",
    respond:
      (target: string) =>
      (request: IncomingMessage, response: ServerResponse<IncomingMessage>) => {
        response.writeHead(302, {
          location: new URL(request.url ?? "/", target).toString(),
        });
        response.end();
      },
    expectedMessage: "expected HTTP 301, received 302",
  },
  {
    name: "a redirect that drops the path and query",
    respond:
      (target: string) =>
      (_request: IncomingMessage, response: ServerResponse<IncomingMessage>) => {
        response.writeHead(301, { location: `${target}/` });
        response.end();
      },
    expectedMessage: `expected Location "`,
  },
]) {
  test(`rejects ${aliasCase.name}`, async () => {
    const fixture = await startFixture({ alias: aliasCase.respond });

    try {
      const result = await runSmokeCommand(fixture);
      assert.notEqual(result.exitCode, 0, result.output);
      assert.match(
        result.output,
        new RegExp(
          escapeRegExp(
            `${fixture.alias.url} redirects to ${fixture.target.url}: ${aliasCase.expectedMessage}`,
          ),
        ),
      );
    } finally {
      await fixture.close();
    }
  });
}
