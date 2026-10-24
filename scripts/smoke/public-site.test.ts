import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { test } from "node:test";
import {
  SMOKE_TOTAL_TIMEOUT_MAX_MS,
  SMOKE_TOTAL_TIMEOUT_MIN_MS,
  SMOKE_TIMEOUT_MAX_MS,
  SMOKE_TIMEOUT_MIN_MS,
} from "./shared.js";
import {
  escapeRegExp,
  runSmoke,
  startServer,
  writeJson,
  writePage,
  type Server,
} from "./test-fixture.js";

// Answers one request itself and returns true, or returns false to leave it to
// the healthy fixture.
type Override = (
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
) => boolean;

type FailureCase = {
  name: string;
  expectedMessage: string;
  respond: Override;
};

const tutor = {
  id: 1,
  slug: "ada lovelace",
  name: "Ada Lovelace",
  subject: "Mathematics",
  resources: [],
};

const resource = {
  id: 2,
  slug: "learning & mathematics",
  title: "Learning Mathematics",
  tutorSlug: tutor.slug,
  tutorName: tutor.name,
  type: "guide",
  readMinutes: 5,
  excerpt: "A short guide.",
  publishedAt: "2026-01-01T00:00:00.000Z",
};

function writeHealthyResponse(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
) {
  const path = request.url ?? "/";

  if (path === "/api/healthz") {
    writeJson(response, { status: "ok" });
    return;
  }
  if (path === "/api/tutors") {
    writeJson(response, [{ ...tutor, resources: [resource] }]);
    return;
  }
  if (path === "/api/resources") {
    writeJson(response, [resource]);
    return;
  }
  if (
    path === "/" ||
    path === "/enquire" ||
    path === `/tutors/${encodeURIComponent(tutor.slug)}`
  ) {
    writePage(response);
    return;
  }
  if (path === "/api/enquiries" && request.method === "POST") {
    writeJson(response, { error: "Invalid enquiry." }, 400);
    return;
  }

  writeJson(response, { error: "Not found." }, 404);
}

function startFixture(override: Override = () => false): Promise<Server> {
  return startServer((request, response) => {
    if (override(request, response)) {
      return;
    }
    writeHealthyResponse(request, response);
  });
}

async function startRedirectFixture(): Promise<{
  close: () => Promise<void>;
  sourceUrl: string;
  destinationUrl: string;
}> {
  const destination = await startFixture();
  const source = await startServer((request, response) => {
    const destinationUrl = new URL(request.url ?? "/", destination.url);
    response.writeHead(302, { location: destinationUrl.toString() });
    response.end();
  });

  return {
    sourceUrl: source.url,
    destinationUrl: destination.url,
    close: async () => {
      await source.close();
      await destination.close();
    },
  };
}

const emptyContent: Override = (request, response) => {
  const path = request.url ?? "/";
  if (path !== "/api/tutors" && path !== "/api/resources") {
    return false;
  }
  writeJson(response, []);
  return true;
};

function pathResponse(
  path: string,
  callback: (
    request: IncomingMessage,
    response: ServerResponse<IncomingMessage>,
  ) => void,
): Override {
  return (request, response) => {
    if (request.url !== path) {
      return false;
    }
    callback(request, response);
    return true;
  };
}

const failureCases: FailureCase[] = [
  {
    name: "unexpected status codes",
    expectedMessage: "/api/healthz: expected HTTP 200, received 503.",
    respond: pathResponse("/api/healthz", (_request, response) => {
      writeJson(response, { error: "temporarily unavailable" }, 503);
    }),
  },
  {
    name: "malformed health payloads",
    expectedMessage: '/api/healthz: expected {"status":"ok"}.',
    respond: pathResponse("/api/healthz", (_request, response) => {
      writeJson(response, { status: "degraded" });
    }),
  },
  {
    name: "invalid JSON responses",
    expectedMessage: "/api/healthz: response was not valid JSON.",
    respond: pathResponse("/api/healthz", (_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end('{"status":');
    }),
  },
  {
    name: "responses that exceed the smoke timeout",
    expectedMessage: "/api/healthz: request failed: timed out after 2000ms",
    respond: pathResponse("/api/healthz", (_request, response) => {
      setTimeout(() => {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ status: "ok" }));
      }, 2_100);
    }),
  },
  {
    name: "responses that stall after sending headers",
    expectedMessage: "/api/healthz: request failed: timed out after 2000ms",
    respond: pathResponse("/api/healthz", (_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.write('{"status":');
    }),
  },
  {
    name: "connections that are dropped by the loopback service",
    expectedMessage: "/api/healthz: request failed:",
    respond: pathResponse("/api/healthz", (_request, response) => {
      response.destroy();
    }),
  },
  {
    name: "malformed tutor payloads",
    expectedMessage: '/api/tutors[0]: expected an array "resources".',
    respond: pathResponse("/api/tutors", (_request, response) => {
      writeJson(response, [{ ...tutor, resources: "not-an-array" }]);
    }),
  },
  {
    name: "malformed resource payloads",
    expectedMessage: '/api/resources[0]: expected an integer "id".',
    respond: pathResponse("/api/resources", (_request, response) => {
      writeJson(response, [{ ...resource, id: "not-an-integer" }]);
    }),
  },
  {
    name: "malformed HTML payloads",
    expectedMessage: '/: expected HTML content, received "application/json".',
    respond: pathResponse("/", (_request, response) => {
      writePage(response, JSON.stringify({ html: false }), "application/json");
    }),
  },
  {
    name: "malformed enquiry-validation payloads",
    expectedMessage:
      'POST /api/enquiries (invalid payload): expected a non-empty "error" string.',
    respond: pathResponse("/api/enquiries", (request, response) => {
      if (request.method !== "POST") {
        return;
      }
      writeJson(response, {}, 400);
    }),
  },
];

function runSmokeCommand(
  baseUrl: string | undefined,
  options: {
    allowEmpty?: boolean;
    timeoutMs?: string;
    totalTimeoutMs?: string;
  } = {},
) {
  return runSmoke(
    "public-site.ts",
    options.allowEmpty ? ["--allow-empty"] : [],
    {
      SMOKE_BASE_URL: baseUrl ?? "",
      SMOKE_TIMEOUT_MS: options.timeoutMs ?? "2000",
      SMOKE_TOTAL_TIMEOUT_MS: options.totalTimeoutMs ?? "60000",
    },
  );
}

test("malformed SMOKE_BASE_URL fails before making requests", async () => {
  const fixture = await startFixture();

  try {
    const result = await runSmokeCommand("not-a-url");

    assert.notEqual(result.exitCode, 0, result.output);
    assert.match(
      result.output,
      /SMOKE_BASE_URL must be an absolute HTTP\(S\) URL; received "not-a-url"\./,
    );
    assert.deepEqual(fixture.requests, []);
  } finally {
    await fixture.close();
  }
});

for (const timeoutMs of [
  "not-a-number",
  "0",
  "-1",
  "100.5",
  String(SMOKE_TIMEOUT_MAX_MS + 1),
  "Infinity",
  "NaN",
]) {
  test(
    `invalid SMOKE_TIMEOUT_MS="${timeoutMs}" fails before making requests ` +
      `(supported range: ${SMOKE_TIMEOUT_MIN_MS}-${SMOKE_TIMEOUT_MAX_MS}ms integers)`,
    async () => {
      const fixture = await startFixture();

      try {
        const result = await runSmokeCommand(fixture.url, { timeoutMs });

        assert.notEqual(result.exitCode, 0, result.output);
        assert.match(
          result.output,
          new RegExp(
            `SMOKE_TIMEOUT_MS must be an integer number of milliseconds between ` +
              `${SMOKE_TIMEOUT_MIN_MS} and ${SMOKE_TIMEOUT_MAX_MS}; received "${escapeRegExp(timeoutMs)}"\\.`,
          ),
        );
        assert.deepEqual(fixture.requests, []);
      } finally {
        await fixture.close();
      }
    },
  );
}

for (const totalTimeoutMs of [
  "not-a-number",
  String(SMOKE_TOTAL_TIMEOUT_MIN_MS - 1),
  "1000.5",
  String(SMOKE_TOTAL_TIMEOUT_MAX_MS + 1),
  "Infinity",
  "NaN",
]) {
  test(
    `invalid SMOKE_TOTAL_TIMEOUT_MS="${totalTimeoutMs}" fails before making requests ` +
      `(supported range: ${SMOKE_TOTAL_TIMEOUT_MIN_MS}-${SMOKE_TOTAL_TIMEOUT_MAX_MS}ms integers)`,
    async () => {
      const fixture = await startFixture();

      try {
        const result = await runSmokeCommand(fixture.url, { totalTimeoutMs });

        assert.notEqual(result.exitCode, 0, result.output);
        assert.match(
          result.output,
          new RegExp(
            `SMOKE_TOTAL_TIMEOUT_MS must be an integer number of milliseconds between ` +
              `${SMOKE_TOTAL_TIMEOUT_MIN_MS} and ${SMOKE_TOTAL_TIMEOUT_MAX_MS}; received "${escapeRegExp(totalTimeoutMs)}"\\.`,
          ),
        );
        assert.deepEqual(fixture.requests, []);
      } finally {
        await fixture.close();
      }
    },
  );
}

test("requires an explicit target, with or without the waiver", async () => {
  for (const options of [{}, { allowEmpty: true }]) {
    const result = await runSmokeCommand(undefined, options);

    assert.notEqual(result.exitCode, 0, result.output);
    assert.match(
      result.output,
      /SMOKE_BASE_URL must name the target of this check\. There is no default/,
    );
  }
});

test("an empty deployment fails without the waiver", async () => {
  const fixture = await startFixture(emptyContent);

  try {
    const result = await runSmokeCommand(fixture.url);

    assert.notEqual(result.exitCode, 0, result.output);
    assert.match(
      result.output,
      /\/api\/tutors: expected at least one published tutor\./,
    );
  } finally {
    await fixture.close();
  }
});

test("a published Tutor without Resources passes without the waiver", async () => {
  const fixture = await startFixture((request, response) => {
    if (request.url === "/api/tutors") {
      writeJson(response, [{ ...tutor, resources: [] }]);
      return true;
    }
    if (request.url === "/api/resources") {
      writeJson(response, []);
      return true;
    }
    return false;
  });

  try {
    const result = await runSmokeCommand(fixture.url);

    assert.equal(result.exitCode, 0, result.output);
    assert.doesNotMatch(result.output, /^\s+- /m);
  } finally {
    await fixture.close();
  }
});

test("--allow-empty waives the content assertions an empty deployment cannot meet", async () => {
  const fixture = await startFixture(emptyContent);

  try {
    const result = await runSmokeCommand(fixture.url, { allowEmpty: true });
    const skippedChecks = [...result.output.matchAll(/^\s+- (.+)$/gm)].map(
      ([, check]) => check,
    );

    assert.equal(result.exitCode, 0, result.output);
    assert.deepEqual(
      skippedChecks,
      [
        "/api/tutors has a published Tutor (deployment is empty)",
        "/tutors/:slug (no published Tutor to address)",
      ],
      result.output,
    );
    // Everything that does not depend on content still runs, the public pages
    // included — requesting those as HTML is what catches a broken deployment.
    assert.deepEqual(fixture.requests, [
      "GET /api/healthz",
      "GET /api/tutors",
      "GET /api/resources",
      "GET /",
      "GET /enquire",
      "POST /api/enquiries",
      "GET /api/healthz",
    ]);
  } finally {
    await fixture.close();
  }
});

test("--allow-empty waives nothing once the deployment has content", async () => {
  const fixture = await startFixture();

  try {
    const result = await runSmokeCommand(fixture.url, { allowEmpty: true });

    assert.equal(result.exitCode, 0, result.output);
    assert.doesNotMatch(result.output, /^\s+- /m);
    assert.equal(
      fixture.requests.includes("GET /tutors/ada%20lovelace"),
      true,
      result.output,
    );
  } finally {
    await fixture.close();
  }
});

test("rejects responses redirected to a different origin", async () => {
  const fixture = await startRedirectFixture();

  try {
    const result = await runSmokeCommand(fixture.sourceUrl);

    assert.notEqual(result.exitCode, 0, result.output);
    assert.match(
      result.output,
      new RegExp(
        `/api/healthz: response redirected from configured origin "${escapeRegExp(fixture.sourceUrl)}" ` +
          `to final origin "${escapeRegExp(fixture.destinationUrl)}".`,
      ),
    );
  } finally {
    await fixture.close();
  }
});

test(
  `SMOKE_TIMEOUT_MS accepts the supported boundaries ` +
    `(${SMOKE_TIMEOUT_MIN_MS}-${SMOKE_TIMEOUT_MAX_MS}ms)`,
  async () => {
    for (const timeoutMs of [SMOKE_TIMEOUT_MIN_MS, SMOKE_TIMEOUT_MAX_MS]) {
      const fixture = await startFixture();

      try {
        const result = await runSmokeCommand(fixture.url, {
          timeoutMs: String(timeoutMs),
        });
        assert.equal(result.exitCode, 0, result.output);
      } finally {
        await fixture.close();
      }
    }
  },
);

test("overall smoke deadline stops sequential slow requests", async () => {
  const fixture = await startFixture((request, response) => {
    const path = request.url ?? "/";
    if (path !== "/api/healthz" && path !== "/api/tutors") {
      return false;
    }

    response.on("error", () => {});
    setTimeout(() => writeHealthyResponse(request, response), 550);
    return true;
  });

  try {
    const result = await runSmokeCommand(fixture.url, {
      totalTimeoutMs: "1000",
    });

    assert.notEqual(result.exitCode, 0, result.output);
    assert.match(
      result.output,
      /\/api\/tutors: overall smoke check timed out after 1000ms\./,
    );
    assert.match(result.output, /SMOKE_TOTAL_TIMEOUT_MS/);
    assert.deepEqual(fixture.requests, ["GET /api/healthz", "GET /api/tutors"]);
  } finally {
    await fixture.close();
  }
});

test("a healthy site passes entirely against the loopback fixture", async () => {
  const fixture = await startFixture();

  try {
    const result = await runSmokeCommand(fixture.url);
    const expectedChecks = [
      "/api/healthz",
      "/api/tutors",
      "/api/resources",
      "/",
      "/enquire",
      "/tutors/ada%20lovelace",
      "POST /api/enquiries (invalid payload)",
      "/api/healthz after invalid enquiry",
    ];
    const reportedChecks = [...result.output.matchAll(/^\s+✓ (.+)$/gm)].map(
      ([, check]) => check,
    );

    assert.equal(result.exitCode, 0, result.output);
    assert.match(
      result.output,
      new RegExp(`Public site smoke check passed for ${escapeRegExp(fixture.url)}`),
    );
    assert.deepEqual(reportedChecks, expectedChecks, result.output);
    assert.deepEqual(fixture.requests, [
      "GET /api/healthz",
      "GET /api/tutors",
      "GET /api/resources",
      "GET /",
      "GET /enquire",
      "GET /tutors/ada%20lovelace",
      "POST /api/enquiries",
      "GET /api/healthz",
    ]);
  } finally {
    await fixture.close();
  }
});

for (const testCase of failureCases) {
  test(`fixture rejects ${testCase.name}`, async () => {
    const fixture = await startFixture(testCase.respond);
    try {
      const result = await runSmokeCommand(fixture.url);
      assert.notEqual(result.exitCode, 0, result.output);
      assert.match(
        result.output,
        new RegExp(
          `Public site smoke check failed: .*${escapeRegExp(testCase.expectedMessage)}`,
        ),
      );
    } finally {
      await fixture.close();
    }
  });
}
