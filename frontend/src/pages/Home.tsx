import * as React from "react";
import { useListTutors } from "@/client";
import { Link } from "wouter";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { TutorCircle } from "@/components/TutorCircle";
import { scrollToTutors } from "@/lib/scroll-to-tutors";
import {
  publicTutorQueryOptions,
  publicTutorRequestOptions,
} from "@/lib/public-tutor-query";

const intakeLabels = {
  accepting: "Taking students",
  limited: "Few spaces left",
  full: "Full for now",
} as const;

const intakeDotClasses = {
  accepting: "bg-green-600",
  limited: "bg-amber-500",
  full: "bg-red-500",
} as const;

export default function Home() {
  const { data: tutors, isLoading: tutorsLoading, error: tutorsError, refetch: refetchTutors } = useListTutors({
    query: publicTutorQueryOptions,
    request: publicTutorRequestOptions,
  });

  // Sizes and offsets for the hero's circles, so the group reads as people
  // gathered together rather than a grid.
  const heroCircles = [
    { size: 150, offset: 0 },
    { size: 112, offset: 46 },
    { size: 128, offset: -18 },
    { size: 98, offset: 30 },
    { size: 120, offset: -6 },
    { size: 104, offset: 38 },
  ];

  // The nav's "Meet the tutors" opens `/#tutors`. Scroll once the tutors have
  // loaded, since the hero's circles change its height.
  React.useEffect(() => {
    if (tutorsLoading || window.location.hash !== "#tutors") return;
    scrollToTutors("auto");
  }, [tutorsLoading]);

  return (
    <main className="flex-1" data-testid="page-home">
      {/* Hero */}
      <section aria-labelledby="home-hero-title" className="max-w-[1210px] mx-auto px-6 md:px-[30px] pt-[40px] md:pt-[72px] pb-[64px] md:pb-[96px] grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-[48px] lg:gap-[56px] items-center" id="top">
        <div>
          <h1 id="home-hero-title" className="font-serif text-[clamp(42px,5.6vw,72px)] leading-[1.02] mb-[24px] max-w-[13ch]" data-testid="hero-title">
            Women tutors for girls at GCSE and A-level.
          </h1>
          <p className="max-w-[34em] text-muted-foreground text-[18px] leading-[1.6] m-0" data-testid="hero-copy">
            Thoughtful one-to-one support from women with deep knowledge of their subject. Choose the tutor who feels right and send her an enquiry.
          </p>
        </div>

        {tutors && tutors.length > 0 && (
          <ul className="flex flex-wrap items-start justify-center lg:justify-start gap-x-[14px] gap-y-[6px] list-none p-0 m-0 [--circle-scale:0.6] sm:[--circle-scale:0.8] lg:[--circle-scale:1]" aria-label="Our tutors" data-testid="hero-tutors">
            {tutors.slice(0, heroCircles.length).map((tutor, index) => {
              const circle = heroCircles[index];
              return (
                <li key={tutor.id} style={{ marginTop: `calc(${Math.max(circle.offset, 0)}px * var(--circle-scale))`, marginBottom: `calc(${Math.max(-circle.offset, 0)}px * var(--circle-scale))` }}>
                  <Link
                    href={`/tutors/${tutor.slug}`}
                    className="group flex flex-col items-center gap-[10px] rounded-[24px] p-1"
                    data-testid={`hero-tutor-${tutor.slug}`}
                  >
                    <TutorCircle
                      tutor={tutor}
                      size={circle.size}
                      className="circle-settle transition-transform group-hover:scale-[1.04]"
                      style={{ animationDelay: `${index * 90}ms` }}
                    />
                    <span className="text-[15px] font-semibold">{tutor.firstName}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Tutors */}
      <section className="bg-secondary px-6 md:px-[30px] py-[64px] md:py-[88px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" id="tutors" tabIndex={-1} aria-labelledby="home-tutors-title">
        <div className="max-w-[1150px] mx-auto">
          <div className="mb-[40px] max-w-[640px]">
            <h2 id="home-tutors-title" className="font-serif text-[clamp(34px,4vw,48px)] leading-[1.08] m-0 mb-[14px]">
              Meet the tutors
            </h2>
            <p className="text-muted-foreground text-[17px] leading-[1.6] m-0">
              Their subjects, where they studied, and what a lesson with each of them is like.
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[16px]" data-testid="tutor-grid">
              {(tutors || []).map((tutor) => (
                <Link
                  href={`/tutors/${tutor.slug}`}
                  key={tutor.id}
                  className="tutor-wash rounded-[20px] p-[24px] text-left min-h-[300px] h-full flex flex-col border border-transparent hover:border-foreground/25 transition-colors"
                  style={{ "--tint": tutor.tint } as React.CSSProperties}
                  data-testid={`tutor-card-${tutor.slug}`}
                >
                  <div className="flex items-start justify-between gap-[12px] mb-[18px]">
                    <TutorCircle tutor={tutor} size={56} />
                    <span
                      className="inline-flex shrink-0 items-center gap-[7px] rounded-full bg-card px-[11px] py-[6px] text-[13px] font-medium"
                      aria-label={`Intake: ${intakeLabels[tutor.intake]}`}
                    >
                      <span className={`w-[8px] h-[8px] rounded-full ${intakeDotClasses[tutor.intake]}`} aria-hidden="true" />
                      {intakeLabels[tutor.intake]}
                    </span>
                  </div>
                  <h3 className="font-serif text-[26px] leading-[1.1] m-0 mb-[4px]">{tutor.name}</h3>
                  <span className="block text-[15px] font-semibold mb-[14px]">{tutor.subject}</span>
                  <p className="text-[15px] text-foreground/80 leading-[1.55] mt-0 mb-[20px] flex-1 line-clamp-3">
                    {tutor.profileSummary}
                  </p>
                  <div className="border-t border-foreground/15 pt-[14px] text-[14px] text-foreground/80 mt-auto">
                    <b className="text-foreground font-semibold">{tutor.university}</b><br />{tutor.qualification}
                  </div>
                </Link>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* How an enquiry works */}
      <section className="px-6 md:px-[30px] py-[64px] md:py-[88px]" aria-labelledby="home-enquiry-title">
        <div className="max-w-[1150px] mx-auto grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr] gap-[40px] md:gap-[80px] items-start">
          <div>
            <h2 id="home-enquiry-title" className="font-serif text-[clamp(34px,4vw,48px)] leading-[1.08] m-0 mb-[18px]">
              How an enquiry works
            </h2>
            <p className="text-muted-foreground max-w-[30em] leading-[1.6] text-[17px] mb-[28px]">
              Choose a tutor, then tell us a little about the student and the support that would help. Well Tutored records the enquiry securely and replies to you.
            </p>
            <Link
              href="/enquire"
              className="rounded-full bg-primary text-primary-foreground text-[16px] font-semibold px-7 py-4 hover:bg-primary-border transition-colors inline-flex"
              data-testid="button-home-enquire"
            >
              Make an enquiry
            </Link>
            <p className="text-muted-foreground text-[14px] leading-[1.5] mt-4 mb-0">
              Your details are shared only for this enquiry and its record.
            </p>
          </div>

          <ol className="list-none p-0 m-0 grid gap-[14px]">
            {[
              "Choose a tutor from the profiles above",
              "Tell us the subject and school level",
              "Well Tutored reviews your enquiry and replies",
            ].map((step, index) => (
              <li key={step} className="flex items-center gap-[16px] rounded-[20px] bg-secondary px-[20px] py-[18px] text-[17px]">
                <span className="w-[40px] h-[40px] shrink-0 rounded-full bg-primary flex items-center justify-center font-serif text-[19px] pb-0.5" aria-hidden="true">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
