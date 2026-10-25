import * as React from "react";
import { Link } from "wouter";
import type { Tutor } from "@/client";
import { intakeLabels, intakeStampClasses } from "@/lib/intake";

// The printed label on a tutor's exercise book: her name, subject and where
// she studied, each on its own captioned line.
export function BookLabel({
  tutor,
  nameAs: Name = "h3",
  nameClassName,
  studied = true,
  nameTestId,
  subjectTestId,
}: {
  tutor: Tutor;
  nameAs?: "h1" | "h3" | "span";
  nameClassName: string;
  studied?: boolean;
  nameTestId?: string;
  subjectTestId?: string;
}) {
  return (
    <div className="book-label">
      <div className="book-label-row">
        <span className="book-label-caption">Name</span>
        <Name className={`m-0 font-serif font-extrabold [font-stretch:108%] tracking-[-0.03em] ${nameClassName}`} data-testid={nameTestId}>
          {tutor.name}
        </Name>
      </div>
      <div className="book-label-row">
        <span className="book-label-caption">Subject</span>
        <b className="font-bold leading-[1.3]" data-testid={subjectTestId}>{tutor.subject}</b>
      </div>
      {studied && (
        <div className="book-label-row">
          <span className="book-label-caption">Studied</span>
          <span className="leading-[1.4]">{tutor.university}, {tutor.qualification}</span>
        </div>
      )}
    </div>
  );
}

export function IntakeStamp({ tutor, className = "" }: { tutor: Tutor; className?: string }) {
  return (
    <span className={`${intakeStampClasses[tutor.intake]} ${className}`} aria-label={`Intake: ${intakeLabels[tutor.intake]}`}>
      {intakeLabels[tutor.intake]}
    </span>
  );
}

// A tutor as an exercise book in her tint, opening her profile.
export function TutorBook({ tutor }: { tutor: Tutor }) {
  return (
    <Link
      href={`/tutors/${tutor.slug}`}
      className="book flex flex-col h-full p-[20px] pl-[32px] pt-[26px] md:pt-[30px]"
      style={{ "--tint": tutor.tint } as React.CSSProperties}
      data-testid={`tutor-card-${tutor.slug}`}
    >
      <BookLabel tutor={tutor} nameClassName="text-[clamp(30px,3vw,38px)] leading-[1]" />
      <p className="text-[16px] leading-[1.5] m-0 mt-[20px] px-[4px] line-clamp-3">{tutor.profileSummary}</p>
      <span className="flex mt-auto pt-[22px] px-[4px]">
        <IntakeStamp tutor={tutor} />
      </span>
    </Link>
  );
}
