import * as React from "react";
import { useListTutors } from "@/client";
import { Link } from "wouter";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { intakeLabels } from "@/lib/intake";
import { scrollToTutors } from "@/lib/scroll-to-tutors";
import {
  publicTutorQueryOptions,
  publicTutorRequestOptions,
} from "@/lib/public-tutor-query";

// A tutor's intake as a pill. The fill steps down with availability, so it
// reads the same on every tint: solid, then white, then only an outline.
const intakePillClasses = {
  accepting: "bg-foreground text-background",
  limited: "bg-white text-foreground",
  full: "border-[1.5px] border-foreground/50 text-foreground/80",
} as const;

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
      {/* Hero */}
      <section aria-labelledby="home-hero-title" className="max-w-[1210px] mx-auto px-6 md:px-[30px] pt-[32px] md:pt-[64px] pb-[48px] md:pb-[80px]" id="top">
        <h1 id="home-hero-title" className="text-[clamp(46px,8.4vw,124px)] leading-[0.92] tracking-[-0.045em] font-bold m-0 mb-[32px] max-w-[12ch]" data-testid="hero-title">
          Find the tutor who gets it.
        </h1>
        <p className="max-w-[32em] text-[20px] leading-[1.5] m-0 font-normal" data-testid="hero-copy">
          Women tutors for girls at GCSE and A-level, one to one. Each of them knows her subject deeply and teaches it her own way.
        </p>
      </section>

      {/* Tutors, one card each */}
      <section className="px-6 md:px-[30px] focus:outline-none" id="tutors" tabIndex={-1} aria-labelledby="home-tutors-title">
        <div className="max-w-[1150px] mx-auto">
          <h2 id="home-tutors-title" className="sr-only">The tutors</h2>
          {tutorsLoading ? (
            <LoadingState variant="tutor-grid" message="Loading tutors..." />
          ) : tutorsError ? (
            <ErrorState
              message="We couldn't load the tutor profiles. Please try again."
              onRetry={refetchTutors}
            />
          ) : (
            <ul className="list-none m-0 p-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[16px]" data-testid="tutor-grid">
              {(tutors || []).map((tutor) => (
                <li key={tutor.id}>
                  <Link
                    href={`/tutors/${tutor.slug}`}
                    className="tutor-band group flex flex-col h-full rounded-[16px] p-[26px] md:p-[30px]"
                    style={{ "--tint": tutor.tint } as React.CSSProperties}
                    data-testid={`tutor-card-${tutor.slug}`}
                  >
                    <h3 className="m-0 text-[clamp(36px,3.6vw,46px)] leading-[0.95] tracking-[-0.04em] font-bold mb-[14px]">
                      {tutor.name}
                    </h3>
                    <b className="block text-[19px] font-bold leading-[1.3] mb-[6px]">{tutor.subject}</b>
                    <span className="text-[16px] leading-[1.45]">{tutor.university}, {tutor.qualification}</span>
                    <p className="text-[16px] leading-[1.5] m-0 mt-[16px] pt-[16px] border-t border-foreground/20 line-clamp-3">{tutor.profileSummary}</p>
                    <span className="flex items-center justify-between gap-[16px] mt-auto pt-[24px] text-[16px] font-semibold">
                      <span className={`inline-flex items-center gap-[8px] rounded-full px-[12px] py-[5px] text-[15px] ${intakePillClasses[tutor.intake]}`} aria-label={`Intake: ${intakeLabels[tutor.intake]}`}>
                        {tutor.intake !== "full" && (
                          <span className={`w-[8px] h-[8px] rounded-full ${tutor.intake === "accepting" ? "bg-[#5EE08A]" : "bg-[#F2A93B]"}`} aria-hidden="true" />
                        )}
                        {intakeLabels[tutor.intake]}
                      </span>
                      <span className="underline underline-offset-4 decoration-2 group-hover:decoration-[3px]" aria-hidden="true">Her profile</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* How an enquiry works */}
      <section className="px-6 md:px-[30px] py-[64px] md:py-[96px]" aria-labelledby="home-enquiry-title">
        <div className="max-w-[1150px] mx-auto grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-[40px] md:gap-[80px] items-start">
          <div>
            <h2 id="home-enquiry-title" className="text-[clamp(38px,5vw,64px)] leading-[0.98] tracking-[-0.035em] font-bold m-0 mb-[20px]">
              How an enquiry works
            </h2>
            <p className="text-muted-foreground max-w-[30em] leading-[1.55] text-[18px] mb-[28px]">
              Choose a tutor, then tell us a little about the student and the support that would help. Well Tutored records the enquiry securely and replies to you.
            </p>
            <Link
              href="/enquire"
              className="rounded-full bg-primary text-primary-foreground text-[17px] font-bold px-8 py-4 hover:bg-primary-border transition-colors inline-flex"
              data-testid="button-home-enquire"
            >
              Make an enquiry
            </Link>
            <p className="text-muted-foreground text-[14px] leading-[1.5] mt-4 mb-0">
              Your details are shared only for this enquiry and its record.
            </p>
          </div>

          <ol className="list-none p-0 m-0 grid gap-[28px]">
            {[
              "Choose a tutor from the list above",
              "Tell us the subject and school level",
              "Well Tutored reviews your enquiry and replies",
            ].map((step, index) => (
              <li key={step} className="grid grid-cols-[56px_1fr] items-baseline text-[20px] leading-[1.35] font-medium">
                <span className="text-[44px] leading-none font-bold tracking-[-0.04em]" aria-hidden="true">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
