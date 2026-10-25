import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

// wouter changes pages without a reload, so the window would keep the
// previous page's scroll. Reset it after a link or redirect opens a new
// pathname, but leave back and forward to the browser: those fire `popstate`,
// not the `pushState`/`replaceState` events wouter dispatches. A link to an
// anchor on a new page (`/tutors/alice#resources`) is left to that page to
// scroll to.
export function ScrollToTop() {
  const [location] = useLocation();
  const pushedPath = useRef<string | null>(null);

  useEffect(() => {
    const onPush = () => {
      pushedPath.current = window.location.pathname;
    };
    window.addEventListener("pushState", onPush);
    window.addEventListener("replaceState", onPush);
    return () => {
      window.removeEventListener("pushState", onPush);
      window.removeEventListener("replaceState", onPush);
    };
  }, []);

  useEffect(() => {
    if (pushedPath.current === window.location.pathname && !window.location.hash) {
      window.scrollTo(0, 0);
    }
    pushedPath.current = null;
  }, [location]);

  return null;
}
