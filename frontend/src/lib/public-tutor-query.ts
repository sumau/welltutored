import {
  getGetTutorQueryKey,
  getListTutorsQueryKey,
  getListTutorsQueryOptions,
} from "@/client";
import type { QueryClient } from "@tanstack/react-query";

export const PUBLIC_TUTOR_STALE_TIME_MS = 30_000;
export const PUBLIC_TUTOR_GC_TIME_MS = 5 * 60_000;

/**
 * Public tutor data can be reused briefly between page visits. The request
 * cache policy still asks the browser to validate whenever React Query does
 * make a request, so explicit refetches do not accept an old browser response.
 */
export const publicTutorQueryOptions = {
  staleTime: PUBLIC_TUTOR_STALE_TIME_MS,
  gcTime: PUBLIC_TUTOR_GC_TIME_MS,
  refetchOnWindowFocus: false,
} as const;

export const publicTutorRequestOptions: RequestInit = {
  cache: "no-cache",
};

/**
 * Starts the public tutor list request with the same key and options the
 * pages use, so a page that renders while it is in flight shares it.
 */
export function prefetchPublicTutors(queryClient: QueryClient) {
  return queryClient.prefetchQuery(
    getListTutorsQueryOptions({
      query: publicTutorQueryOptions,
      request: publicTutorRequestOptions,
    }),
  );
}

export function invalidatePublicTutorQueries(
  queryClient: QueryClient,
  slugs?: string | readonly (string | null | undefined)[],
) {
  const normalizedSlugs = new Set(
    (typeof slugs === "string" ? [slugs] : slugs ?? []).filter(
      (slug): slug is string => Boolean(slug),
    ),
  );

  queryClient.invalidateQueries({ queryKey: getListTutorsQueryKey() });
  for (const slug of normalizedSlugs) {
    queryClient.invalidateQueries({ queryKey: getGetTutorQueryKey(slug) });
  }
}