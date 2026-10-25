import { lazy, Suspense, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Router as WouterRouter, useLocation } from "wouter";
import { LoadingState } from "@/components/LoadingState";
import { prefetchPublicTutors } from "@/lib/public-tutor-query";
import { AppProviders } from "./app/AppProviders";
import { basePath } from "./app/base-path";
import { isAuthenticatedPath, routePaths } from "./app/route-map";
import { ScrollToTop } from "./app/ScrollToTop";

const AuthenticatedApp = lazy(() => import("./app/AuthenticatedApp"));
const PublicApp = lazy(() => import("./app/PublicApp"));

function AuthenticatedRouteLoader() {
  const [location] = useLocation();
  const queryClient = useQueryClient();

  // Home's and the Tutors page's books would otherwise wait for the
  // PublicApp and page chunks to download before their request starts.
  useEffect(() => {
    if (location === routePaths.public.home || location === routePaths.public.tutors) {
      void prefetchPublicTutors(queryClient);
    }
  }, [location, queryClient]);

  const authenticated = isAuthenticatedPath(location);

  // The public Shell sets the public palette, but it loads with PublicApp, so
  // dress the public fallback in it too.
  const fallback = authenticated ? (
    <LoadingState message="Loading page..." />
  ) : (
    <div className="public-site min-h-[100dvh] flex flex-col font-sans bg-background text-foreground">
      <LoadingState message="Loading page..." />
    </div>
  );

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={fallback}>
        {authenticated ? <AuthenticatedApp /> : <PublicApp />}
      </Suspense>
    </>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AppProviders>
        <AuthenticatedRouteLoader />
      </AppProviders>
    </WouterRouter>
  );
}

export default App;