import type { Response } from "express";

export const PUBLIC_TUTOR_CACHE_CONTROL =
  "public, max-age=30, stale-while-revalidate=60";

export function setPublicTutorCacheHeaders(res: Response) {
  res.set("Cache-Control", PUBLIC_TUTOR_CACHE_CONTROL);
}
