import assert from "node:assert/strict";
import test from "node:test";
import {
  authRouteDefinitions,
  isAuthenticatedPath,
  legacyWorkspaceResourcePath,
  publicRouteDefinitions,
  routeMetadataForPath,
  resolveRoute,
  routePaths,
  workspaceRouteDefinitions,
  workspaceSignedOutRedirect,
} from "./route-map";

test("keeps public pages on their expected route map", () => {
  assert.deepEqual(
    publicRouteDefinitions.map(({ path, page }) => [path, page]),
    [
      ["/", "Home"],
      ["/tutors/:slug", "TutorProfile"],
      ["/enquire", "Enquiry"],
    ],
  );

  assert.deepEqual(resolveRoute("/"), { kind: "page", page: "Home" });
  assert.deepEqual(resolveRoute("/tutors/alice"), {
    kind: "page",
    page: "TutorProfile",
  });
});

test("hides resource pages from visitors while public resources are off", () => {
  assert.deepEqual(resolveRoute("/resources"), { kind: "page", page: "NotFound" });
  assert.deepEqual(resolveRoute("/resources/essay-planning"), {
    kind: "page",
    page: "NotFound",
  });
  assert.deepEqual(resolveRoute("/workspace/resources/new", true), {
    kind: "page",
    page: "WorkspaceResourceEditor",
  });
});

test("keeps page metadata aligned with public and workspace routes", () => {
  const expectedMetadata = [
    {
      path: "/",
      title: "Well Tutored | Learn to love learning",
      description:
        "Personalised tutoring from women with deep subject expertise. Browse the tutors and send a named-tutor enquiry.",
    },
    {
      path: "/resources",
      title: "Well Tutored | Learn to love learning",
      description: "Personalised tutoring from women with deep subject expertise. Browse the tutors and send a named-tutor enquiry.",
    },
    {
      path: "/resources/essay-planning",
      title: "Well Tutored | Learn to love learning",
      description: "Personalised tutoring from women with deep subject expertise. Browse the tutors and send a named-tutor enquiry.",
    },
    {
      path: "/tutors/alice-smith",
      title: "Alice Smith | Well Tutored",
      description:
        "View this tutor’s subject expertise, qualifications, teaching approach and named-tutor enquiry form.",
    },
    {
      path: "/enquire",
      title: "Make an Enquiry | Well Tutored",
      description:
        "Tell Well Tutored which tutor you are interested in and what support would help.",
    },
    {
      path: "/workspace/resources/42",
      title: "Workspace | Well Tutored",
      description: "Shared workspace for tutor profiles and resources.",
    },
  ];

  for (const { path, ...metadata } of expectedMetadata) {
    assert.deepEqual(routeMetadataForPath(path), metadata);
  }
});

test("keeps Clerk callback wildcard routes available", () => {
  assert.deepEqual(
    authRouteDefinitions.map(({ path, page }) => [path, page]),
    [
      ["/sign-in/*?", "SignInPage"],
      ["/sign-up/*?", "SignUpPage"],
    ],
  );
  assert.deepEqual(resolveRoute("/sign-in/sso-callback"), {
    kind: "page",
    page: "SignInPage",
  });
  assert.deepEqual(resolveRoute("/sign-up/verify"), {
    kind: "page",
    page: "SignUpPage",
  });
});

test("redirects signed-out users away from every workspace path", () => {
  assert.equal(workspaceSignedOutRedirect(), "/sign-in");
  assert.deepEqual(resolveRoute("/workspace", false), {
    kind: "redirect",
    to: "/sign-in",
  });
  assert.deepEqual(resolveRoute("/workspace/resources/new", false), {
    kind: "redirect",
    to: "/sign-in",
  });
});

test("keeps Clerk behind authentication and workspace paths", () => {
  assert.equal(isAuthenticatedPath("/"), false);
  assert.equal(isAuthenticatedPath("/resources/essay-planning"), false);
  assert.equal(isAuthenticatedPath("/sign-in"), true);
  assert.equal(isAuthenticatedPath("/sign-in/sso-callback?redirect_url=%2Fworkspace"), true);
  assert.equal(isAuthenticatedPath("/workspace/profile"), true);
  assert.equal(isAuthenticatedPath("/workspace?tab=resources"), true);
});

test("resolves signed-in workspace pages and legacy resource redirects", () => {
  assert.equal(workspaceRouteDefinitions[0].path, routePaths.workspace.root);
  assert.deepEqual(resolveRoute("/workspace", true), {
    kind: "page",
    page: "WorkspaceDashboard",
  });
  assert.deepEqual(resolveRoute("/workspace/resources/42", true), {
    kind: "page",
    page: "WorkspaceResourceEditor",
  });
  assert.deepEqual(resolveRoute("/workspace/enquiries", true), {
    kind: "page",
    page: "WorkspaceEnquiries",
  });
  assert.deepEqual(resolveRoute("/workspace/articles/42", true), {
    kind: "page",
    page: "LegacyWorkspaceResourceRedirect",
  });
  assert.equal(legacyWorkspaceResourcePath(), "/workspace/resources/new");
  assert.equal(
    legacyWorkspaceResourcePath("42"),
    "/workspace/resources/42",
  );
});