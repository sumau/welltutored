import * as React from "react";
import { PUBLIC_RESOURCES_ENABLED } from "@/lib/features";

export function PublicResourcesNotice() {
  if (PUBLIC_RESOURCES_ENABLED) return null;

  return (
    <p className="text-sm text-muted-foreground mt-2" data-testid="public-resources-notice">
      Published resources aren't shown on the public site yet.
    </p>
  );
}
