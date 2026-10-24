// A tutor's intake, as the public site names it.
export const intakeLabels = {
  accepting: "Taking students",
  limited: "Few spaces left",
  full: "Full for now",
} as const;

// The dot beside a tutor's intake, in the public palette: plum when she's
// taking students, marigold when spaces are few, an empty ring when she's full.
export const intakeDotClasses = {
  accepting: "bg-foreground",
  limited: "bg-primary",
  full: "border-2 border-muted-foreground",
} as const;
