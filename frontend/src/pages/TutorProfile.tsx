import { useParams } from "wouter";
import * as React from "react";
import { useGetTutor, getGetTutorQueryKey, type Tutor } from "@/client";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { CARD_REST } from "@/components/TutorCard";
import { EmptyPage } from "@/pages/not-found";
import { PUBLIC_RESOURCES_ENABLED } from "@/lib/features";
import { ResourceTypeLabel } from "@/components/ResourceType";
import { SafeguardingNote } from "@/components/SafeguardingNote";
import { intakeLabels, intakePillDotClasses } from "@/lib/intake";
import {
  publicTutorQueryOptions,
  publicTutorRequestOptions,
} from "@/lib/public-tutor-query";

// The end of her profile: a way on to the enquiry form, which lives only on
// /enquire, or word that she is full.
export function TutorEnquiry({ tutor }: { tutor: Tutor }) {
  const firstName = tutor.name.split(' ')[0];
  const isFull = tutor.intake === "full";
  // Laid out like Home's "How an enquiry works": the way on sits level with
  // the heading. On a phone it follows the line under the heading, so the
  // line isn't stranded below the button.
  return (
    <section className="px-6 md:px-[30px] py-[56px] md:py-[80px]" id="enquire">
      <div className="max-w-[1150px] mx-auto grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] md:items-end gap-x-[24px]" data-testid={isFull ? "tutor-enquiry-unavailable" : undefined}>
        <h2 className="font-serif font-semibold text-[clamp(32px,4vw,48px)] leading-[1.05] m-0 mb-[18px] md:mb-0">
          {isFull ? `${firstName} is full for now` : `Ask about lessons with ${firstName}`}
        </h2>
        <p className="m-0 md:mt-[18px] md:row-start-2 max-w-[40em] text-muted-foreground text-[17px] leading-[1.6] [text-wrap:pretty]">
          {isFull
            ? `${tutor.name} is not currently accepting enquiries. Please check back later or choose another tutor.`
            : `Tell us a little about the student. ${firstName} reads every enquiry and replies herself.`}
        </p>
        {isFull ? (
          <Link href="/" className="mt-[24px] md:mt-0 md:col-start-2 md:row-start-1 inline-flex items-center gap-2 text-[17px] font-semibold text-foreground underline-offset-4 hover:underline w-fit" data-testid="tutor-enquiry-other-tutors">
            See the other tutors <ArrowRight size={16} />
          </Link>
        ) : (
          <Link
            href={`/enquire?tutor=${tutor.slug}`}
            className="mt-[24px] md:mt-0 md:col-start-2 md:row-start-1 rounded-full bg-primary text-primary-foreground text-[17px] font-semibold px-6 py-3.5 hover:bg-primary-border transition-colors inline-flex w-fit"
            data-testid="tutor-enquiry-link"
          >
            Make an enquiry
          </Link>
        )}
      </div>
      {!isFull && <SafeguardingNote className="max-w-[1150px] mx-auto mt-[40px]" />}
    </section>
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
  // A link to a tutor who isn't listed is a missing page, not a failed load.
  if (error?.status === 404) {
    return (
      <EmptyPage
        title="We couldn't find that tutor"
        message="She may no longer be listed. The tutors who are listed are all on the home page."
      />
    );
  }
  if (error || !tutor) return <ErrorState message="Could not load this tutor's profile." onRetry={refetch} />;

  const firstName = tutor.name.split(' ')[0];
  const isFull = tutor.intake === "full";

  return (
    <main className="flex-1" data-testid={`page-tutor-${tutor.slug}`}>
      {/* Breadcrumb / Nav */}
      <div className="max-w-[1210px] mx-auto px-6 md:px-[30px] pt-6 flex justify-between items-center text-[14px] text-muted-foreground font-medium">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full hover:text-foreground transition-colors" data-testid="link-back">
          <ArrowLeft size={15} /> All tutors
        </Link>
        <div className="hidden sm:flex items-center gap-6">
          {PUBLIC_RESOURCES_ENABLED && tutor.resources.length > 0 && (
            <button onClick={() => jumpTo('resources')} className="hover:text-foreground">Her resources</button>
          )}
        </div>
      </div>

      {/* Hero: who she is, beside her approach on a note card in her tint */}
      <section className="max-w-[1210px] mx-auto px-6 md:px-[30px] pt-[36px] md:pt-[56px] pb-[56px] md:pb-[72px] grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-[40px] lg:gap-[56px] items-center">
        <div>
          <h1 className="font-serif text-[clamp(44px,5vw,68px)] leading-[1.02] mb-[10px]" data-testid="tutor-name">
            {tutor.name}
          </h1>
          <p className="text-[19px] font-semibold mb-[18px]" data-testid="tutor-subject-kicker">
            {tutor.subject}
          </p>
          {/* A status line, not a pill, so it isn't mistaken for the button below. */}
          <p className="flex items-center gap-[8px] text-[15px] font-semibold text-foreground m-0 mb-[22px]" data-testid="tutor-intake">
            <span className={`w-[9px] h-[9px] rounded-full ${intakePillDotClasses[tutor.intake]}`} aria-hidden="true" />
            {intakeLabels[tutor.intake]}
          </p>
          <p className="max-w-[36em] text-muted-foreground text-[18px] leading-[1.6] m-0" data-testid="tutor-intro">
            {tutor.profileSummary}
          </p>
          {/* The same form as the header's "Make an enquiry", with her chosen. */}
          {!isFull && (
            <Link
              href={`/enquire?tutor=${tutor.slug}`}
              className="mt-[28px] rounded-full bg-primary text-primary-foreground text-[17px] font-semibold px-6 py-3.5 hover:bg-primary-border transition-colors inline-flex w-fit"
              data-testid="button-profile-enquire"
            >
              Ask about lessons with {firstName}
            </Link>
          )}
        </div>
        <figure
          className="note-card w-full max-w-[460px] lg:justify-self-center m-0 px-[26px] md:px-[34px] pt-[24px] md:pt-[30px] pb-[24px] md:pb-[30px]"
          style={{ "--tint": tutor.tint, "--rest": "1.5deg" } as React.CSSProperties}
        >
          <figcaption className="note-card-head text-[clamp(26px,2.6vw,32px)] leading-[1.1] tracking-[-0.03em] font-bold pb-[12px]">
            {firstName}'s approach
          </figcaption>
          <blockquote className="note-card-body text-[20px] md:text-[22px] [--rule:34px] m-0">
            {tutor.teachingIntro}
          </blockquote>
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

      {/* Teaching Style: straight white notes on her own tint, like Home's */}
      <section className="px-6 md:px-[30px] py-[60px] md:py-[88px]" style={{ backgroundColor: tutor.tint }}>
        <div className="max-w-[1150px] mx-auto">
          <h2 className="font-serif font-bold tracking-[-0.03em] text-[clamp(32px,3.8vw,48px)] leading-[1.05] m-0 mb-[36px]">
            Learning with {firstName}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[24px]">
            {tutor.teachingPoints.map((point, index) => (
              <article
                key={`${point.title}-${index}`}
                className="note-card px-[22px] pt-[20px] pb-[18px]"
                style={{ "--tint": "hsl(var(--card))", "--rest": CARD_REST[index % CARD_REST.length] } as React.CSSProperties}
              >
                <h3 className="note-card-head font-serif font-bold text-[22px] leading-[1.2] tracking-[-0.02em] m-0 pb-[10px]">
                  {point.title}
                </h3>
                <p className="note-card-body text-[16px] m-0">
                  {point.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <TutorResources tutor={tutor} />

      <TutorEnquiry tutor={tutor} />
    </main>
  );
}
