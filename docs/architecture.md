# Well Tutored architecture

For whoever needs to know how the code fits together: routes, authentication,
API boundaries and publishing rules. Why the less obvious decisions were made is
in [adr/](adr/).

One container serves both the React frontend and the Express API from the same
origin (scheme, host and port), so the browser treats them as one site. Only
the API talks to the PostgreSQL database, through Drizzle, and a client
generated from the OpenAPI spec keeps the two sides in step. The application
is organized around two user-facing surfaces: the public website and the
private [Workspace](../GLOSSARY.md#the-private-area).

```mermaid
flowchart LR
  visitor(["👤 Visitor"]) --> public
  tutor(["👤 Tutor or owner"]) --> workspace
  classDef person fill:#fde68a,stroke:#b45309,stroke-width:2px,color:#1f2937
  class visitor,tutor person

  subgraph browser["Browser: React app"]
    public["Public website<br/>(never loads Clerk)"]
    workspace["Private Workspace<br/>(lazy-loaded with Clerk)"]
  end

  workspace -- "sign in" --> clerk["Clerk<br/>(hosted)"]

  subgraph container["Container: one origin"]
    static["Frontend build<br/>(static files)"]
    api["Express API under /api<br/>clerkMiddleware, Zod validation"]
  end

  browser -- "page loads" --> static
  public -- "public reads, enquiries" --> api
  workspace -- "session cookie" --> api
  api -- "Drizzle" --> db[("PostgreSQL<br/>(Neon in production)")]

  spec["openapi.yaml"] -. "codegen" .-> hooks["React Query hooks"]
  spec -. "codegen" .-> zod["Zod schemas"]
  hooks -. "used by" .-> browser
  zod -. "used by" .-> api

  classDef external fill:#e5e7eb,stroke:#6b7280,stroke-width:2px,color:#1f2937
  classDef buildtime fill:#f9fafb,stroke:#9ca3af,stroke-dasharray:5 5,color:#4b5563
  class clerk,db external
  class spec,hooks,zod buildtime
```

Amber shapes are people, grey boxes are hosted services outside the container,
and dashed boxes are build-time code rather than running parts. Solid arrows
are runtime requests. Dotted arrows are code generated from
`lib/api-spec/openapi.yaml`, which keeps the client and server agreeing on one
contract. Serving everything from one origin is
[ADR-0001](adr/0001-single-origin-deployment.md).

Every route is defined in `frontend/src/app/route-map.ts`.

## Public website

The React app serves the public experience: the
[Directory](../GLOSSARY.md#the-public-site) on `/`, published tutor profiles,
the resource library and the enquiry form.

The resource routes (`/resources` and `/resources/:slug`), and every link to
them, exist only while
`PUBLIC_RESOURCES_ENABLED` in `src/lib/features.ts` is on. It is off for now,
so visitors see no resources; tutors still write and publish them in the
Workspace.

Public pages use the shared `Shell` for navigation, footer, policy dialogs, and
the public visual language. Public API handlers live in
`backend/src/routes/content.ts` and
`backend/src/routes/enquiries.ts`.

## Authentication

Clerk provides the sign-in and sign-up pages:

- `/sign-in` — sign-in flow (including Clerk's nested flow paths)
- `/sign-up` — sign-up flow (including Clerk's nested flow paths)

Public visitors never load Clerk. `App.tsx` lazy-loads `PublicApp` or
`AuthenticatedApp` by path, and only the authenticated side brings in Clerk,
its themes, and the workspace routes. Keep public route modules, shared
providers, and route metadata free of Clerk imports, or Clerk lands in the
public bundle.

Browser API requests use Clerk's same-origin session cookies; bearer-token
wiring is reserved for mobile clients.

## Private Workspace

Workspace routes, all under `/workspace`, are protected by Clerk and the
workspace account boundary. A Tutor edits their own profile and resources and
sees their enquiries; the [Owner](../GLOSSARY.md#the-private-area) also manages
every tutor profile and approves accounts.

`/workspace/articles/new` and `/workspace/articles/:id` remain compatibility
aliases and redirect to the canonical resource URLs. Workspace accounts are
stored in the `workspace_accounts` table.

## Forms

A form that must submit once guards itself with a synchronous ref as well as
the mutation's pending state, as `submissionInFlight` does in `EnquiryForm`.
Keyboard activation can fire a second submit before React renders the first
one as pending, so the pending flag alone lets a duplicate through.

## API boundaries

Workspace code in `backend/src` is split by responsibility, one
directory each:

- `auth` — authenticated account lookup and role checks
- `services` — Clerk-to-workspace account provisioning and tutor assignment
- `domain` — publishability rules for resources and tutor profiles
- `presenters` — response mapping
- `routes` — request validation and mutations, one subrouter per area, which
  `routes/workspace.ts` mounts

The intended direction for future workspace changes is to keep route handlers
thin: authenticate, validate the request, call a domain/service function, and
present the response. `lib/api-spec/openapi.yaml` generates both the React
Query hooks and the Zod schemas, which keeps client and server contracts
aligned. Generated API clients and schemas remain generated artifacts and
should not be edited manually.

## Publishing rules

- A published tutor profile can have a private draft.
- Public routes read published tutor and resource state.
- Publishing validates the complete object before changing its status.
- Discarding a tutor profile draft restores the published profile.
- Archived tutors must be restored before editing.
- A tutor account can edit its own resources; an owner can manage all workspace
  records.

### Tutor profiles versus resources

[Tutor](../GLOSSARY.md#the-public-site) profiles keep the published profile in
`tutors` and store workspace edits in `tutor_profile_drafts`. This means the
public site continues to show the last published profile while a new version is
being edited, and the draft can be published or discarded as a whole.

[Resources](../GLOSSARY.md#the-public-site) use a single `resources` row with a
`draft` or `published` status. New or explicitly draft resources do not appear
publicly until published. Editing an already-published resource while keeping
its status as `published` updates the public resource in place; changing it to
`draft` removes it from public results while it is being revised. Resources do
not currently keep a private draft alongside a live published version.

## Styling payload

The Well Tutored Vite build enables Tailwind's production Lightning CSS
optimization. `frontend/scripts/verify-css-build.mjs` holds a size
budget for the primary stylesheet, set about 7% above its size in October 2026
so that growth is a decision rather than drift. `pnpm run verify:ci` checks it
after the build. To check it alone, run
`pnpm --filter @workspace/frontend run build` followed by
`pnpm --filter @workspace/frontend run verify:css`; the script prints the
current size.

The remaining global CSS is intentional: Tailwind preflight, theme variables,
utilities used by both public and authenticated routes, motion states, and
registered custom properties are shared so route transitions do not flash
unstyled content. The authenticated route's separate CSS chunk is currently
negligible; further savings would require splitting shared styles and
reintroducing them during navigation.