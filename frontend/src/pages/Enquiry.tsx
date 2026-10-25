import { useListTutors } from "@/client";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { EnquiryForm } from "@/components/EnquiryForm";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { PUBLIC_RESOURCES_ENABLED } from "@/lib/features";
import {
  publicTutorQueryOptions,
  publicTutorRequestOptions,
} from "@/lib/public-tutor-query";

export default function Enquiry() {
  const {
    data: tutors,
    isLoading,
    error,
    refetch,
  } = useListTutors({
    query: publicTutorQueryOptions,
    request: publicTutorRequestOptions,
  });

  if (isLoading) return <LoadingState message="Loading enquiry form..." />;
  if (error) {
    return (
      <ErrorState
        message="Could not load the available tutors."
        onRetry={refetch}
      />
    );
  }

  const contactableTutors = tutors?.filter((tutor) => tutor.intake !== "full") ?? [];

  if (!contactableTutors.length) {
    return (
      <ErrorState
        message="There are no tutors available for enquiries at the moment."
        onRetry={refetch}
      />
    );
  }

  return (
    <main className="flex-1" data-testid="page-enquiry">
      <section className="px-[var(--gutter)]" aria-labelledby="enquiry-form-title">
        <div className="max-w-[1150px] mx-auto pt-[36px] pb-[108px]">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-[15px] leading-[1.6] font-bold text-muted-foreground list-none p-0 m-0">
              <li><Link href="/" className="rounded-full hover:text-foreground transition-colors" data-testid="enquiry-back-link">Back to the tutors</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-foreground">Enquiry</li>
            </ol>
          </nav>

          <h1
            className="font-serif font-extrabold [font-stretch:112%] tracking-[-0.04em] text-[44px] md:text-[72px] leading-[1.02] m-0 mt-[28px] max-w-[16ch]"
            data-testid="enquiry-title"
          >
            Make an enquiry
          </h1>
          <p className="max-w-[36em] text-[18px] md:text-[20px] leading-[1.6] m-0 mt-[16px]">
            Tell us which tutor you are interested in, then share a little
            about the student and the support that would help. Well Tutored
            reviews every named-tutor enquiry and keeps your details
            private.
          </p>

          <div className="mt-[72px] grid grid-cols-1 md:grid-cols-[0.82fr_1.18fr] gap-[72px] items-start">
            <div className="grid gap-[36px]">
              <ol className="list-none p-0 m-0 grid gap-[20px]">
                {[
                  "Choose the tutor whose subject experience feels like the right fit.",
                  "Share the student's age, subject, level and current context.",
                  "Well Tutored reviews the enquiry and helps arrange the next step.",
                ].map((step, index) => (
                  <li key={step} className="flex gap-[14px] text-[18px] leading-[1.6]">
                    <span className="step-number text-[20px] leading-[1.6]" aria-hidden="true">{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              {PUBLIC_RESOURCES_ENABLED && (
                <Link
                  href="/resources"
                  className="inline-flex items-center gap-2 text-[16px] leading-[1.6] font-bold text-foreground underline-offset-4 hover:underline"
                  data-testid="enquiry-resources-link"
                >
                  Read our subject resources <ArrowRight size={14} />
                </Link>
              )}
            </div>

            <EnquiryForm tutors={contactableTutors} />
          </div>
        </div>
      </section>
    </main>
  );
}
