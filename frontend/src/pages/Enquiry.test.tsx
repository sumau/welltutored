import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import * as React from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Tutor } from "@/client";

const alice: Tutor = {
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
const bea: Tutor = { ...alice, id: 2, slug: "bea-jones", name: "Bea Jones", firstName: "Bea", lastName: "Jones" };

type RenderedEnquiry = {
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
    dispatchEvent: dom.window.dispatchEvent.bind(dom.window),
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    HTMLSelectElement: dom.window.HTMLSelectElement,
    HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
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

async function renderEnquiry(url: string): Promise<RenderedEnquiry> {
  const dom = installDom(url);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify([alice, bea]), {
      headers: { "content-type": "application/json" },
    });
  const [{ createRoot }, { default: Enquiry }] = await Promise.all([
    import("react-dom/client"),
    import("./Enquiry"),
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
        <Enquiry />
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  return { container, root, queryClient, dom, originalFetch };
}

async function cleanupEnquiry({ container, root, queryClient, dom, originalFetch }: RenderedEnquiry) {
  await act(async () => {
    root.unmount();
  });
  queryClient.clear();
  globalThis.fetch = originalFetch;
  container.remove();
  dom.window.close();
}

async function chooseTutor(container: HTMLDivElement, slug: string) {
  const select = container.querySelector<HTMLSelectElement>("#enquiry-tutor")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(select, slug);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

test("choosing a tutor rewrites the link in place and names her in the steps", async () => {
  const rendered = await renderEnquiry("http://localhost/enquire?tutor=alice-smith");
  try {
    const historyLength = history.length;

    assert.equal(rendered.container.querySelector<HTMLSelectElement>("#enquiry-tutor")?.value, "alice-smith");
    assert.match(rendered.container.textContent ?? "", /You've chosen Alice\./);

    await chooseTutor(rendered.container, "bea-jones");
    assert.equal(location.pathname + location.search, "/enquire?tutor=bea-jones");
    assert.match(rendered.container.textContent ?? "", /You've chosen Bea\./);
    assert.match(rendered.container.textContent ?? "", /Bea replies/);

    await chooseTutor(rendered.container, "");
    assert.equal(location.pathname + location.search, "/enquire");
    assert.match(rendered.container.textContent ?? "", /Pick one in the form\./);

    // Replaced, not pushed: Back still leaves the page.
    assert.equal(history.length, historyLength);
  } finally {
    await cleanupEnquiry(rendered);
  }
});

test("a link naming no tutor who can be chosen is cleared", async () => {
  const rendered = await renderEnquiry("http://localhost/enquire?tutor=nobody");
  try {
    assert.equal(location.pathname + location.search, "/enquire");
    assert.equal(rendered.container.querySelector<HTMLSelectElement>("#enquiry-tutor")?.value, "");
  } finally {
    await cleanupEnquiry(rendered);
  }
});
