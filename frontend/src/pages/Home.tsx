import * as React from "react";
import { useListTutors } from "@/client";
import { Link } from "wouter";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { BookFan, TutorBook } from "@/components/TutorBook";
import {
  publicTutorQueryOptions,
  publicTutorRequestOptions,
} from "@/lib/public-tutor-query";

export default function Home() {
  const { data: tutors, isLoading: tutorsLoading, error: tutorsError, refetch: refetchTutors } = useListTutors({
    query: publicTutorQueryOptions,
    request: publicTutorRequestOptions,
  });

  // Older links to the tutors open `/#tutors`. Jump there once the tutors have
  // loaded, so the grid has its full height, and move focus with it.
  React.useEffect(() => {
    if (tutorsLoading || window.location.hash !== "#tutors") return;
    const target = document.getElementById("tutors");
    target?.scrollIntoView({ behavior: "auto" });
    target?.focus({ preventScroll: true });
  }, [tutorsLoading]);

  return (
    <main className="flex-1" data-testid="page-home">
      {/* Hero: the belief, beside a stack of the tutors' books */}
      <section aria-labelledby="home-hero-title" className="px-[var(--gutter)]" id="top">
        <div className="max-w-[1150px] mx-auto pt-[36px] md:pt-[72px] pb-[36px] md:pb-[72px] grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-[36px] lg:gap-[48px] items-start">
          <div>
            <h1 id="home-hero-title" className="font-serif font-extrabold [font-stretch:112%] text-[40px] md:text-[60px] xl:text-[68px] leading-[1.02] tracking-[-0.04em] m-0" data-testid="hero-title">
              The right tutor can change how she feels about learning.
            </h1>
            <p className="text-[20px] md:text-[22px] leading-[1.55] m-0 mt-[24px] max-w-[26em]" data-testid="hero-copy">
              Well Tutored introduces young women to women tutors with deep expertise in their subjects. Lessons are online, so she can be anywhere in the UK.
            </p>
          </div>
          {/* On phones the tutors follow straight after, so the stack is left out */}
          {tutors && <BookFan tutors={tutors} className="hidden sm:block w-full max-w-[520px] lg:max-w-none" />}
        </div>
      </section>

      {/* Tutors, one book each. Older links land here at `/#tutors`. */}
      <section className="px-[var(--gutter)] focus:outline-none" id="tutors" tabIndex={-1} aria-labelledby="home-tutors-title">
        <div className="max-w-[1150px] mx-auto pt-[56px] md:pt-[80px] pb-[56px] md:pb-[72px]">
          <h2 id="home-tutors-title" className="font-serif text-[30px] md:text-[48px] leading-[1.1] m-0 mb-[14px]">
            Women who teach what they know
          </h2>
          <p className="text-[18px] leading-[1.6] m-0 mb-[40px] max-w-[40em]">
            Every Well Tutored tutor is a woman with deep expertise in her subject, a role model as well as a teacher. We're a small, hand-picked group, and a person reads every enquiry and replies.
          </p>
          {tutorsLoading ? (
            <LoadingState variant="tutor-grid" message="Loading tutors..." />
          ) : tutorsError ? (
            <ErrorState
              message="We couldn't load the tutor profiles. Please try again."
              onRetry={refetchTutors}
            />
          ) : (
            <ul className="list-none m-0 p-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-[28px] gap-y-[36px]" data-testid="tutor-grid">
              {(tutors || []).map((tutor, index) => (
                <li key={tutor.id} className="flex flex-col">
                  <TutorBook tutor={tutor} index={index} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* What we look for: the belief as what we choose tutors for */}
      <section className="px-[var(--gutter)]" aria-labelledby="home-belief-title">
        <div className="max-w-[1150px] mx-auto pt-[24px] md:pt-[40px] pb-[64px] md:pb-[96px]">
          <h2 id="home-belief-title" className="font-serif text-[30px] md:text-[48px] leading-[1.1] m-0 mb-[14px]">
            What we look for in a tutor
          </h2>
          <p className="text-[20px] md:text-[22px] leading-[1.55] m-0 max-w-[34em]" data-testid="home-belief">
            We believe the right tutor can change how a young woman feels about learning. So we look for tutors who build her confidence, make her curious about the world, and show her what she's capable of.
          </p>
        </div>
      </section>

      {/* How an enquiry works: three numbered steps */}
      <section className="px-[var(--gutter)]" aria-labelledby="home-enquiry-title">
        <div className="max-w-[1150px] mx-auto pt-[36px] pb-[108px]">
          <h2 id="home-enquiry-title" className="font-serif text-[30px] md:text-[48px] leading-[1.1] m-0 mb-[32px]">
            How an enquiry works
          </h2>
          <ol className="list-none p-0 m-0 grid gap-[36px] max-w-[40em]">
            {[
              ["Choose a tutor", "Pick from the list above. Her profile shows how she teaches."],
              ["Tell us about the student", "The subject, the school level, and what would help."],
              ["We reply", "Well Tutored reviews the enquiry and gets back to you."],
            ].map(([title, text], index) => (
              <li key={title} className="flex gap-[14px]">
                <span className="step-number text-[22px] leading-[1.6]" aria-hidden="true">{index + 1}</span>
                <div>
                  <b className="block font-serif text-[22px] leading-[1.6]">{title}</b>
                  <span className="block text-muted-foreground text-[18px] leading-[1.6]">{text}</span>
                </div>
              </li>
            ))}
          </ol>
          <Link
            href="/enquire"
            className="ink-button h-[48px] text-[18px] px-[24px] mt-[48px]"
            data-testid="button-home-enquire"
          >
            Make an enquiry
          </Link>
        </div>
      </section>
    </main>
  );
}
