// While false, visitors see nothing of Resources: no links, no tutor-profile
// section, and the /resources pages are Not Found. Tutors still write and
// publish them in the Workspace, which says they aren't public yet.
//
// Turning it on also means restoring the Launch Smoke's Resource checks in
// scripts/smoke/launch.ts and its definition in GLOSSARY.md, inverting the
// tests that assert the hidden state, and inverting the Sign-in Smoke's check
// that a published Resource's public page is Not Found
// (scripts/smoke/sign-in-browser.ts). See issue #61.
export const PUBLIC_RESOURCES_ENABLED: boolean = false;
