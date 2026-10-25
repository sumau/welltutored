import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { Shell } from "./Shell";
import { PublicResourcesNotice } from "@/components/workspace/PublicResourcesNotice";

test("the public shell links nowhere near resources while public resources are off", () => {
  const markup = renderToStaticMarkup(
    <Router ssrPath="/">
      <Shell isSignedIn={false}>page</Shell>
    </Router>,
  );

  assert.match(markup, /data-testid="nav-enquire"/);
  assert.doesNotMatch(markup, /href="\/resources"/);
  assert.doesNotMatch(markup, /data-testid="nav-resources"/);
  assert.doesNotMatch(markup, /data-testid="footer-resources"/);
});

test("the Workspace says published resources are not public yet", () => {
  const markup = renderToStaticMarkup(<PublicResourcesNotice />);

  assert.match(markup, /Published resources aren&#x27;t shown on the public site yet/);
});
