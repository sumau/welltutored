// While false, visitors see nothing of Resources: no links, no tutor-profile
// section, and the /resources pages are Not Found. Tutors still write and
// publish them in the Workspace, which says they aren't public yet.
//
// Turning it on also means restoring the Launch Smoke's Resource checks in
// scripts/src/smoke-check.ts and its definition in CONTEXT.md, and inverting
// the tests that assert the hidden state. See issue #61.
export const PUBLIC_RESOURCES_ENABLED: boolean = false;
