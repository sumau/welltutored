import * as React from "react";
import { CARD_REST } from "@/components/TutorCard";

interface LoadingStateProps {
  message?: string;
  variant?: "page" | "tutor-grid";
}

export function LoadingState({ message = "Loading...", variant = "page" }: LoadingStateProps) {
  if (variant === "tutor-grid") {
    return (
      <div
        className="space-y-5"
        data-testid="tutor-loading-state"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        {/* Invisible note cards laid out like Home's tutor grid: they hold the
            space so the real cards land where these were, without grey cards
            flashing up first. */}
        <div className="invisible flex flex-wrap justify-center gap-[28px]" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              className="note-card flex flex-col w-full sm:max-w-[440px] md:max-w-none md:w-[calc((100%-28px)/2)] min-h-[240px] px-[20px] pt-[20px] pb-[14px]"
              style={{ "--tint": "hsl(var(--muted))", "--rest": CARD_REST[index] } as React.CSSProperties}
              data-testid={`tutor-card-skeleton-${index + 1}`}
              key={index}
            />
          ))}
        </div>
        <p
          className="sr-only"
          data-testid="loading-message"
        >
          {message}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-[420px] flex flex-col justify-center py-20 px-6" data-testid="loading-state" role="status" aria-live="polite" aria-busy="true">
      <div className="max-w-[1150px] w-full mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-10 items-end mb-14">
          <div className="space-y-4">
            <div className="h-3 w-28 rounded-full skeleton-shimmer" />
            <div className="h-16 md:h-24 max-w-[580px] rounded skeleton-shimmer" />
            <div className="h-4 max-w-[500px] rounded skeleton-shimmer" />
            <div className="h-4 max-w-[420px] rounded skeleton-shimmer" />
          </div>
          <div className="hidden md:block h-28 border-l border-border pl-6">
            <div className="h-5 w-40 rounded skeleton-shimmer mb-3" />
            <div className="h-3 w-full rounded skeleton-shimmer mb-2" />
            <div className="h-3 w-4/5 rounded skeleton-shimmer" />
          </div>
        </div>
        <div className="h-px bg-border mb-8" />
        <p className="text-muted-foreground text-[14px] font-medium" data-testid="loading-message">{message}</p>
      </div>
    </div>
  );
}
