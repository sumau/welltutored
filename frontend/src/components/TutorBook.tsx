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

// A tutor as an exercise book in her tint, opening her profile, with her
// summary written on the page beneath it. Each book rests at its own slight
// angle and straightens when pointed at.
const REST = ["-1.5deg", "1deg", "-0.5deg", "1.5deg", "-1deg"];

export function TutorBook({ tutor, index }: { tutor: Tutor; index: number }) {
  return (
    <>
      <Link
        href={`/tutors/${tutor.slug}`}
        className="book flex flex-col h-[468px] sm:h-[504px] p-[20px] pl-[34px] pt-[36px]"
        style={{ "--tint": tutor.tint, "--rest": REST[index % REST.length] } as React.CSSProperties}
        data-testid={`tutor-card-${tutor.slug}`}
      >
        <BookLabel tutor={tutor} nameClassName="text-[clamp(30px,3vw,38px)] leading-[1]" />
        <span className="flex mt-auto px-[4px]">
          <IntakeStamp tutor={tutor} />
        </span>
      </Link>
      <p className="text-[16px] leading-[36px] m-0 px-[4px] h-[108px] line-clamp-3">{tutor.profileSummary}</p>
    </>
  );
}
