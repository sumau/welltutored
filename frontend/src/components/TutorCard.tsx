import * as React from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import type { Tutor } from "@/client";
import { intakeLabels, intakePillClasses, intakePillDotClasses } from "@/lib/intake";

// Each note card rests at its own slight angle, as if laid on a desk.
export const CARD_REST = ["-1.5deg", "1deg", "-0.5deg", "1.5deg", "-1deg"];

// A tutor's landscape note card in her tint: her intake stuck on its top edge,
// then ruled lines: her name, her subject, where she studied (each wraps
// rather than being cut short), a blank rule and four of her summary. Cards in
// a row stretch to the tallest. With `href` it opens that page, and an arrow
// at the end of her name says so, since a phone never sees the hover lift;
// without, it only shows who she is.
export function TutorCard({
  tutor,
  rest,
  href,
  onClick,
  className = "",
  testId,
}: {
  tutor: Tutor;
  rest: string;
  href?: string;
  // Runs before the link is followed; preventing the default stays put.
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  className?: string;
  testId?: string;
}) {
  const body = (
    <>
      {/* The pill straddles the card's top edge, like a label. */}
      <span className={`absolute top-[-13px] right-[18px] inline-flex items-center gap-[8px] rounded-full h-[26px] px-[11px] text-[14px] font-semibold leading-none ${intakePillClasses[tutor.intake]}`}>
        <span className={`w-[8px] h-[8px] rounded-full ${intakePillDotClasses[tutor.intake]}`} aria-hidden="true" />
        {intakeLabels[tutor.intake]}
      </span>
      <h3 className="note-card-head m-0 pb-[10px] flex items-start gap-[12px] text-[clamp(26px,2.2vw,30px)] leading-[1] tracking-[-0.04em] font-bold">
        <span className="flex-1 [text-wrap:balance]">{tutor.name}</span>
        {href && <ArrowRight className="shrink-0 mt-0.5" size={24} strokeWidth={3} aria-hidden="true" />}
      </h3>
      <div className="note-card-body flex-1 text-[15px] [--rule:26px]">
        <b className="block text-[17px] font-bold [text-wrap:balance]">{tutor.subject}</b>
        <span className="block text-[12.5px]">{tutor.university}, {tutor.qualification}</span>
        <p className="m-0 mt-[26px] min-h-[104px] line-clamp-4">{tutor.profileSummary}</p>
      </div>
    </>
  );
  const props = {
    className: `note-card relative flex flex-col px-[20px] pt-[20px] pb-[14px] ${className}`,
    style: { "--tint": tutor.tint, "--rest": rest } as React.CSSProperties,
    "data-testid": testId,
  };
  return href ? <Link href={href} onClick={onClick} {...props}>{body}</Link> : <div {...props}>{body}</div>;
}
