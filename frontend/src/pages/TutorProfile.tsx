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
import { TutorCircle } from "@/components/TutorCircle";
import { intakeDotClasses } from "@/lib/intake";
import {
  publicTutorQueryOptions,
  publicTutorRequestOptions,
} from "@/lib/public-tutor-query";

const intakeDescriptions = {
  accepting: "Taking new students",
  limited: "Limited spaces",
  full: "Not taking new students",
} as const;

export function TutorEnquiry({ tutor }: { tutor: Tutor }) {
  return tutor.intake === "full" ? (
    <div className="bg-card rounded-[20px] p-8 text-[15px] text-muted-foreground leading-[1.6]" data-testid="tutor-enquiry-unavailable">
      {tutor.name} is not currently accepting enquiries. Please check back later or choose another tutor.
    </div>
  ) : (
    <EnquiryForm tutor={tutor} compact={true} />
  );
}

export function TutorAvailability({ tutor }: { tutor: Tutor }) {
  if (!tutor.availability) return null;
  return (
    <div className="grid grid-cols-[130px_1fr] gap-[22px] py-[17px] border-b border-border text-[15px] leading-[1.55]" data-testid="tutor-availability">
      <b className="font-semibold text-foreground">Availability</b>
      <span className="text-muted-foreground">{tutor.availability}</span>
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
    <section className="px-6 md:px-[30px] max-w-[1210px] mx-auto mb-[80px]" id="background">
      <div className="border-t border-border">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-[12px] md:gap-[22px] py-[28px] border-b border-border">
            <h2 className="font-serif text-[22px] leading-[1.2] m-0">{row.label}</h2>
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
    <main className="flex-1" data-testid={`page-tutor-${tutor.slug}`}>
      {/* Breadcrumb / Nav */}
      <div className="max-w-[1210px] mx-auto px-6 md:px-[30px] pt-6 flex justify-between items-center text-[14px] text-muted-foreground font-medium">
        <Link href="/#tutors" className="inline-flex items-center gap-2 rounded-full hover:text-foreground transition-colors" data-testid="link-back">
          <ArrowLeft size={15} /> All tutors
        </Link>
        <div className="hidden sm:flex items-center gap-6">
          <button onClick={() => jumpTo('about')} className="hover:text-foreground">About {firstName}</button>
          {PUBLIC_RESOURCES_ENABLED && tutor.resources.length > 0 && (
            <button onClick={() => jumpTo('resources')} className="hover:text-foreground">Her resources</button>
          )}
        </div>
      </div>

      {/* Hero: who she is, beside her approach, after Home's hero */}
      <section className="max-w-[1210px] mx-auto px-6 md:px-[30px] pt-[36px] md:pt-[56px] pb-[56px] md:pb-[72px] grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-[36px] lg:gap-[56px] items-center">
        <div>
          <TutorCircle tutor={tutor} size={96} className="circle-settle mb-[24px] [--circle-scale:0.75] md:[--circle-scale:1]" />
          <h1 className="font-serif text-[clamp(44px,5vw,68px)] leading-[1.02] mb-[10px]" data-testid="tutor-name">
            {tutor.name}
          </h1>
          <p className="text-[19px] font-semibold mb-[18px]" data-testid="tutor-subject-kicker">
            {tutor.subject}
          </p>
          <div className="inline-flex items-center gap-[8px] rounded-full bg-secondary px-4 py-2 text-[14px] font-medium mb-[22px]">
            <i className={`w-2 h-2 rounded-full ${intakeDotClasses[tutor.intake]}`} />
            {intakeDescriptions[tutor.intake]}
          </div>
          <p className="max-w-[36em] text-muted-foreground text-[18px] leading-[1.6] m-0" data-testid="tutor-intro">
            {tutor.profileSummary}
          </p>
        </div>
        <figure
          className="tutor-wash rounded-[28px] px-[28px] md:px-[40px] py-[32px] md:py-[40px] m-0"
          style={{ "--tint": tutor.tint } as React.CSSProperties}
        >
          <blockquote className="font-serif text-[22px] md:text-[26px] leading-[1.35] m-0 text-foreground">
            {tutor.teachingIntro}
          </blockquote>
          <figcaption className="text-[15px] text-foreground/80 mt-[24px] font-semibold">
            {firstName} on her approach
          </figcaption>
        </figure>
      </section>

      {/* About */}
      <section className="px-6 md:px-[30px] max-w-[1210px] mx-auto mb-[64px]" id="about">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[40px] md:gap-[86px]">
          <div>
            <h2 className="font-serif text-[clamp(30px,3.4vw,40px)] leading-[1.1] mb-[18px]">About {firstName}</h2>
            <div className="text-muted-foreground text-[17px] leading-[1.7] max-w-[34em] space-y-4 whitespace-pre-wrap" data-testid="tutor-bio">
              {tutor.bio}
            </div>
          </div>

          <div>
            <div className="border-t border-border mt-2 md:mt-[6px]">
              <div className="grid grid-cols-[130px_1fr] gap-[22px] py-[17px] border-b border-border text-[15px] leading-[1.55]">
                <b className="font-semibold text-foreground">University</b>
                <span className="text-muted-foreground">{tutor.university}</span>
              </div>
              <div className="grid grid-cols-[130px_1fr] gap-[22px] py-[17px] border-b border-border text-[15px] leading-[1.55]">
                <b className="font-semibold text-foreground">Qualification</b>
                <span className="text-muted-foreground">{tutor.qualification}</span>
              </div>
              <div className="grid grid-cols-[130px_1fr] gap-[22px] py-[17px] border-b border-border text-[15px] leading-[1.55]">
                <b className="font-semibold text-foreground">Session rate</b>
                <span className="text-muted-foreground">Illustrative rate: £{tutor.rate} per 60-minute session</span>
              </div>
              {tutor.support && (
                <div className="grid grid-cols-[130px_1fr] gap-[22px] py-[17px] border-b border-border text-[15px] leading-[1.55]">
                  <b className="font-semibold text-foreground">Support</b>
                  <span className="text-muted-foreground">{tutor.support}</span>
                </div>
              )}
              <TutorAvailability tutor={tutor} />
            </div>
          </div>
        </div>
      </section>

      <TutorBackground tutor={tutor} />

      {/* Teaching Style */}
      <section className="bg-secondary px-6 md:px-[30px] py-[60px] md:py-[88px]">
        <div className="max-w-[1150px] mx-auto">
          <h2 className="font-serif text-[clamp(30px,3.4vw,40px)] leading-[1.1] m-0 mb-[36px]">
            Learning with {firstName}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
            {tutor.teachingPoints.map((point, index) => (
              <article key={`${point.title}-${index}`} className="bg-card rounded-[20px] p-[24px]">
                <h3 className="font-serif text-[22px] leading-[1.2] mb-[10px]">
                  {point.title}
                </h3>
                <p className="text-[16px] leading-[1.6] text-muted-foreground m-0">
                  {point.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <TutorResources tutor={tutor} />

      {/* Enquire */}
      <section className="px-6 md:px-[30px] py-[60px] md:py-[88px]">
        <div className="max-w-[1150px] mx-auto grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr] gap-[40px] md:gap-[75px] items-start">
          <div>
            <h2 className="font-serif text-[clamp(34px,4vw,48px)] leading-[1.08] m-0 mb-[18px]">
              Ask about lessons with {firstName}
            </h2>
            <p className="text-muted-foreground text-[17px] leading-[1.7] max-w-[30em]">
              Tell us a little about the student and what would help. Well Tutored delivers your enquiry securely to the team for review. Tutor email addresses are never published.
            </p>
            <ol className="list-none p-0 mt-[28px] grid gap-[12px]">
              {[
                "Share the student's subject, level and context",
                `Well Tutored reviews your enquiry for ${firstName}`,
                "Well Tutored replies to you",
              ].map((step, index) => (
                <li key={step} className="flex items-center gap-[14px] text-[16px]">
                  <span className="w-[34px] h-[34px] shrink-0 rounded-full bg-primary flex items-center justify-center font-serif text-[16px] pb-0.5" aria-hidden="true">{index + 1}</span>
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
