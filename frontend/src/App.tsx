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

  // Home's tutor cards would otherwise wait for the PublicApp and Home chunks
  // to download before their request starts.
  useEffect(() => {
    if (location === routePaths.public.home) {
      void prefetchPublicTutors(queryClient);
    }
  }, [location, queryClient]);

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<LoadingState message="Loading page..." />}>
        {isAuthenticatedPath(location) ? <AuthenticatedApp /> : <PublicApp />}
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