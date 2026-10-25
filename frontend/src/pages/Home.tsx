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
        <h1 id="home-hero-title" className="text-[clamp(46px,8.4vw,124px)] leading-[0.92] tracking-[-0.045em] font-extrabold m-0 mb-[32px] max-w-[12ch]" style={{ fontVariationSettings: '"opsz" 96' }} data-testid="hero-title">
          Find the tutor who gets it.
        </h1>
        <p className="max-w-[32em] text-[20px] leading-[1.5] m-0 font-[350]" data-testid="hero-copy">
          Women tutors for girls at GCSE and A-level, one to one. Each of them knows her subject deeply and teaches it her own way.
        </p>
      </section>

      {/* Tutors, one band each */}
      <section className="focus:outline-none" id="tutors" tabIndex={-1} aria-labelledby="home-tutors-title">
        <h2 id="home-tutors-title" className="sr-only">The tutors</h2>
        {tutorsLoading ? (
          <div className="max-w-[1210px] mx-auto px-6 md:px-[30px]"><LoadingState variant="tutor-grid" message="Loading tutors..." /></div>
        ) : tutorsError ? (
          <div className="max-w-[1210px] mx-auto px-6 md:px-[30px]">
            <ErrorState
              message="We couldn't load the tutor profiles. Please try again."
              onRetry={refetchTutors}
            />
          </div>
        ) : (
          <ul className="list-none m-0 p-0" data-testid="tutor-grid">
            {(tutors || []).map((tutor) => (
              <li key={tutor.id}>
                <Link
                  href={`/tutors/${tutor.slug}`}
                  className="tutor-band group block px-6 md:px-[30px] py-[32px] md:py-[44px]"
                  style={{ "--tint": tutor.tint } as React.CSSProperties}
                  data-testid={`tutor-card-${tutor.slug}`}
                >
                  <div className="max-w-[1150px] mx-auto grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-[16px] md:gap-[48px] md:items-end">
                    <h3 className="m-0 text-[clamp(44px,6.6vw,96px)] leading-[0.92] tracking-[-0.04em] font-extrabold" style={{ fontVariationSettings: '"opsz" 96' }}>
                      {tutor.name}
                    </h3>
                    <div className="text-[17px] leading-[1.45]">
                      <b className="block text-[21px] font-bold mb-[6px]">{tutor.subject}</b>
                      {tutor.university}, {tutor.qualification}
                      <span className="flex justify-between gap-[16px] mt-[14px] font-semibold" aria-label={`Intake: ${intakeLabels[tutor.intake]}`}>
                        {intakeLabels[tutor.intake]}
                        <span className="underline underline-offset-4 decoration-2 group-hover:decoration-[3px]" aria-hidden="true">Her profile</span>
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* How an enquiry works */}
      <section className="px-6 md:px-[30px] py-[64px] md:py-[96px]" aria-labelledby="home-enquiry-title">
        <div className="max-w-[1150px] mx-auto grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-[40px] md:gap-[80px] items-start">
          <div>
            <h2 id="home-enquiry-title" className="text-[clamp(38px,5vw,64px)] leading-[0.98] tracking-[-0.035em] font-extrabold m-0 mb-[20px]">
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
                <span className="text-[44px] leading-none font-extrabold tracking-[-0.04em]" aria-hidden="true">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
