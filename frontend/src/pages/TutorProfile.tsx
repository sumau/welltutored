import { useParams } from "wouter";
import * as React from "react";
import { useGetTutor, getGetTutorQueryKey, type Tutor } from "@/client";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { EnquiryForm } from "@/components/EnquiryForm";
import { PUBLIC_RESOURCES_ENABLED } from "@/lib/features";
import { ResourceTypeLabel } from "@/components/ResourceType";
import { BookLabel, IntakeStamp } from "@/components/TutorBook";
import {
  publicTutorQueryOptions,
  publicTutorRequestOptions,
} from "@/lib/public-tutor-query";

export function TutorEnquiry({ tutor }: { tutor: Tutor }) {
  return tutor.intake === "full" ? (
    <p className="m-0 text-[18px] leading-[36px]" data-testid="tutor-enquiry-unavailable">
      {tutor.name} is not currently accepting enquiries. Please check back later or choose another tutor.
    </p>
  ) : (
    <EnquiryForm tutor={tutor} compact={true} />
  );
}

export function TutorAvailability({ tutor }: { tutor: Tutor }) {
  if (!tutor.availability) return null;
  return (
    <div className="book-label-row" data-testid="tutor-availability">
      <span className="book-label-caption">Availability</span>
      <span>{tutor.availability}</span>
    </div>
  );
}

// Experience and Education are free text, one entry per paragraph. An entry
// whose first line reads "dates | role" shows its dates in their own column;
// any other entry shows as written.
export function backgroundEntries(text: string) {
  return text.trim().split(/\n\s*\n/).map((paragraph) => {
    const [first, ...rest] = paragraph.split("\n");
    const match = first.match(/^(.+?)\s+\|\s+(.+)$/);
    if (!match) return { dates: "", title: "", detail: paragraph };
    return { dates: match[1], title: match[2], detail: rest.join("\n") };
  });
}

export function TutorBackground({ tutor }: { tutor: Tutor }) {
  const rows = [
    { label: "Experience", text: tutor.experience, testId: "tutor-experience" },
    { label: "Education", text: tutor.education, testId: "tutor-education" },
  ].filter((row) => row.text);
  if (rows.length === 0) return null;

  return (
    <section className="ruled px-[var(--gutter)]" id="background">
      <div className="max-w-[1150px] mx-auto pt-[36px] pb-[36px] grid gap-[36px]">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-x-[22px]">
            <h2 className="font-serif text-[24px] leading-[36px] m-0">{row.label}</h2>
            <div className="grid gap-[36px] max-w-[46em] text-[16px] leading-[36px]" data-testid={row.testId}>
              {backgroundEntries(row.text).map((entry, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-x-[22px]">
                  {entry.dates && <span className="text-muted-foreground">{entry.dates}</span>}
                  <div className={entry.dates ? "" : "sm:col-span-2"}>
                    {entry.title && <b className="block font-semibold text-foreground">{entry.title}</b>}
                    {entry.detail && <span className="block text-muted-foreground whitespace-pre-wrap">{entry.detail}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TutorResources({ tutor }: { tutor: Tutor }) {
  if (!PUBLIC_RESOURCES_ENABLED || tutor.resources.length === 0) {
    return null;
  }
  const firstName = tutor.name.split(' ')[0];

  return (
    <section className="bg-secondary px-6 md:px-[30px] py-[60px] md:py-[88px]" id="resources">
      <div className="max-w-[1150px] mx-auto">
        <span className="block uppercase tracking-[0.17em] text-[10px] font-bold text-primary mb-4">From {firstName}'s desk</span>
        <h2 className="font-serif text-[clamp(43px,5vw,67px)] leading-[0.91] tracking-tight m-0 mb-6">
          Small notes for<br /><em>big ideas.</em>
        </h2>
        <p className="text-muted-foreground text-[14px] leading-[1.7] max-w-[490px]">
          A few of {firstName}'s tutor-written resources — practical, personal and designed to be picked up between lessons.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-[1.25fr_0.75fr] gap-[14px] mt-[38px]">
          {tutor.resources[0] && (
            <Link href={`/resources/${tutor.resources[0].slug}`} className="bg-card p-[27px] min-h-[225px] md:min-h-[274px] text-left hover:-translate-y-1 transition-transform border border-border flex flex-col justify-between" style={{ backgroundColor: tutor.tint }}>
               <div>
                 <ResourceTypeLabel
                   type={tutor.resources[0].type}
                   className="text-[10px] uppercase tracking-[0.13em] text-foreground font-bold opacity-80"
                 />
                 <span className="text-[10px] uppercase tracking-[0.13em] text-foreground font-bold opacity-80">
                   · {tutor.resources[0].readMinutes} min read
                 </span>
                <h3 className="font-serif text-[29px] leading-[1.03] tracking-tight mt-[25px] mb-[20px] max-w-[400px]">{tutor.resources[0].title}</h3>
              </div>
              <footer className="border-t border-foreground/10 pt-[12px] text-[11px] flex justify-between items-center w-full mt-auto">
                <span className="font-medium text-foreground">By {firstName} {tutor.name.split(' ')[1]}</span>
                 <span className="flex items-center gap-1.5 text-foreground/80">Open resource <ArrowRight size={12} /></span>
              </footer>
            </Link>
          )}
          
          <div className="grid gap-[14px]">
            {tutor.resources.slice(1, 3).map(resource => (
              <Link href={`/resources/${resource.slug}`} key={resource.id} className="bg-card p-[27px] min-h-[140px] text-left hover:-translate-y-1 transition-transform border border-border flex flex-col justify-between">
                 <div>
                   <ResourceTypeLabel
                     type={resource.type}
                     className="text-[10px] uppercase tracking-[0.13em] text-primary font-bold"
                   />
                  <h3 className="font-serif text-[22px] leading-[1.05] tracking-tight mt-[16px] mb-[20px]">{resource.title}</h3>
                </div>
                <footer className="border-t border-border pt-[12px] text-[11px] flex justify-between items-center w-full mt-auto">
                  <span className="font-medium">By {firstName}</span>
                   <span className="text-muted-foreground flex items-center gap-1.5">Open resource <ArrowRight size={12} /></span>
                </footer>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function TutorProfile() {
  const { slug } = useParams<{ slug: string }>();
  const { data: tutor, isLoading, error, refetch } = useGetTutor(slug as string, {
    query: {
      ...publicTutorQueryOptions,
      enabled: !!slug,
      queryKey: getGetTutorQueryKey(slug as string),
    },
    request: publicTutorRequestOptions,
  });

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  if (isLoading) return <LoadingState message="Loading profile..." />;
  if (error || !tutor) return <ErrorState message="Could not find this tutor." onRetry={refetch} />;

  const firstName = tutor.name.split(' ')[0];

  return (
    <main className="flex-1" data-testid={`page-tutor-${tutor.slug}`}>
      {/* Her exercise book beside her approach, written on the page */}
      <section className="ruled px-[var(--gutter)]">
        <div className="max-w-[1150px] mx-auto pt-[36px] pb-[72px]">
          <div className="flex justify-between items-center text-[15px] font-bold leading-[36px]">
            <Link href="/#tutors" className="inline-flex items-center gap-2 rounded-full underline-offset-[6px] decoration-2 hover:underline" data-testid="link-back">
              <ArrowLeft size={15} /> All tutors
            </Link>
            <div className="hidden sm:flex items-center gap-6 text-muted-foreground">
              <button onClick={() => jumpTo('about')} className="hover:text-foreground">About {firstName}</button>
              {PUBLIC_RESOURCES_ENABLED && tutor.resources.length > 0 && (
                <button onClick={() => jumpTo('resources')} className="hover:text-foreground">Her resources</button>
              )}
            </div>
          </div>

          <div className="mt-[36px] grid grid-cols-1 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] gap-x-[64px] gap-y-[72px] items-start">
            <div
              className="book flex flex-col w-full max-w-[400px] h-[468px] md:h-[540px] p-[22px] pl-[36px] pt-[48px]"
              style={{ "--tint": tutor.tint, "--rest": "-1deg" } as React.CSSProperties}
            >
              <BookLabel
                tutor={tutor}
                nameAs="h1"
                nameClassName="text-[clamp(34px,4vw,44px)] leading-[1.05]"
                nameTestId="tutor-name"
                subjectTestId="tutor-subject-kicker"
              />
              <span className="flex mt-auto px-[4px]">
                <IntakeStamp tutor={tutor} className="text-[16px] px-[12px] py-[5px]" />
              </span>
            </div>
            <div>
              <figure className="m-0">
                <blockquote className="font-serif font-semibold text-[22px] md:text-[28px] leading-[36px] tracking-[-0.01em] m-0">
                  {tutor.teachingIntro}
                </blockquote>
                <figcaption className="text-[16px] leading-[36px] font-bold">
                  {firstName} on her approach
                </figcaption>
              </figure>
              <p className="max-w-[36em] text-[18px] md:text-[20px] leading-[36px] m-0 mt-[36px] text-muted-foreground" data-testid="tutor-intro">
                {tutor.profileSummary}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="ruled px-[var(--gutter)]" id="about">
        <div className="max-w-[1150px] mx-auto pt-[36px] pb-[36px] grid grid-cols-1 md:grid-cols-2 gap-[36px] md:gap-[86px]">
          <div>
            <h2 className="relative top-[13px] md:top-[12px] font-serif text-[36px] md:text-[40px] leading-[72px] m-0">About {firstName}</h2>
            <div className="text-[18px] leading-[36px] max-w-[34em] whitespace-pre-wrap" data-testid="tutor-bio">
              {tutor.bio}
            </div>
          </div>

          <div className="md:pt-[72px]">
            <div className="book-label">
              <div className="book-label-row">
                <span className="book-label-caption">University</span>
                <span>{tutor.university}</span>
              </div>
              <div className="book-label-row">
                <span className="book-label-caption">Qualification</span>
                <span>{tutor.qualification}</span>
              </div>
              <div className="book-label-row">
                <span className="book-label-caption">Session rate</span>
                <span>Illustrative rate: £{tutor.rate} per 60-minute session</span>
              </div>
              {tutor.support && (
                <div className="book-label-row">
                  <span className="book-label-caption">Support</span>
                  <span>{tutor.support}</span>
                </div>
              )}
              <TutorAvailability tutor={tutor} />
            </div>
          </div>
        </div>
      </section>

      <TutorBackground tutor={tutor} />

      {/* Learning with her, written on the page */}
      <section className="ruled px-[var(--gutter)]">
        <div className="max-w-[1150px] mx-auto pt-[36px] pb-[36px]">
          <h2 className="relative top-[13px] md:top-[12px] font-serif text-[36px] md:text-[40px] leading-[72px] m-0 mb-[36px]">
            Learning with {firstName}
          </h2>
          <dl className="grid gap-[36px] m-0 max-w-[60em]">
            {tutor.teachingPoints.map((point, index) => (
              <div key={`${point.title}-${index}`} className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-x-[22px]">
                <dt className="font-serif font-bold text-[20px] leading-[36px]">{point.title}</dt>
                <dd className="text-[18px] leading-[36px] m-0">{point.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <TutorResources tutor={tutor} />

      {/* Enquire */}
      <section className="ruled px-[var(--gutter)]">
        <div className="max-w-[1150px] mx-auto pt-[72px] pb-[108px] grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr] gap-[36px] md:gap-[72px] items-start">
          <div>
            <h2 className="relative top-[14px] md:top-[12px] font-serif text-[32px] md:text-[40px] leading-[72px] m-0">
              Ask about lessons with {firstName}
            </h2>
            <p className="text-[18px] leading-[36px] max-w-[30em] m-0">
              Tell us a little about the student and what would help. Well Tutored delivers your enquiry securely to the team for review. Tutor email addresses are never published.
            </p>
            <ol className="list-none p-0 m-0 mt-[36px] grid">
              {[
                "Share the student's subject, level and context",
                `Well Tutored reviews your enquiry for ${firstName}`,
                "Well Tutored replies to you",
              ].map((step, index) => (
                <li key={step} className="relative flex gap-[14px] md:block text-[18px] leading-[36px]">
                  <span className="margin-number text-[20px] leading-[36px]" aria-hidden="true">{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <TutorEnquiry tutor={tutor} />
        </div>
      </section>
    </main>
  );
}
