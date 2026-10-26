// The Safeguarding and Privacy dialogs live in the Shell. A page opens one
// with `openPolicy`, which the Shell hears as a window event.
export type Policy = "safeguarding" | "privacy";

const OPEN_POLICY_EVENT = "welltutored:open-policy";

export function openPolicy(policy: Policy) {
  window.dispatchEvent(new window.CustomEvent<Policy>(OPEN_POLICY_EVENT, { detail: policy }));
}

export function onOpenPolicy(listener: (policy: Policy) => void) {
  const handler = (event: Event) => listener((event as CustomEvent<Policy>).detail);
  window.addEventListener(OPEN_POLICY_EVENT, handler);
  return () => window.removeEventListener(OPEN_POLICY_EVENT, handler);
}
