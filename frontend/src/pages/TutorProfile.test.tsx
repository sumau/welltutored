import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Tutor } from "@workspace/api-client-react";
import { TutorAvailability, TutorBackground, TutorEnquiry, TutorResources } from "./TutorProfile";

const fullTutor: Tutor = {
  id: 2,
  slug: "maya-shah",
  name: "Maya Shah",
  firstName: "Maya",
  lastName: "Shah",
  initials: "MS",
  subject: "Mathematics",
  support: "GCSE Mathematics",
  profileSummary: "A thoughtful mathematics tutor.",
  university: "University of Cambridge",
  qualification: "BA Mathematics",
  bio: "Maya helps students build confidence.",
  experience: "Sep 2018 – Present | Maths teacher, Example School",
  education: "Sep 2014 – Jun 2017 | BA Mathematics, University of Cambridge",
  teachingIntro: "Clear explanations and practical guidance.",
  teachingPoints: [{ title: "Clarity", body: "Lessons are structured around the student's goals." }],
  rate: 45,
  availability: "Weekday evenings after 4pm",
  intake: "full",
  tint: "#123456",
  resources: [],
};

test("full tutor profiles explain the enquiry restriction without rendering a form", () => {
  const markup = renderToStaticMarkup(<TutorEnquiry tutor={fullTutor} />);

  assert.match(markup, /data-testid="tutor-enquiry-unavailable"/);
  assert.match(markup, /Maya Shah is not currently accepting enquiries/);
  assert.doesNotMatch(markup, /data-testid="enquiry-form"/);
  assert.doesNotMatch(markup, /data-testid="button-submit-enquiry"/);
  assert.doesNotMatch(markup, /<form/);
});
test("tutor profiles show availability when the tutor has given it", () => {
  const markup = renderToStaticMarkup(<TutorAvailability tutor={fullTutor} />);

  assert.match(markup, /data-testid="tutor-availability"/);
  assert.match(markup, /Availability/);
  assert.match(markup, /Weekday evenings after 4pm/);
});

test("tutor profiles hide the availability row when it is empty", () => {
  const markup = renderToStaticMarkup(
    <TutorAvailability tutor={{ ...fullTutor, availability: "" }} />,
  );

  assert.equal(markup, "");
});

test("tutor profiles show experience and education when the tutor has given them", () => {
  const markup = renderToStaticMarkup(<TutorBackground tutor={fullTutor} />);

  assert.match(markup, /data-testid="tutor-experience"/);
  assert.match(markup, /Maths teacher, Example School/);
  assert.match(markup, /data-testid="tutor-education"/);
  assert.match(markup, /BA Mathematics, University of Cambridge/);
});

test("tutor profiles show only the background the tutor has given", () => {
  const markup = renderToStaticMarkup(
    <TutorBackground tutor={{ ...fullTutor, experience: "" }} />,
  );

  assert.doesNotMatch(markup, /data-testid="tutor-experience"/);
  assert.match(markup, /data-testid="tutor-education"/);
});

test("tutor profiles hide the background section when both are empty", () => {
  const markup = renderToStaticMarkup(
    <TutorBackground tutor={{ ...fullTutor, experience: "", education: "" }} />,
  );

  assert.equal(markup, "");
});

test("tutor profiles hide published resources while public resources are off", () => {
  const markup = renderToStaticMarkup(
    <TutorResources
      tutor={{
        ...fullTutor,
        resources: [
          {
            id: 7,
            slug: "proof-by-induction",
            title: "Proof by induction",
            subject: "Mathematics",
            level: "A-level",
            type: "Guide",
            excerpt: "A short guide.",
            readMinutes: 5,
            tutorSlug: fullTutor.slug,
            tutorName: fullTutor.name,
            tutorTint: fullTutor.tint,
            publishedAt: "2026-10-01T00:00:00.000Z",
            tint: "#654321",
          },
        ],
      }}
    />,
  );

  assert.equal(markup, "");
});
