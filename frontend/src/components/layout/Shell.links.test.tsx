import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import * as React from "react";
import { act } from "react";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
});
const scrolls: ScrollToOptions[] = [];
dom.window.scrollTo = ((options: ScrollToOptions) => {
  scrolls.push(options);
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
  MouseEvent: dom.window.MouseEvent,
  HTMLElement: dom.window.HTMLElement,
  Node: dom.window.Node,
  IS_REACT_ACT_ENVIRONMENT: true,
});

// wouter patches `history` when it is first imported, so import it after the
// DOM is installed.
const [{ createRoot }, { Router }, { navigate }, { Shell }] = await Promise.all([
  import("react-dom/client"),
  import("wouter"),
  import("wouter/use-browser-location"),
  import("./Shell"),
]);

const root = createRoot(document.body.appendChild(document.createElement("div")));
await act(async () => {
  root.render(
    <Router>
      <Shell isSignedIn={false}>page</Shell>
    </Router>,
  );
});

function click(testId: string) {
  return act(async () => {
    document.querySelector<HTMLAnchorElement>(`[data-testid=${testId}]`)!.click();
  });
}

test("the footer logo on Home goes back to the top", async () => {
  await act(async () => navigate("/#tutors"));
  scrolls.length = 0;
  const historyLength = history.length;

  await click("footer-home");

  assert.deepEqual(scrolls, [{ top: 0, behavior: "smooth" }]);
  assert.equal(location.pathname + location.hash, "/");
  assert.equal(history.length, historyLength, "staying on Home adds no history entry");
});

test("the header logo on another page opens Home", async () => {
  await act(async () => navigate("/tutors/alice-smith"));
  scrolls.length = 0;

  await click("nav-home");

  assert.equal(location.pathname, "/");
  assert.deepEqual(scrolls, []);
});
