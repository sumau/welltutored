import * as React from "react";
import type { Tutor } from "@/client";
import { CARD_REST, TutorCard } from "@/components/TutorCard";

// One line each of name, subject and university; the summary's four lines
// are held by the card even when empty.
const placeholderTutor = {
  name: "Tutor",
  subject: "Subject",
  university: "University",
  qualification: "Qualification",
  profileSummary: "",
  intake: "accepting",
  tint: "hsl(var(--muted))",
} as Tutor;

interface LoadingStateProps {
  message?: string;
  variant?: "page" | "tutor-grid";
}

export function LoadingState({ message = "Loading...", variant = "page" }: LoadingStateProps) {
  if (variant === "tutor-grid") {
    return (
      <div className="lg:contents" data-testid="tutor-loading-state">
        {/* Two invisible note cards, a short tutor's, laid out like Home's
            tutor grid: from lg they fill the two boxes beside the headline,
            so the real cards land where these were, without grey cards
            flashing up first. */}
        <div className="invisible flex flex-wrap justify-center gap-[28px] lg:contents" aria-hidden="true">
          {Array.from({ length: 2 }, (_, index) => (
            <div className="flex w-full sm:max-w-[440px] md:max-w-none md:w-[calc((100%-28px)/2)] lg:w-auto" key={index}>
              <TutorCard
                tutor={placeholderTutor}
                rest={CARD_REST[index]}
                className="w-full"
                testId={`tutor-card-skeleton-${index + 1}`}
              />
            </div>
          ))}
        </div>
        {/* The status is on the message, not the wrapper, which has no box
            from lg. */}
        <p
          className="sr-only"
          data-testid="loading-message"
          role="status"
          aria-live="polite"
          aria-busy="true"
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
