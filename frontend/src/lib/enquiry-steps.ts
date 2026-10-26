// The three steps of an enquiry, in the same words on Home and /enquire. Only
// where the tutor is chosen changes, and on /enquire, once she is chosen, her
// name.
export type EnquiryStep = { title: string; text: string };

export function enquirySteps(where: "home" | "enquire", chosenFirstName?: string): EnquiryStep[] {
  return [
    {
      title: "Choose a tutor",
      text: where === "home"
        ? "Pick from the list above. Her profile shows how she teaches."
        : chosenFirstName
          ? `You've chosen ${chosenFirstName}. You can change this in the form.`
          : "Pick one in the form. Her profile shows how she teaches.",
    },
    {
      title: "Tell us about the student",
      text: "A parent or guardian sends the enquiry. You don't need an account.",
    },
    {
      title: chosenFirstName ? `${chosenFirstName} replies` : "She replies",
      text: `${chosenFirstName ?? "She"} reads every enquiry and replies herself.`,
    },
  ];
}
