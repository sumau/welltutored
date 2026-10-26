import * as React from "react";
import { useListTutors } from "@/client";
import { Link } from "wouter";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { CARD_REST, TutorCard } from "@/components/TutorCard";
import { scrollToTutors } from "@/lib/scroll-to-tutors";
import {
  publicTutorQueryOptions,
  publicTutorRequestOptions,
} from "@/lib/public-tutor-query";

// The hero note's points, written to the student: each idea in bold, then
// what it looks like in a lesson.
const LESSON_POINTS = [
  ["Confidence.", "Ask anything, as many times as you need, until it makes sense."],
  ["Curiosity.", "See how what you're learning connects to the world outside the classroom."],
  ["Growth.", "Go at your pace, and notice how far you've come."],
];

export default function Home() {
  const { data: tutors, isLoading: tutorsLoading, error: tutorsError, refetch: refetchTutors } = useListTutors({
    query: publicTutorQueryOptions,
    request: publicTutorRequestOptions,
  });

  // The nav's "Meet the tutors" opens `/#tutors`. Scroll once the tutors have
  // loaded, so the grid has its full height.
  React.useEffect(() => {
    if (tutorsLoading || window.location.hash !== "#tutors") return;
    scrollToTutors("auto");
  }, [tutorsLoading]);

  return (
    <main className="flex-1" data-testid="page-home">
      {/* Hero: the headline and who it's for, beside one note on what lessons are like */}
      <section aria-labelledby="home-hero-title" className="max-w-[1210px] mx-auto px-6 md:px-[30px] pt-[32px] md:pt-[64px] pb-[48px] md:pb-[80px] grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-[40px] lg:gap-[56px] lg:items-center" id="top">
        <div>
          <h1 id="home-hero-title" className="text-[clamp(36px,4.4vw,60px)] leading-[0.98] tracking-[-0.04em] font-bold m-0 [text-wrap:balance]" data-testid="hero-title">
            Learn to love learning.
          </h1>
          <p className="text-[clamp(20px,1.9vw,26px)] leading-[1.35] font-medium m-0 mt-[24px] max-w-[22em] [text-wrap:balance]" data-testid="hero-copy">
            Personalised tutoring for young women, from women who've been where you are.
          </p>
        </div>
        <div
          className="note-card hero-note border border-border px-[24px] md:px-[28px] pt-[20px] md:pt-[24px] pb-[20px] md:pb-[24px] lg:justify-self-center"
          style={{ "--tint": "hsl(var(--card))" } as React.CSSProperties}
          data-testid="hero-note"
        >
          <h2 className="note-card-head text-[clamp(22px,2vw,26px)] leading-[1.1] tracking-[-0.03em] font-bold m-0 pb-[10px]">What lessons are like</h2>
          <ul className="note-card-body list-none m-0 p-0 text-[17px] md:text-[18px] [--rule:28px]">
            {LESSON_POINTS.map(([idea, text]) => (
              <li key={idea}>
                <b>{idea}</b> {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Tutors, one card each, under a heading the nav's link scrolls to */}
      <section className="px-6 md:px-[30px] pb-[56px] md:pb-[80px] focus:outline-none" id="tutors" tabIndex={-1} aria-labelledby="home-tutors-title">
        <div className="max-w-[1150px] mx-auto">
          <div className="mb-[28px]">
            <h2 id="home-tutors-title" className="text-[clamp(32px,4vw,48px)] leading-[1.05] tracking-[-0.03em] font-semibold m-0 mb-[8px]">
              Meet the tutors
            </h2>
            <p className="text-muted-foreground text-[18px] leading-[1.5] m-0">
              A select community of women who know their subjects and how to teach them.
            </p>
          </div>
          {tutorsLoading ? (
            <LoadingState variant="tutor-grid" message="Loading tutors..." />
          ) : tutorsError ? (
            <ErrorState
              message="We couldn't load the tutor profiles. Please try again."
              onRetry={refetchTutors}
            />
          ) : (
            <ul className="list-none m-0 p-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-[28px] gap-y-[36px] md:max-w-[908px] xl:max-w-none" data-testid="tutor-grid">
              {(tutors || []).map((tutor, index) => (
                <li key={tutor.id} className="flex">
                  <TutorCard
                    tutor={tutor}
                    rest={CARD_REST[index % CARD_REST.length]}
                    href={`/tutors/${tutor.slug}`}
                    className="w-full sm:aspect-square sm:max-w-[440px] md:max-w-none"
                    testId={`tutor-card-${tutor.slug}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* How an enquiry works */}
      <section className="bg-card border-t border-border px-6 md:px-[30px] py-[56px] md:py-[80px]" aria-labelledby="home-enquiry-title">
        <div className="max-w-[1150px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-[24px] mb-[40px]">
            <h2 id="home-enquiry-title" className="text-[clamp(32px,4vw,48px)] leading-[1.05] tracking-[-0.03em] font-semibold m-0">
              How an enquiry works
            </h2>
            <Link
              href="/enquire"
              className="rounded-full bg-primary text-primary-foreground text-[17px] font-semibold px-6 py-3.5 hover:bg-primary-border transition-colors inline-flex w-fit"
              data-testid="button-home-enquire"
            >
              Make an enquiry
            </Link>
          </div>
          <ol className="list-none p-0 m-0 grid grid-cols-1 md:grid-cols-3 gap-[28px] md:gap-[40px]">
            {[
              ["Choose a tutor", "Pick from the list above. Her profile shows how she teaches."],
              ["Tell us about the student", "The subject, the school level, and what would help."],
              ["We reply", "Well Tutored reviews the enquiry and gets back to you."],
            ].map(([title, text], index) => (
              <li key={title} className="border-t-2 border-foreground pt-[18px]">
                <span className="block text-[15px] text-muted-foreground mb-[6px]">Step {index + 1}</span>
                <b className="block text-[20px] font-semibold mb-[6px]">{title}</b>
                <span className="text-muted-foreground text-[16px] leading-[1.55]">{text}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
