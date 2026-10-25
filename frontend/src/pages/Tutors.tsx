import * as React from "react";
import { useListTutors } from "@/client";
import { Link } from "wouter";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { TutorBook } from "@/components/TutorBook";
import {
  publicTutorQueryOptions,
  publicTutorRequestOptions,
} from "@/lib/public-tutor-query";

export default function Tutors() {
  const { data: tutors, isLoading, error, refetch } = useListTutors({
    query: publicTutorQueryOptions,
    request: publicTutorRequestOptions,
  });

  return (
    <main className="flex-1" data-testid="page-tutors">
      <section aria-labelledby="tutors-title" className="max-w-[1210px] mx-auto px-6 md:px-[30px] pt-[32px] md:pt-[64px] pb-[40px] md:pb-[56px] grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-[20px] lg:gap-[64px] lg:items-end">
        <h1 id="tutors-title" className="text-[clamp(46px,7vw,108px)] leading-[0.92] tracking-[-0.04em] font-bold m-0">
          Meet the tutors
        </h1>
        <p className="lg:border-l-2 lg:border-foreground/15 lg:pl-[32px] text-[clamp(20px,1.9vw,26px)] leading-[1.35] font-medium m-0 lg:mb-[10px] max-w-[22em]">
          Personalised tutoring from women with deep subject expertise.
        </p>
      </section>

      <section aria-label="Tutors" className="px-6 md:px-[30px] pb-[56px] md:pb-[80px]">
        <div className="max-w-[1150px] mx-auto">
          {isLoading ? (
            <LoadingState variant="tutor-grid" message="Loading tutors..." />
          ) : error ? (
            <ErrorState
              message="We couldn't load the tutor profiles. Please try again."
              onRetry={refetch}
            />
          ) : (
            <ul className="list-none m-0 p-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-[28px] gap-y-[48px]" data-testid="tutor-grid">
              {(tutors || []).map((tutor, index) => (
                <li key={tutor.id}>
                  <TutorBook tutor={tutor} index={index} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="bg-card border-t border-border px-6 md:px-[30px] py-[56px] md:py-[80px]" aria-labelledby="tutors-enquiry-title">
        <div className="max-w-[1150px] mx-auto flex flex-col md:flex-row md:items-end justify-between gap-[24px]">
          <div>
            <h2 id="tutors-enquiry-title" className="text-[clamp(32px,4vw,48px)] leading-[1.05] tracking-[-0.03em] font-semibold m-0 mb-[8px]">
              How an enquiry works
            </h2>
            <p className="text-muted-foreground text-[18px] leading-[1.5] m-0 max-w-[34em]">
              Tell us about the student and which tutor you'd like. Well Tutored reviews the enquiry and gets back to you.
            </p>
          </div>
          <Link
            href="/enquire"
            className="rounded-full bg-primary text-primary-foreground text-[17px] font-semibold px-6 py-3.5 hover:bg-primary-border transition-colors inline-flex w-fit shrink-0"
            data-testid="button-tutors-enquire"
          >
            Make an enquiry
          </Link>
        </div>
      </section>
    </main>
  );
}
