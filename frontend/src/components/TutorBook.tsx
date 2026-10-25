import * as React from "react";
import { Link } from "wouter";
import type { Tutor } from "@/client";
import { intakeLabels, intakePillClasses, intakePillDotClasses } from "@/lib/intake";

// The printed label on a tutor's exercise book: her name, subject and where
// she studied, each on its own captioned line.
export function BookLabel({
  tutor,
  nameAs: Name = "h2",
  nameClassName,
  studied = true,
}: {
  tutor: Tutor;
  nameAs?: "h2" | "h3" | "span";
  nameClassName: string;
  studied?: boolean;
}) {
  return (
    <div className="book-label">
      <div className="book-label-row">
        <span className="book-label-caption">Name</span>
        <Name className={`m-0 font-bold tracking-[-0.04em] ${nameClassName}`}>{tutor.name}</Name>
      </div>
      <div className="book-label-row">
        <span className="book-label-caption">Subject</span>
        <b className="font-bold leading-[1.3]">{tutor.subject}</b>
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

export function IntakePill({ tutor }: { tutor: Tutor }) {
  return (
    <span className={`inline-flex items-center gap-[8px] rounded-full px-[12px] py-[6px] text-[15px] font-semibold ${intakePillClasses[tutor.intake]}`} aria-label={`Intake: ${intakeLabels[tutor.intake]}`}>
      <span className={`w-[8px] h-[8px] rounded-full ${intakePillDotClasses[tutor.intake]}`} aria-hidden="true" />
      {intakeLabels[tutor.intake]}
    </span>
  );
}

// A tutor as an exercise book in her tint, opening her profile, with her
// summary on the page beneath it. Each book rests at its own slight angle and
// straightens when pointed at.
const REST = ["-1.5deg", "1deg", "-0.5deg", "1.5deg", "-1deg"];

export function TutorBook({ tutor, index }: { tutor: Tutor; index: number }) {
  return (
    <>
      <Link
        href={`/tutors/${tutor.slug}`}
        className="book flex flex-col min-h-[420px] sm:min-h-[460px] p-[22px] pl-[36px] pt-[36px]"
        style={{ "--tint": tutor.tint, "--rest": REST[index % REST.length] } as React.CSSProperties}
        data-testid={`tutor-card-${tutor.slug}`}
      >
        <BookLabel tutor={tutor} nameClassName="text-[clamp(30px,3vw,38px)] leading-[0.95]" />
        <span className="flex mt-auto pt-[24px]">
          <IntakePill tutor={tutor} />
        </span>
      </Link>
      <p className="text-[16px] leading-[1.55] m-0 mt-[20px] px-[4px] line-clamp-3">{tutor.profileSummary}</p>
    </>
  );
}

// A small stack of tutors' books, fanned out on the desk, each opening her
// profile. They fan out once on arrival.
const FANS: Record<number, { left: string; y: string; r: string }[]> = {
  1: [{ left: "28%", y: "24px", r: "-2deg" }],
  2: [
    { left: "8%", y: "48px", r: "-5deg" },
    { left: "46%", y: "8px", r: "3deg" },
  ],
  3: [
    { left: "0%", y: "48px", r: "-6deg" },
    { left: "28%", y: "0px", r: "-1deg" },
    { left: "56%", y: "88px", r: "5deg" },
  ],
};

export function BookFan({ tutors }: { tutors: Tutor[] }) {
  const shown = tutors.slice(0, 3);
  const fan = FANS[shown.length];
  if (!fan) return null;
  return (
    <div className="book-fan" data-testid="book-fan">
      {shown.map((tutor, index) => (
        <Link
          key={tutor.id}
          href={`/tutors/${tutor.slug}`}
          className="book w-[44%] aspect-[7/10] p-[10px] pl-[22px] pt-[30px] sm:p-[16px] sm:pl-[30px] sm:pt-[44px] text-[13px] sm:text-[15px] xl:text-[17px] [&_.book-label]:px-[10px] sm:[&_.book-label]:px-[14px]"
          style={{
            "--tint": tutor.tint,
            "--y": fan[index].y,
            "--r": fan[index].r,
            "--delay": `${index * 90}ms`,
            left: fan[index].left,
            zIndex: index,
          } as React.CSSProperties}
          data-testid={`fan-book-${tutor.slug}`}
        >
          <BookLabel tutor={tutor} nameAs="span" studied={false} nameClassName="block text-[clamp(17px,2vw,28px)] leading-[1]" />
        </Link>
      ))}
    </div>
  );
}
