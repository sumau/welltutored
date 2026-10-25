import * as React from "react";
import { useListTutors } from "@/client";
import { Link } from "wouter";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { intakeLabels, intakePillClasses, intakePillDotClasses } from "@/lib/intake";
import { scrollToTutors } from "@/lib/scroll-to-tutors";
import {
  publicTutorQueryOptions,
  publicTutorRequestOptions,
} from "@/lib/public-tutor-query";

// Each note card rests at its own slight angle, as if laid on a desk.
const CARD_REST = ["-1.5deg", "1deg", "-0.5deg", "1.5deg", "-1deg"];

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
      {/* Hero: the headline, beside who it's for */}
      <section aria-labelledby="home-hero-title" className="max-w-[1210px] mx-auto px-6 md:px-[30px] pt-[32px] md:pt-[64px] pb-[48px] md:pb-[80px] grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-[28px] lg:gap-[64px] lg:items-end" id="top">
        <h1 id="home-hero-title" className="text-[clamp(46px,7vw,108px)] leading-[0.92] tracking-[-0.04em] font-bold m-0" data-testid="hero-title">
          Learn to love learning.
        </h1>
        <p className="lg:border-l-2 lg:border-foreground/15 lg:pl-[32px] text-[clamp(20px,1.9vw,26px)] leading-[1.35] font-medium m-0 lg:mb-[10px] max-w-[22em]" data-testid="hero-copy">
          Helping young women grow, flourish and thrive.
        </p>
      </section>

      {/* Tutors, one card each, under a heading the nav's link scrolls to */}
      <section className="px-6 md:px-[30px] pb-[56px] md:pb-[80px] focus:outline-none" id="tutors" tabIndex={-1} aria-labelledby="home-tutors-title">
        <div className="max-w-[1150px] mx-auto">
          <div className="mb-[28px]">
            <h2 id="home-tutors-title" className="text-[clamp(32px,4vw,48px)] leading-[1.05] tracking-[-0.03em] font-semibold m-0 mb-[8px]">
              Meet the tutors
            </h2>
            <p className="text-muted-foreground text-[18px] leading-[1.5] m-0">
              Personalised tutoring from women with deep subject expertise.
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
                  <Link
                    href={`/tutors/${tutor.slug}`}
                    className="note-card flex flex-col w-full sm:aspect-square sm:max-w-[440px] md:max-w-none px-[26px] pt-[24px] pb-[20px]"
                    style={{ "--tint": tutor.tint, "--rest": CARD_REST[index % CARD_REST.length] } as React.CSSProperties}
                    data-testid={`tutor-card-${tutor.slug}`}
                  >
                    <div className="note-card-head flex items-start justify-between gap-[12px] pb-[12px]">
                      <h3 className="m-0 text-[clamp(30px,2.6vw,36px)] leading-[1] tracking-[-0.04em] font-bold">
                        {tutor.name}
                      </h3>
                      <span className={`shrink-0 inline-flex items-center gap-[8px] rounded-full h-[28px] px-[12px] text-[15px] font-semibold leading-none mt-[2px] ${intakePillClasses[tutor.intake]}`} aria-label={`Intake: ${intakeLabels[tutor.intake]}`}>
                        <span className={`w-[8px] h-[8px] rounded-full ${intakePillDotClasses[tutor.intake]}`} aria-hidden="true" />
                        {intakeLabels[tutor.intake]}
                      </span>
                    </div>
                    <div className="note-card-body flex-1 text-[16px]">
                      <b className="block text-[18px] font-bold">{tutor.subject}</b>
                      <span className="block">{tutor.university}, {tutor.qualification}</span>
                      <p className="m-0 mt-[28px] line-clamp-5">{tutor.profileSummary}</p>
                    </div>
                  </Link>
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
