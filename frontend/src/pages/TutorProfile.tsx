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
    <div className="bg-card rounded-[14px] border-2 border-foreground p-8 text-[16px] leading-[1.6]" data-testid="tutor-enquiry-unavailable">
      {tutor.name} is not currently accepting enquiries. Please check back later or choose another tutor.
    </div>
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
    <section className="px-[var(--gutter)] max-w-[1210px] mx-auto mb-[72px]" id="background">
      <div className="border-t border-border">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-[12px] md:gap-[22px] py-[28px] border-b border-border">
            <h2 className="font-serif text-[24px] leading-[36px] m-0">{row.label}</h2>
            <div className="grid gap-[20px] max-w-[46em] text-[16px] leading-[1.6]" data-testid={row.testId}>
              {backgroundEntries(row.text).map((entry, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-x-[22px] gap-y-[2px]">
                  {entry.dates && <span className="text-muted-foreground text-[15px]">{entry.dates}</span>}
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
    <main className="flex-1 ruled" data-testid={`page-tutor-${tutor.slug}`}>
      {/* Back to the tutors, and jumps within her page */}
      <div className="max-w-[1210px] mx-auto px-[var(--gutter)] pt-[18px] flex justify-between items-center text-[15px] font-bold">
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

      {/* Her exercise book: the label on the cover, beside her approach */}
      <section className="max-w-[1210px] mx-auto px-[var(--gutter)] pt-[36px] pb-[36px]">
        <div
          className="book grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-[32px] lg:gap-[56px] items-center p-[20px] pl-[32px] py-[28px] md:p-[40px] md:pl-[56px]"
          style={{ "--tint": tutor.tint } as React.CSSProperties}
        >
          <div className="grid gap-[20px] justify-items-start">
            <div className="w-full max-w-[560px]">
              <BookLabel
                tutor={tutor}
                nameAs="h1"
                nameClassName="text-[clamp(40px,5vw,64px)] leading-[1]"
                nameTestId="tutor-name"
                subjectTestId="tutor-subject-kicker"
              />
            </div>
            <IntakeStamp tutor={tutor} className="text-[16px] px-[12px] py-[5px]" />
          </div>
          <figure className="m-0">
            <blockquote className="font-serif font-semibold text-[22px] md:text-[28px] leading-[1.35] tracking-[-0.01em] m-0">
              {tutor.teachingIntro}
            </blockquote>
            <figcaption className="text-[16px] mt-[20px] font-bold">
              {firstName} on her approach
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="max-w-[1210px] mx-auto px-[var(--gutter)] pb-[36px]">
        <p className="max-w-[36em] text-[20px] md:text-[22px] leading-[36px] m-0" data-testid="tutor-intro">
          {tutor.profileSummary}
        </p>
      </section>

      {/* About */}
      <section className="px-[var(--gutter)] max-w-[1210px] mx-auto pt-[36px] mb-[72px]" id="about">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[36px] md:gap-[86px]">
          <div>
            <h2 className="font-serif text-[clamp(30px,3.4vw,40px)] leading-[72px] m-0">About {firstName}</h2>
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

      {/* Learning with her, on her own tint */}
      <section className="px-[var(--gutter)] py-[72px]" style={{ backgroundColor: tutor.tint }}>
        <div className="max-w-[1150px] mx-auto">
          <h2 className="font-serif text-[clamp(32px,3.8vw,48px)] leading-[1.1] m-0 mb-[36px]">
            Learning with {firstName}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
            {tutor.teachingPoints.map((point, index) => (
              <article key={`${point.title}-${index}`} className="book-label p-[22px]">
                <h3 className="font-serif text-[22px] leading-[1.2] mb-[10px]">
                  {point.title}
                </h3>
                <p className="text-[16px] leading-[1.6] m-0">
                  {point.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <TutorResources tutor={tutor} />

      {/* Enquire */}
      <section className="px-[var(--gutter)] py-[72px]">
        <div className="max-w-[1150px] mx-auto grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr] gap-[36px] md:gap-[72px] items-start">
          <div>
            <h2 className="font-serif text-[clamp(34px,4vw,48px)] leading-[1.1] m-0 mb-[18px]">
              Ask about lessons with {firstName}
            </h2>
            <p className="text-[18px] leading-[36px] max-w-[30em] m-0">
              Tell us a little about the student and what would help. Well Tutored delivers your enquiry securely to the team for review. Tutor email addresses are never published.
            </p>
            <ol className="list-none p-0 m-0 mt-[36px] grid gap-[12px]">
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
