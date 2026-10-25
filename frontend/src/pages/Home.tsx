import * as React from "react";
import { useListTutors } from "@/client";
import { Link, useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { BookFan } from "@/components/TutorBook";
import {
  publicTutorQueryOptions,
  publicTutorRequestOptions,
} from "@/lib/public-tutor-query";

const beliefs = [
  ["She finds her confidence.", "Working one to one with someone who believes she can, she starts to believe it too."],
  ["She becomes curious about the world.", "A tutor who loves her subject shows her why it matters beyond the exam."],
  ["She discovers what she's capable of.", "Often it's more than she thought."],
];

export default function Home() {
  const { data: tutors } = useListTutors({
    query: publicTutorQueryOptions,
    request: publicTutorRequestOptions,
  });
  const [, setLocation] = useLocation();

  // The tutors used to be a section of Home at `/#tutors`; send old links to
  // their own page.
  React.useEffect(() => {
    if (window.location.hash === "#tutors") setLocation("/tutors", { replace: true });
  }, [setLocation]);

  return (
    <main className="flex-1" data-testid="page-home">
      {/* Hero: the belief, beside who Well Tutored is */}
      <section aria-labelledby="home-hero-title" className="max-w-[1210px] mx-auto px-6 md:px-[30px] pt-[32px] md:pt-[64px] pb-[56px] md:pb-[96px] grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-[28px] lg:gap-[64px] lg:items-end" id="top">
        <h1 id="home-hero-title" className="text-[clamp(44px,6.4vw,96px)] leading-[0.95] tracking-[-0.04em] font-bold m-0" data-testid="hero-title">
          The right tutor changes how she feels about learning.
        </h1>
        <p className="lg:border-l-2 lg:border-foreground/15 lg:pl-[32px] text-[clamp(20px,1.9vw,26px)] leading-[1.35] font-medium m-0 lg:mb-[10px] max-w-[22em]" data-testid="hero-copy">
          Well Tutored introduces young women to women tutors with deep expertise in their subjects. Lessons are online, so she can be anywhere in the UK.
        </p>
      </section>

      {/* What we believe: what the right tutor changes, one line at a time */}
      <section className="px-6 md:px-[30px] pb-[56px] md:pb-[96px]" aria-labelledby="home-belief-title">
        <div className="max-w-[1150px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-[32px] lg:gap-[64px]">
          <div>
            <h2 id="home-belief-title" className="text-[clamp(32px,4vw,48px)] leading-[1.05] tracking-[-0.03em] font-semibold m-0 mb-[16px]">
              What we believe
            </h2>
            <p className="text-[19px] leading-[1.5] text-muted-foreground m-0 max-w-[24em]">
              A good tutor teaches the subject. The right tutor changes how a student sees herself.
            </p>
          </div>
          <ul className="list-none p-0 m-0 grid gap-[32px] md:gap-[40px]">
            {beliefs.map(([title, text]) => (
              <li key={title} className="border-t-2 border-foreground pt-[18px]">
                <b className="block text-[clamp(26px,2.8vw,36px)] leading-[1.1] tracking-[-0.03em] font-bold mb-[10px] [text-wrap:balance]">{title}</b>
                <span className="block text-muted-foreground text-[18px] leading-[1.5] max-w-[34em]">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Who teaches, beside a few of the tutors' books */}
      <section className="bg-secondary px-6 md:px-[30px] py-[56px] md:py-[96px] overflow-hidden" aria-labelledby="home-tutors-title">
        <div className="max-w-[1150px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-[40px] lg:gap-[64px] lg:items-center">
          <div>
            <h2 id="home-tutors-title" className="text-[clamp(32px,4vw,48px)] leading-[1.05] tracking-[-0.03em] font-semibold m-0 mb-[16px]">
              Women who teach what they know
            </h2>
            <p className="text-[18px] leading-[1.55] m-0 mb-[28px] max-w-[30em]">
              Every Well Tutored tutor is a woman with deep expertise in her subject, a role model as well as a teacher. We're a small, hand-picked group, and a person reads every enquiry and replies.
            </p>
            <Link
              href="/tutors"
              className="rounded-full bg-primary text-primary-foreground text-[17px] font-semibold px-6 py-3.5 hover:bg-primary-border transition-colors inline-flex items-center gap-2 w-fit"
              data-testid="button-home-tutors"
            >
              Meet the tutors <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          {/* Holds its height while the tutors load, and stays empty if they don't */}
          <div className="h-[340px] sm:h-[460px] xl:h-[540px]">
            {tutors && <BookFan tutors={tutors} />}
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
            {[
              ["Choose a tutor", "Pick a tutor. Her profile shows how she teaches."],
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
