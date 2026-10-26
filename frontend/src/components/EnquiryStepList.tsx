import * as React from "react";
import type { EnquiryStep } from "@/lib/enquiry-steps";

// The enquiry steps as a numbered list beside a form. Home shows the same
// steps as three columns.
export function EnquiryStepList({ steps, className = "" }: { steps: EnquiryStep[]; className?: string }) {
  return (
    <ol className={`list-none p-0 m-0 grid gap-[18px] ${className}`} data-testid="enquiry-steps">
      {steps.map((step, index) => (
        <li key={step.title} className="flex items-start gap-[14px] text-[16px] leading-[1.5]">
          <span className="w-[34px] h-[34px] shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-[16px]" aria-hidden="true">{index + 1}</span>
          <span className="pt-[5px]">
            <b className="font-semibold">{step.title}.</b>{" "}
            <span className="text-muted-foreground">{step.text}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
