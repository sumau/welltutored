import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import * as React from "react";
import { act } from "react";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
});
const scrolls: Array<[number, number]> = [];
dom.window.scrollTo = ((x: number, y: number) => {
  scrolls.push([x, y]);
}) as typeof dom.window.scrollTo;

Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  location: dom.window.location,
  history: dom.window.history,
  addEventListener: dom.window.addEventListener.bind(dom.window),
  removeEventListener: dom.window.removeEventListener.bind(dom.window),
  dispatchEvent: dom.window.dispatchEvent.bind(dom.window),
  Event: dom.window.Event,
  HTMLElement: dom.window.HTMLElement,
  Node: dom.window.Node,
  IS_REACT_ACT_ENVIRONMENT: true,
});

// wouter patches `history` when it is first imported, so import it after the
// DOM is installed.
const [{ createRoot }, { Router }, { navigate }, { ScrollToTop }] = await Promise.all([
  import("react-dom/client"),
  import("wouter"),
  import("wouter/use-browser-location"),
  import("./ScrollToTop"),
]);

const root = createRoot(document.body.appendChild(document.createElement("div")));
await act(async () => {
  root.render(
    <Router>
      <ScrollToTop />
    </Router>,
  );
});

function backButton() {
  return act(
    () =>
      new Promise<void>((resolve) => {
        window.addEventListener("popstate", () => resolve(), { once: true });
        history.back();
      }),
  );
}

test("the first page load keeps the browser's scroll", () => {
  assert.deepEqual(scrolls, []);
});

test("opening a new page scrolls to the top", async () => {
  await act(async () => navigate("/tutors/alice-smith"));
  assert.deepEqual(scrolls, [[0, 0]]);
});

test("changing only the query string or hash keeps the scroll", async () => {
  scrolls.length = 0;
  await act(async () => navigate("/tutors/alice-smith?from=home"));
  await act(async () => navigate("/tutors/alice-smith#resources"));
  assert.deepEqual(scrolls, []);
});

test("opening a new page at an anchor leaves the scroll to that page", async () => {
  scrolls.length = 0;
  await act(async () => navigate("/#tutors"));
  assert.deepEqual(scrolls, []);
});

test("a redirect to a new page scrolls to the top", async () => {
  scrolls.length = 0;
  await act(async () => navigate("/enquire", { replace: true }));
  assert.deepEqual(scrolls, [[0, 0]]);
});

test("the back button leaves the scroll to the browser", async () => {
  await act(async () => navigate("/workspace"));
  scrolls.length = 0;
  await backButton();
  assert.equal(location.pathname, "/enquire");
  assert.deepEqual(scrolls, []);
});
