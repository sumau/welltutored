import { useEffect, useReducer } from "react";
import { useClerk } from "@clerk/react";

// @clerk/react reads Clerk's status when ClerkProvider renders and subscribes
// to changes in an effect, without asking for the current status (6.17.2, and
// still in 6.18.1). When Clerk turns ready in between, more likely once
// clerk-js is cached, nothing re-renders, so <SignIn> or <SignUp> never mounts
// and the card stays empty (#131). Subscribe with notify, and re-render.
export function useRerenderWhenClerkReady() {
  const clerk = useClerk();
  const [, rerender] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    const onStatus = () => rerender();
    clerk.on("status", onStatus, { notify: true });
    return () => clerk.off("status", onStatus);
  }, [clerk]);
}
