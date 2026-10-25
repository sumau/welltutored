import * as React from "react";
import { Link } from "wouter";
import type { Tutor } from "@/client";
import { intakeLabels, intakePillClasses, intakePillDotClasses } from "@/lib/intake";

// Each note card rests at its own slight angle, as if laid on a desk.
export const CARD_REST = ["-1.5deg", "1deg", "-0.5deg", "1.5deg", "-1deg"];

// A tutor's note card in her tint: her name with her intake beside it, then
// on the rules her subject, where she studied and her summary. With `href`
// it opens that page; without, it only shows who she is.
export function TutorCard({
  tutor,
  rest,
  href,
  className = "",
  testId,
}: {
  tutor: Tutor;
  rest: string;
  href?: string;
  className?: string;
  testId?: string;
}) {
  const body = (
    <>
      <div className="note-card-head flex items-start justify-between gap-[12px] pb-[12px]">
        <h3 className="m-0 text-[clamp(30px,2.6vw,36px)] leading-[1] tracking-[-0.04em] font-bold">
          {tutor.name}
        </h3>
        <span className={`shrink-0 inline-flex items-center gap-[8px] rounded-full h-[28px] px-[12px] text-[15px] font-semibold leading-none mt-[2px] ${intakePillClasses[tutor.intake]}`} aria-label={`Intake: ${intakeLabels[tutor.intake]}`}>
          <span className={`w-[8px] h-[8px] rounded-full ${intakePillDotClasses[tutor.intake]}`} aria-hidden="true" />
          {intakeLabels[tutor.intake]}
        </span>
      </div>
      <div className="note-card-body flex-1 text-[16px]">
        <b className="block text-[18px] font-bold">{tutor.subject}</b>
        <span className="block">{tutor.university}, {tutor.qualification}</span>
        <p className="m-0 mt-[28px] line-clamp-5">{tutor.profileSummary}</p>
      </div>
    </>
  );
  const props = {
    className: `note-card flex flex-col px-[26px] pt-[24px] pb-[20px] ${className}`,
    style: { "--tint": tutor.tint, "--rest": rest } as React.CSSProperties,
    "data-testid": testId,
  };
  return href ? <Link href={href} {...props}>{body}</Link> : <div {...props}>{body}</div>;
}
