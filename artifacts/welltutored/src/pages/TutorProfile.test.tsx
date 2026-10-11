import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Tutor } from "@workspace/api-client-react";
import { TutorAvailability, TutorEnquiry } from "./TutorProfile";

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
