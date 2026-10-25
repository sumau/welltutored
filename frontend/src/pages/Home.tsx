import * as React from "react";
import { useListTutors, type Tutor } from "@/client";
import { Link } from "wouter";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { BookLabel, TutorBook } from "@/components/TutorBook";
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
      {/* Hero: the headline written on the rules, beside a stack of the tutors' books */}
      <section aria-labelledby="home-hero-title" className="ruled px-[var(--gutter)]" id="top">
        <div className="max-w-[1210px] mx-auto pt-[36px] md:pt-[72px] pb-[36px] md:pb-[72px] grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-[36px] lg:gap-[48px] items-start">
          <div>
            <h1 id="home-hero-title" className="relative top-[8px] md:top-[14px] xl:top-[22px] font-serif font-extrabold [font-stretch:112%] text-[52px] leading-[72px] md:text-[88px] md:leading-[108px] xl:text-[116px] xl:leading-[144px] tracking-[-0.04em] m-0" data-testid="hero-title">
              Learn to love learning.
            </h1>
            <p className="text-[20px] md:text-[24px] leading-[36px] m-0 mt-[36px] max-w-[22em]" data-testid="hero-copy">
              Helping young women grow, flourish and thrive.
            </p>
          </div>
          {tutors && tutors.length > 0 && <BookFan tutors={tutors} />}
        </div>
      </section>

      {/* Tutors, one book each, under a heading the nav's link scrolls to */}
      <section className="ruled px-[var(--gutter)] focus:outline-none" id="tutors" tabIndex={-1} aria-labelledby="home-tutors-title">
        <div className="max-w-[1150px] mx-auto pt-[36px] pb-[72px]">
          <h2 id="home-tutors-title" className="relative top-[13px] md:top-[9px] font-serif text-[36px] md:text-[48px] leading-[72px] m-0">
            Meet the tutors
          </h2>
          <p className="text-muted-foreground text-[18px] leading-[36px] m-0 mb-[36px]">
            Personalised tutoring from women with deep subject expertise.
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
                <li key={tutor.id}>
                  <TutorBook tutor={tutor} index={index} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* How an enquiry works: the steps numbered in the margin */}
      <section className="ruled px-[var(--gutter)]" aria-labelledby="home-enquiry-title">
        <div className="max-w-[1150px] mx-auto pt-[36px] pb-[108px]">
          <h2 id="home-enquiry-title" className="relative top-[13px] md:top-[9px] font-serif text-[36px] md:text-[48px] leading-[72px] m-0 mb-[36px]">
            How an enquiry works
          </h2>
          <ol className="list-none p-0 m-0 grid gap-[36px] max-w-[40em]">
            {[
              ["Choose a tutor", "Pick from the list above. Her profile shows how she teaches."],
              ["Tell us about the student", "The subject, the school level, and what would help."],
              ["We reply", "Well Tutored reviews the enquiry and gets back to you."],
            ].map(([title, text], index) => (
              <li key={title} className="relative flex gap-[14px] md:block">
                <span className="margin-number text-[22px] leading-[36px]" aria-hidden="true">{index + 1}</span>
                <div>
                  <b className="block font-serif text-[22px] leading-[36px]">{title}</b>
                  <span className="block text-muted-foreground text-[18px] leading-[36px]">{text}</span>
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

// The hero's stack: up to three tutors' books, fanned out on the desk.
const FAN = [
  { left: "0%", y: "48px", r: "-6deg" },
  { left: "28%", y: "0px", r: "-1deg" },
  { left: "56%", y: "88px", r: "5deg" },
]

function BookFan({ tutors }: { tutors: Tutor[] }) {
  return (
    <nav aria-label="Tutors" className="book-fan relative h-[340px] sm:h-[460px] xl:h-[560px]">
      {tutors.slice(0, FAN.length).map((tutor, index) => (
        <Link
          key={tutor.id}
          href={`/tutors/${tutor.slug}`}
          className="book w-[44%] aspect-[7/10] p-[10px] pl-[22px] pt-[30px] sm:p-[16px] sm:pl-[28px] sm:pt-[48px] text-[13px] sm:text-[15px] xl:text-[17px] [&_.book-label]:px-[10px] sm:[&_.book-label]:px-[14px]"
          style={{
            "--tint": tutor.tint,
            "--x": "0px",
            "--y": FAN[index].y,
            "--r": FAN[index].r,
            "--delay": `${index * 90}ms`,
            left: FAN[index].left,
            zIndex: index,
          } as React.CSSProperties}
          data-testid={`hero-book-${tutor.slug}`}
        >
          <BookLabel tutor={tutor} nameAs="span" studied={false} nameClassName="block text-[clamp(17px,2vw,28px)] leading-[1.05]" />
        </Link>
      ))}
    </nav>
  );
}
