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
      {/* Hero: the headline and tagline in the first box of the tutors' grid.
          "Back to the tutors" links scroll here. */}
      <section className="px-6 md:px-[30px] pt-[28px] md:pt-[48px] [@media(min-width:1280px)_and_(max-height:760px)]:pt-[24px] pb-[56px] md:pb-[80px] focus:outline-none" id="tutors" tabIndex={-1} aria-labelledby="home-hero-title">
        <div className="max-w-[1150px] mx-auto">
          {/* From lg, one grid of three columns: the headline and tagline
              take the first box and the tutors the rest, every box the
              height of the tallest, so five tutors fill two rows and
              six to eight a third. */}
          <div className="lg:grid lg:grid-cols-3 lg:auto-rows-fr lg:gap-x-[32px] lg:gap-y-[44px]">
            <div className="max-w-[34rem] mb-[32px] lg:mb-0">
              <h1 id="home-hero-title" className="text-[clamp(42px,5.2vw,72px)] lg:text-[clamp(50px,4.6vw,68px)] leading-[0.95] tracking-[-0.04em] font-bold m-0 [text-wrap:balance]" data-testid="hero-title">
                Tutors to look up to.
              </h1>
              <p className="text-[18px] leading-[1.5] mt-[20px] mb-0 text-foreground/80 [text-wrap:pretty]" data-testid="hero-copy">
                <strong className="block font-semibold text-foreground">Tutoring to help young women grow,</strong>
                from a select community of women who{" "}<br className="hidden xl:inline" />know their subjects and how to teach them.
              </p>
            </div>
            <h2 className="sr-only">The tutors</h2>
            {tutorsLoading ? (
              <div className="lg:col-span-2">
                <LoadingState variant="tutor-grid" message="Loading tutors..." />
              </div>
            ) : tutorsError ? (
              <div className="lg:col-span-2">
                <ErrorState
                  message="We couldn't load the tutor profiles. Please try again."
                  onRetry={refetchTutors}
                />
              </div>
            ) : listedTutors.length === 0 ? (
              <p className="lg:col-span-2 text-[17px] text-muted-foreground m-0" data-testid="tutor-grid-empty">
                No tutors are listed just now. Please check back soon.
              </p>
            ) : (
              // Centred rows below lg, so five tutors sit as two, two and one
              // in the middle, not with a gap; from lg the cards are the
              // grid's own boxes.
              <ul className="list-none m-0 p-0 flex flex-wrap justify-center gap-[28px] lg:contents" aria-label="The tutors" data-testid="tutor-grid">
                {listedTutors.map((tutor, index) => (
                  <li key={tutor.id} className="deal-in flex w-full sm:max-w-[440px] md:max-w-none md:w-[calc((100%-28px)/2)] lg:w-auto" style={{ "--delay": `${index * 90}ms` } as React.CSSProperties}>
                    <TutorCard
                      tutor={tutor}
                      rest={CARD_REST[index % CARD_REST.length]}
                      href={`/tutors/${tutor.slug}`}
                      tight
                      className="w-full"
                      testId={`tutor-card-${tutor.slug}`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
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
