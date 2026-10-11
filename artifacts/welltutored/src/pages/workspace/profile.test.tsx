import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import * as React from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getGetWorkspaceSessionQueryKey,
  type WorkspaceSession,
} from "@workspace/api-client-react";

const session: WorkspaceSession = {
  id: 7,
  role: "tutor",
  email: "maya@example.com",
  displayName: "Maya Shah",
  availableTutorAccents: ["#8EA8CE", "#A997C7"],
  tutor: {
    id: 2,
    slug: "maya-shah",
    name: "Maya Shah",
    firstName: "Maya",
    lastName: "Shah",
    initials: "MS",
    subject: "Mathematics",
    support: "GCSE Mathematics",
    profileSummary: "A thoughtful mathematics tutor.",
    university: "University of Cambridge",
    qualification: "BA Mathematics",
    bio: "Maya helps students build confidence in mathematics.",
    teachingIntro: "Clear explanations and practical guidance for every student.",
    teachingPoints: [
      { title: "Clarity", body: "Lessons are structured around the student's goals." },
      { title: "Practice", body: "Focused questions build exam confidence." },
      { title: "Progress", body: "We review progress and adapt each lesson." },
    ],
    profileStatus: "published",
    rate: 45,
    availability: "limited",
    tint: "#A997C7",
    resources: [],
  },
};

type RenderedPage = {
  container: HTMLDivElement;
  root: Root;
  queryClient: QueryClient;
  dom: JSDOM;
};

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });

  // Radix components reach for many DOM constructors, so expose every one
  // jsdom provides that Node does not already define.
  for (const name of Object.getOwnPropertyNames(dom.window)) {
    if (/^[A-Z]/.test(name) && !(name in globalThis)) {
      Object.assign(globalThis, { [name]: (dom.window as unknown as Record<string, unknown>)[name] });
    }
  }
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    Event: dom.window.Event,
    CustomEvent: dom.window.CustomEvent,
    getComputedStyle: dom.window.getComputedStyle,
    requestAnimationFrame: dom.window.requestAnimationFrame,
    cancelAnimationFrame: dom.window.cancelAnimationFrame,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator,
  });

  return dom;
}

async function renderPage(): Promise<RenderedPage> {
  const dom = installDom();
  const [{ createRoot }, { default: WorkspaceProfile }] = await Promise.all([
    import("react-dom/client"),
    import("./profile"),
  ]);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false, staleTime: Infinity },
    },
  });
  queryClient.setQueryData(getGetWorkspaceSessionQueryKey(), session);

  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <WorkspaceProfile />
      </QueryClientProvider>,
    );
  });

  return { container, root, queryClient, dom };
}

async function cleanupPage({ container, root, queryClient, dom }: RenderedPage) {
  await act(async () => {
    root.unmount();
  });
  queryClient.clear();
  container.remove();
  dom.window.close();
}

function setFieldValue(element: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  valueSetter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

function buttonWithText(container: HTMLElement, text: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text,
  );
  assert(button, `Expected a "${text}" button`);
  return button;
}

test("a rejected profile save shows the server's reason on the page", async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async (input, init) => {
    requests.push(`${init?.method ?? "GET"} ${String(input)}`);
    return new Response(
      JSON.stringify({ error: "That profile accent is already in use by another tutor." }),
      { status: 409, headers: { "Content-Type": "application/json" } },
    );
  };
  const rendered = await renderPage();

  try {
    await act(async () => {
      setFieldValue(
        rendered.container.querySelector<HTMLInputElement>('input[name="firstName"]')!,
        "Mayah",
      );
    });

    await act(async () => {
      buttonWithText(rendered.container, "Save Draft").click();
    });

    assert.deepEqual(requests, ["PATCH /api/workspace/profile"]);
    const alert = Array.from(rendered.container.querySelectorAll('[role="alert"]')).find(
      (element) => element.textContent?.includes("already in use by another tutor"),
    );
    assert(alert, "Expected the save error to be shown on the page");
  } finally {
    globalThis.fetch = originalFetch;
    await cleanupPage(rendered);
  }
});

test("saving sends the tutor's stored accent and availability, not empty ones", async () => {
  const originalFetch = globalThis.fetch;
  const bodies: unknown[] = [];
  globalThis.fetch = async (_input, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ ...session.tutor, profileStatus: "draft" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  const rendered = await renderPage();

  try {
    await act(async () => {
      setFieldValue(
        rendered.container.querySelector<HTMLInputElement>('input[name="firstName"]')!,
        "Mayah",
      );
    });

    await act(async () => {
      buttonWithText(rendered.container, "Save Draft").click();
    });

    assert.equal(bodies.length, 1);
    assert.equal((bodies[0] as { tint: string }).tint, "#A997C7");
    assert.equal((bodies[0] as { availability: string }).availability, "limited");
  } finally {
    globalThis.fetch = originalFetch;
    await cleanupPage(rendered);
  }
});
