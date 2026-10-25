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
      <section className="px-6 md:px-[30px] pt-[32px] md:pt-[48px] pb-[16px]">
        <div className="max-w-[1150px] mx-auto">
          <nav aria-label="Breadcrumb" className="mb-[36px]">
            <ol className="flex items-center gap-2 text-[14px] font-medium text-muted-foreground">
              <li><Link href="/#tutors" className="rounded-full hover:text-foreground transition-colors" data-testid="enquiry-back-link">Back to the tutors</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-foreground">Enquiry</li>
            </ol>
          </nav>

          <h1
            className="font-serif text-[clamp(42px,5.6vw,68px)] leading-[1.04] mb-[20px] max-w-[16ch]"
            data-testid="enquiry-title"
          >
            Make an enquiry
          </h1>
          <p className="max-w-[36em] text-muted-foreground text-[18px] leading-[1.6]">
            Tell us which tutor you are interested in, then share a little
            about the student and the support that would help. Well Tutored
            reviews every named-tutor enquiry and keeps your details
            private.
          </p>
        </div>
      </section>

      <section className="px-6 md:px-[30px] py-[40px] md:py-[64px]" aria-labelledby="enquiry-form-title">
        <div className="max-w-[1150px] mx-auto grid grid-cols-1 md:grid-cols-[0.82fr_1.18fr] gap-[40px] md:gap-[72px] items-start">
          <div className="grid gap-[24px]">
            <ol className="list-none p-0 m-0 grid gap-[16px]">
              {[
                "Choose the tutor whose subject experience feels like the right fit.",
                "Share the student's age, subject, level and current context.",
                "Well Tutored reviews the enquiry and helps arrange the next step.",
              ].map((step, index) => (
                <li key={step} className="flex items-center gap-[14px] text-[16px] leading-[1.5]">
                  <span className="w-[34px] h-[34px] shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-[16px]" aria-hidden="true">{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
            {PUBLIC_RESOURCES_ENABLED && (
              <Link
                href="/resources"
                className="inline-flex items-center gap-2 text-[15px] font-semibold text-foreground underline-offset-4 hover:underline"
                data-testid="enquiry-resources-link"
              >
                Read our subject resources <ArrowRight size={14} />
              </Link>
            )}
          </div>

          <div className="bg-card rounded-[20px] border border-border p-6 md:p-10">
            <EnquiryForm tutors={contactableTutors} />
          </div>
        </div>
      </section>
    </main>
  );
}
