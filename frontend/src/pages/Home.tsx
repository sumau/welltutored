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

// Well Tutored's own notes, shown after the tutors.
const NOTES = [
  { title: "Small and hand\u2011picked", text: "A few women tutors, each chosen for deep expertise in her subject." },
  { title: "How we teach", text: "Lessons that build her confidence and make her curious about the world." },
  { title: "Helping young women grow", text: "Role models as well as teachers, showing her what she's capable of." },
];

export default function Home() {
  const { data: tutors, isLoading: tutorsLoading, error: tutorsError, refetch: refetchTutors } = useListTutors({
    query: publicTutorQueryOptions,
    request: publicTutorRequestOptions,
  });

  // "Back to the tutors" on a profile or enquiry opens `/#tutors`. Scroll once
  // the tutors have loaded, so the page has its full height.
  React.useEffect(() => {
    if (tutorsLoading || window.location.hash !== "#tutors") return;
    scrollToTutors("auto");
  }, [tutorsLoading]);

  return (
    <main className="flex-1" data-testid="page-home">
      {/* Hero: the tutors themselves, under one short line on who they are.
          "Back to the tutors" links scroll here. */}
      <section className="px-6 md:px-[30px] pt-[28px] md:pt-[48px] pb-[56px] md:pb-[80px] focus:outline-none" id="tutors" tabIndex={-1} aria-labelledby="home-hero-title">
        <div className="max-w-[1150px] mx-auto">
          <div className="mb-[32px] md:mb-[44px]">
            <h1 id="home-hero-title" className="text-[clamp(38px,5vw,68px)] leading-[0.95] tracking-[-0.04em] font-bold m-0 [text-wrap:balance]" data-testid="hero-title">
              Female tutors for young women.
            </h1>
            <p className="text-[clamp(19px,1.7vw,24px)] leading-[1.35] font-medium m-0 mt-[14px] [text-wrap:balance]" data-testid="hero-copy">
              Helping them grow, flourish and thrive.
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
            <ul className="list-none m-0 p-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-[28px] gap-y-[36px] md:max-w-[908px] xl:max-w-none" aria-label="The tutors" data-testid="tutor-grid">
              {(tutors || []).map((tutor, index) => (
                <li key={tutor.id} className="deal-in flex" style={{ "--delay": `${index * 90}ms` } as React.CSSProperties}>
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

      {/* About our agency: three notes on plain white paper, set straight.
          The colour and the tilt belong to the tutors, so the notes take
          neither. */}
      <section className="px-6 md:px-[30px] pb-[56px] md:pb-[80px]" aria-labelledby="home-about-title">
        <div className="max-w-[1150px] mx-auto">
          <h2 id="home-about-title" className="text-[clamp(32px,4vw,48px)] leading-[1.05] tracking-[-0.03em] font-semibold m-0 mb-[28px] md:mb-[36px]">
            About our agency
          </h2>
          <ul className="note-row list-none m-0 p-0 md:max-w-[908px] xl:max-w-none" data-testid="notes">
            {NOTES.map((note) => (
              <li
                key={note.title}
                className="note-card flex flex-col border border-border px-[18px] pt-[16px] pb-[16px] sm:max-w-[440px] md:max-w-none"
                style={{ "--tint": "hsl(var(--card))" } as React.CSSProperties}
              >
                <b className="note-card-head block text-[20px] leading-[1.15] tracking-[-0.02em] pb-[8px]">{note.title}</b>
                <p className="note-card-body flex-1 m-0 text-[16px] [--rule:26px]">{note.text}</p>
              </li>
            ))}
          </ul>
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
