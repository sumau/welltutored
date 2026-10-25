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
        <Name className={`m-0 font-serif font-extrabold [font-stretch:108%] tracking-[-0.03em] break-words hyphens-auto ${nameClassName}`} data-testid={nameTestId}>
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
// angle and straightens when pointed at. A long label makes the cover taller.
const REST = ["-1.5deg", "1deg", "-0.5deg", "1.5deg", "-1deg"];

export function TutorBook({ tutor, index }: { tutor: Tutor; index: number }) {
  return (
    <>
      <Link
        href={`/tutors/${tutor.slug}`}
        className="book flex flex-col flex-1 min-h-[468px] sm:min-h-[504px] p-[20px] pl-[34px] pt-[36px]"
        style={{ "--tint": tutor.tint, "--rest": REST[index % REST.length] } as React.CSSProperties}
        data-testid={`tutor-card-${tutor.slug}`}
      >
        <BookLabel tutor={tutor} nameClassName="text-[clamp(30px,3vw,38px)] leading-[1]" />
        <span className="flex mt-auto pt-[24px] px-[4px]">
          <IntakeStamp tutor={tutor} />
        </span>
      </Link>
      <p className="text-[16px] leading-[36px] m-0 px-[4px] h-[108px] line-clamp-3">{tutor.profileSummary}</p>
    </>
  );
}

// A small stack of tutors' books, fanned out on the desk, each opening her
// profile. --y is a share of the book's own height.
const FANS: Record<number, { left: string; y: string; r: string }[]> = {
  1: [{ left: "28%", y: "8%", r: "-2deg" }],
  2: [
    { left: "8%", y: "14%", r: "-5deg" },
    { left: "46%", y: "2%", r: "3deg" },
  ],
  3: [
    { left: "0%", y: "14%", r: "-6deg" },
    { left: "28%", y: "0%", r: "-1deg" },
    { left: "56%", y: "25%", r: "5deg" },
  ],
};

export function BookFan({ tutors, className = "" }: { tutors: Tutor[]; className?: string }) {
  const shown = tutors.slice(0, 3);
  const fan = FANS[shown.length];
  if (!fan) return null;
  return (
    <nav aria-label="Tutors" className={`book-fan ${className}`} data-testid="book-fan">
      {shown.map((tutor, index) => (
        <Link
          key={tutor.id}
          href={`/tutors/${tutor.slug}`}
          className="book w-[44%] aspect-[7/10] p-[10px] pl-[22px] pt-[30px] sm:p-[16px] sm:pl-[28px] sm:pt-[48px] text-[13px] sm:text-[15px] xl:text-[17px] [&_.book-label]:px-[10px] sm:[&_.book-label]:px-[14px]"
          style={{
            "--tint": tutor.tint,
            "--x": "0px",
            "--y": fan[index].y,
            "--r": fan[index].r,
            "--delay": `${index * 90}ms`,
            left: fan[index].left,
            zIndex: index,
          } as React.CSSProperties}
          data-testid={`hero-book-${tutor.slug}`}
        >
          <BookLabel tutor={tutor} nameAs="span" studied={false} nameClassName="block text-[clamp(17px,2vw,28px)] leading-[1.05]" />
        </Link>
      ))}
    </nav>
  );
}
