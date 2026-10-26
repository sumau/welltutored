import * as React from "react";
import { useListTutors } from "@/client";
import { Link } from "wouter";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { SafeguardingNote } from "@/components/SafeguardingNote";
import { enquirySteps } from "@/lib/enquiry-steps";
import { CARD_REST, TutorCard } from "@/components/TutorCard";
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

  // A link to `/#tutors`, from before the tutors became the hero, still lands
  // on them. Scroll once they have loaded, so the page has its full height.
  React.useEffect(() => {
    if (tutorsLoading || window.location.hash !== "#tutors") return;
    scrollToTutors("auto");
  }, [tutorsLoading]);

  // Tutors who can't take anyone new come last.
  const listedTutors = [...(tutors || [])].sort(
    (a, b) => Number(a.intake === "full") - Number(b.intake === "full"),
  );

  return (
    <main className="flex-1" data-testid="page-home">
      {/* Hero: the tutors themselves, under the tagline and a line on who they are.
          "Back to the tutors" links scroll here. */}
      <section className="px-6 md:px-[30px] pt-[28px] md:pt-[48px] [@media(min-width:1280px)_and_(max-height:760px)]:pt-[24px] pb-[56px] md:pb-[80px] focus:outline-none" id="tutors" tabIndex={-1} aria-labelledby="home-hero-title">
        <div className="max-w-[1150px] mx-auto">
          {/* The tagline, with a small note on who the tutors are at the right,
              its last line on the tagline's baseline. */}
          <div className="mb-[32px] md:mb-[60px] [@media(min-width:1280px)_and_(max-height:760px)]:mb-[30px] grid grid-cols-1 gap-[16px] md:grid-cols-[minmax(0,1fr)_23rem] md:[align-items:last_baseline] md:gap-x-[48px]">
            <h1 id="home-hero-title" className="text-[clamp(42px,5.2vw,72px)] leading-[0.95] tracking-[-0.04em] font-bold m-0 [text-wrap:balance]" data-testid="hero-title">
              Tutors to look up to.
            </h1>
            <p className="text-[15px] leading-[1.5] m-0 text-foreground/80 [text-wrap:pretty] md:text-right" data-testid="hero-copy">
              <strong className="block font-semibold text-foreground [text-wrap:balance]">Tutoring to help young women grow.</strong>
              From a select community of women who{" "}<br className="hidden md:inline" />know their subjects and how to teach them.
            </p>
          </div>
          <h2 className="sr-only">The tutors</h2>
          {tutorsLoading ? (
            <LoadingState variant="tutor-grid" message="Loading tutors..." />
          ) : tutorsError ? (
            <ErrorState
              message="We couldn't load the tutor profiles. Please try again."
              onRetry={refetchTutors}
            />
          ) : listedTutors.length === 0 ? (
            <p className="text-[17px] text-muted-foreground m-0" data-testid="tutor-grid-empty">
              No tutors are listed just now. Please check back soon.
            </p>
          ) : (
            // Centred rows, so five tutors sit as three and two, not with a gap.
            <ul className="list-none m-0 p-0 flex flex-wrap justify-center gap-[28px]" aria-label="The tutors" data-testid="tutor-grid">
              {listedTutors.map((tutor, index) => (
                <li key={tutor.id} className="deal-in flex w-full sm:max-w-[440px] md:max-w-none md:w-[calc((100%-28px)/2)] xl:w-[calc((100%-56px)/3)]" style={{ "--delay": `${index * 90}ms` } as React.CSSProperties}>
                  <TutorCard
                    tutor={tutor}
                    rest={CARD_REST[index % CARD_REST.length]}
                    href={`/tutors/${tutor.slug}`}
                    className="w-full"
                    testId={`tutor-card-${tutor.slug}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* How an enquiry works */}
      <section className="px-6 md:px-[30px] py-[56px] md:py-[80px]" aria-labelledby="home-enquiry-title">
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
            {enquirySteps("home").map(({ title, text }, index) => (
              <li key={title} className="border-t-2 border-foreground pt-[18px]">
                <span className="block text-[15px] text-muted-foreground mb-[6px]">Step {index + 1}</span>
                <b className="block text-[20px] font-semibold mb-[6px]">{title}</b>
                <span className="text-muted-foreground text-[16px] leading-[1.55]">{text}</span>
              </li>
            ))}
          </ol>
          <SafeguardingNote className="mt-[40px]" />
        </div>
      </section>
    </main>
  );
}
