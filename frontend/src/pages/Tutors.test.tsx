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

type RenderedTutors = {
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

async function renderTutors(
  fetchImplementation: typeof globalThis.fetch,
  url = "http://localhost/",
): Promise<RenderedTutors> {
  const dom = installDom(url);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImplementation;
  const [{ createRoot }, { default: Tutors }] = await Promise.all([
    import("react-dom/client"),
    import("./Tutors"),
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
        <Tutors />
      </QueryClientProvider>,
    );
  });

  return { container, root, queryClient, dom, originalFetch };
}

async function cleanupTutors({ container, root, queryClient, dom, originalFetch }: RenderedTutors) {
  await act(async () => {
    root.unmount();
  });
  queryClient.clear();
  globalThis.fetch = originalFetch;
  container.remove();
  dom.window.close();
}

test("shows a loading state for the tutors straight away", async () => {
  let resolveRequest!: (response: Response) => void;
  const request = new Promise<Response>((resolve) => {
    resolveRequest = resolve;
  });
  const rendered = await renderTutors(async () => request);

  assert.ok(rendered.container.querySelector("[data-testid=tutor-loading-state]"));
  assert.ok(rendered.container.querySelector("[data-testid=button-tutors-enquire]"));

  await act(async () => {
    resolveRequest(new Response("[]", { headers: { "content-type": "application/json" } }));
    await Promise.resolve();
  });
  await cleanupTutors(rendered);
});

test("renders a book for each tutor", async () => {
  const rendered = await renderTutors(async () =>
    new Response(JSON.stringify([tutor]), {
      headers: { "content-type": "application/json" },
    }),
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
  });

  const book = rendered.container.querySelector("[data-testid=tutor-card-alice-smith]");
  assert.equal(book?.getAttribute("href"), "/tutors/alice-smith");
  assert.match(book?.textContent ?? "", /Alice Smith.*English.*University of Oxford, BA English.*Taking students/);
  assert.equal(rendered.container.querySelector("[data-testid=tutor-loading-state]"), null);

  await cleanupTutors(rendered);
});

test("offers a retry when the tutors fail to load", async () => {
  const rendered = await renderTutors(async () =>
    new Response(JSON.stringify({ message: "Tutor service unavailable" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    }),
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
  });

  assert.ok(rendered.container.querySelector("[data-testid=error-state]"));
  assert.equal(rendered.container.querySelector("[data-testid=tutor-grid]"), null);
  assert.equal(rendered.container.querySelector("[data-testid=button-retry]")?.textContent?.trim(), "Try again");

  await cleanupTutors(rendered);
});
