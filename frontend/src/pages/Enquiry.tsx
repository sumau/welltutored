import * as React from "react";
import { useListTutors } from "@/client";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { EnquiryForm } from "@/components/EnquiryForm";
import { EnquiryStepList } from "@/components/EnquiryStepList";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { TutorCard } from "@/components/TutorCard";
import { EmptyPage } from "@/pages/not-found";
import { enquirySteps } from "@/lib/enquiry-steps";
import { PUBLIC_RESOURCES_ENABLED } from "@/lib/features";
import {
  publicTutorQueryOptions,
  publicTutorRequestOptions,
} from "@/lib/public-tutor-query";

const LEAVE_WARNING = "Leave this page? Your enquiry won't be sent.";

export default function Enquiry() {
  const {
    data: tutors,
    isLoading,
    error,
    refetch,
  } = useListTutors({
    query: publicTutorQueryOptions,
    request: publicTutorRequestOptions,
  });
  // The link names the chosen tutor: one from her profile starts with her
  // chosen, and choosing in the form rewrites it in place, so a reload or a
  // copied link keeps her and Back still leaves the page.
  const chosenSlug = new URLSearchParams(useSearch()).get("tutor") ?? "";
  const [location, navigate] = useLocation();
  const chooseTutor = React.useCallback((slug: string) => {
    if (slug === chosenSlug) return;
    navigate(slug ? `${location}?tutor=${encodeURIComponent(slug)}` : location, { replace: true });
  }, [chosenSlug, location, navigate]);
  const [formDirty, setFormDirty] = React.useState(false);

  if (isLoading) return <LoadingState message="Loading enquiry form..." />;
  if (error) {
    return (
      <ErrorState
        message="Could not load the available tutors."
        onRetry={refetch}
      />
    );
  }

  const contactableTutors = tutors?.filter((tutor) => tutor.intake !== "full") ?? [];
  const chosenTutor = contactableTutors.find((tutor) => tutor.slug === chosenSlug);

  // Not an error: every tutor is full for now.
  if (!contactableTutors.length) {
    return (
      <EmptyPage
        title="Every tutor is full for now"
        message="None of the tutors can take a new student at the moment. Their profiles show who they are and how they teach."
        testId="enquiry-all-full"
      />
    );
  }

  return (
    <main className="flex-1" data-testid="page-enquiry">
      {/* Like a profile's enquiry section: the heading and steps on the left,
          the form level with the heading on the right. */}
      <section className="px-6 md:px-[30px] pt-6 pb-[40px] md:pb-[64px]" aria-labelledby="enquiry-title">
        <div className="max-w-[1150px] mx-auto">
          <Link href="/" className="mb-[32px] md:mb-[36px] inline-flex items-center gap-2 rounded-full text-[14px] font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="enquiry-back-link">
            <ArrowLeft size={15} /> All tutors
          </Link>
        </div>
        <div className="max-w-[1150px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-[40px] lg:gap-[64px] items-start">
          <div className="flex flex-col gap-[24px] lg:gap-[16px] lg:self-stretch">
            <h1
              id="enquiry-title"
              className="font-serif text-[clamp(34px,4vw,48px)] leading-[1.08] m-0"
              data-testid="enquiry-title"
            >
              Make an enquiry
            </h1>
            <EnquiryStepList steps={enquirySteps("enquire", chosenTutor?.firstName)} className="lg:gap-[12px] lg:mb-[12px]" />
            {/* Her card once she's chosen, so it's clear who the enquiry is
                for, its foot level with the form's. It links back to her profile. */}
            {chosenTutor && (
              <TutorCard
                key={chosenTutor.slug}
                tutor={chosenTutor}
                href={`/tutors/${chosenTutor.slug}`}
                onClick={(event) => {
                  if (formDirty && !window.confirm(LEAVE_WARNING)) event.preventDefault();
                }}
                rest="1.5deg"
                className="hidden lg:flex lg:mt-auto max-w-[400px] [animation:deal-in_600ms_cubic-bezier(.16,1,.3,1)_backwards]"
                testId="enquiry-tutor-card"
              />
            )}
            {PUBLIC_RESOURCES_ENABLED && (
              <Link
                href="/resources"
                className="inline-flex items-center gap-2 text-[15px] font-semibold text-foreground underline-offset-4 hover:underline"
                data-testid="enquiry-resources-link"
              >
                Read our subject resources <ArrowRight size={14} />
              </Link>
            )}
          </div>

          <div className="paper-sheet p-6 md:p-8">
            <EnquiryForm
              tutors={contactableTutors}
              initialTutorSlug={chosenTutor ? chosenSlug : ""}
              onTutorChange={chooseTutor}
              onDirtyChange={setFormDirty}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
