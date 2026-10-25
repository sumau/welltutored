import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import * as React from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Tutor } from "@/client";

const tutor: Tutor = {
  id: 1,
  slug: "alice-smith",
  name: "Alice Smith",
  firstName: "Alice",
  lastName: "Smith",
  initials: "AS",
  subject: "English",
  support: "GCSE English",
  profileSummary: "A supportive English tutor.",
  university: "University of Oxford",
  qualification: "BA English",
  bio: "Alice helps students build confidence.",
  experience: "",
  education: "",
  teachingIntro: "Clear explanations and practical guidance.",
  teachingPoints: [{ title: "Clarity", body: "Lessons are structured around the student's goals." }],
  rate: 45,
  availability: "Weekday evenings after 4pm",
  intake: "accepting",
  tint: "#123456",
  resources: [],
};

type RenderedHome = {
  container: HTMLDivElement;
  root: Root;
  queryClient: QueryClient;
  dom: JSDOM;
  originalFetch: typeof globalThis.fetch;
};

function installDom(url: string) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url });

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    location: dom.window.location,
    history: dom.window.history,
    addEventListener: dom.window.addEventListener.bind(dom.window),
    removeEventListener: dom.window.removeEventListener.bind(dom.window),
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    Event: dom.window.Event,
    KeyboardEvent: dom.window.KeyboardEvent,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator,
  });

  return dom;
}

async function renderHome(
  fetchImplementation: typeof globalThis.fetch,
  url = "http://localhost/",
): Promise<RenderedHome> {
  const dom = installDom(url);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImplementation;
  const [{ createRoot }, { default: Home }] = await Promise.all([
    import("react-dom/client"),
    import("./Home"),
  ]);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <Home />
      </QueryClientProvider>,
    );
  });

  return { container, root, queryClient, dom, originalFetch };
}

async function cleanupHome({ container, root, queryClient, dom, originalFetch }: RenderedHome) {
  await act(async () => {
    root.unmount();
  });
  queryClient.clear();
  globalThis.fetch = originalFetch;
  container.remove();
  dom.window.close();
}

function respondWith(body: unknown, status = 200): typeof globalThis.fetch {
  return async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
  });
}

test("renders the belief and the enquiry steps while the tutors load", async () => {
  let resolveRequest!: (response: Response) => void;
  const request = new Promise<Response>((resolve) => {
    resolveRequest = resolve;
  });
  const rendered = await renderHome(async () => request);

  assert.equal(
    rendered.container.querySelector("[data-testid=hero-title]")?.textContent,
    "The right tutor changes how she feels about learning.",
  );
  assert.ok(rendered.container.querySelector("[data-testid=button-home-tutors]"));
  assert.ok(rendered.container.querySelector("[data-testid=button-home-enquire]"));
  assert.equal(rendered.container.querySelector("[data-testid=book-fan]"), null);

  await act(async () => {
    resolveRequest(new Response("[]", { headers: { "content-type": "application/json" } }));
    await Promise.resolve();
  });
  await cleanupHome(rendered);
});

test("shows a few tutors' books once the tutors load", async () => {
  const tutors = [1, 2, 3, 4].map((id) => ({ ...tutor, id, slug: `tutor-${id}` }));
  const rendered = await renderHome(respondWith(tutors));
  await settle();

  const books = rendered.container.querySelectorAll("[data-testid=book-fan] a");
  assert.deepEqual(
    [...books].map((book) => book.getAttribute("href")),
    ["/tutors/tutor-1", "/tutors/tutor-2", "/tutors/tutor-3"],
  );

  await cleanupHome(rendered);
});

test("opening the old /#tutors anchor goes to the Tutors page", async () => {
  const rendered = await renderHome(respondWith([tutor]), "http://localhost/#tutors");
  await settle();

  assert.equal(location.pathname, "/tutors");

  await cleanupHome(rendered);
});

test("keeps the homepage whole when the tutors fail to load", async () => {
  const rendered = await renderHome(respondWith({ message: "Tutor service unavailable" }, 503));
  await settle();

  assert.ok(rendered.container.querySelector("[data-testid=hero-title]"));
  assert.ok(rendered.container.querySelector("[data-testid=button-home-tutors]"));
  assert.ok(rendered.container.querySelector("[data-testid=button-home-enquire]"));
  assert.equal(rendered.container.querySelector("[data-testid=book-fan]"), null);

  await cleanupHome(rendered);
});
