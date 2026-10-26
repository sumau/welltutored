import assert from "node:assert/strict";
import test from "node:test";
import { enquirySteps } from "./enquiry-steps";

test("Home and /enquire give the same steps, differing only in where she is chosen", () => {
  const home = enquirySteps("home");
  const enquire = enquirySteps("enquire");

  assert.deepEqual(home.map((step) => step.title), ["Choose a tutor", "Tell us about the student", "She replies"]);
  assert.deepEqual(enquire.map((step) => step.title), home.map((step) => step.title));
  assert.notEqual(home[0].text, enquire[0].text);
  assert.deepEqual(home.slice(1), enquire.slice(1));
});

test("/enquire's first and last steps name the tutor once she is chosen", () => {
  const chosen = enquirySteps("enquire", "Maya");

  assert.equal(chosen[0].text, "You've chosen Maya. You can change this in the form.");
  assert.equal(chosen[1].text, enquirySteps("enquire")[1].text);
  assert.equal(chosen[2].title, "Maya replies");
  assert.equal(chosen[2].text, "Maya reads every enquiry and replies herself.");
});
