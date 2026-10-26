import * as React from "react";
import { Link } from "wouter";
import type { Tutor } from "@/client";
import { intakeLabels, intakePillClasses, intakePillDotClasses } from "@/lib/intake";

// Each note card rests at its own slight angle, as if laid on a desk.
export const CARD_REST = ["-1.5deg", "1deg", "-0.5deg", "1.5deg", "-1deg"];

// A tutor's landscape note card in her tint: her intake stuck on its top edge,
// then a fixed set of ruled lines (her name, subject and where she studied on
// one line each, a blank rule, three of her summary) so every card is the
// same height. Six fit a laptop screen under the Home headline. With
// `href` it opens that page; without, it only shows who she is.
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
      {/* The pill straddles the card's top edge, so the unfilled "full" one
          takes her tint to stay readable over the page. */}
      <span className={`absolute top-[-13px] right-[18px] inline-flex items-center gap-[8px] rounded-full h-[26px] px-[11px] text-[14px] font-semibold leading-none ${intakePillClasses[tutor.intake]} ${tutor.intake === "full" ? "bg-[var(--tint)]" : ""}`}>
        <span className={`w-[8px] h-[8px] rounded-full ${intakePillDotClasses[tutor.intake]}`} aria-hidden="true" />
        {intakeLabels[tutor.intake]}
      </span>
      <h3 className="note-card-head m-0 pb-[10px] text-[clamp(26px,2.2vw,30px)] leading-[1] tracking-[-0.04em] font-bold truncate">
        {tutor.name}
      </h3>
      <div className="note-card-body flex-1 text-[15px] [--rule:26px]">
        <b className="block text-[17px] font-bold truncate">{tutor.subject}</b>
        <span className="block text-[13.5px] truncate" title={`${tutor.university}, ${tutor.qualification}`}>{tutor.university}, {tutor.qualification}</span>
        <p className="m-0 mt-[26px] min-h-[78px] line-clamp-3">{tutor.profileSummary}</p>
      </div>
    </>
  );
  const props = {
    className: `note-card relative flex flex-col px-[20px] pt-[20px] pb-[14px] ${className}`,
    style: { "--tint": tutor.tint, "--rest": rest } as React.CSSProperties,
    "data-testid": testId,
  };
  return href ? <Link href={href} {...props}>{body}</Link> : <div {...props}>{body}</div>;
}
