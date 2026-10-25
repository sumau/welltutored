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

// A tutor's intake as a pill. The fill steps down with availability, so it
// reads the same on any tint: solid, then white, then only an outline.
export const intakePillClasses = {
  accepting: "bg-foreground text-background",
  limited: "bg-white text-foreground",
  full: "border-[1.5px] border-foreground/50 text-foreground/80",
} as const;

// The dot inside the pill. A full tutor's pill has none.
export const intakePillDotClasses = {
  accepting: "bg-[#5EE08A]",
  limited: "bg-[#F2A93B]",
  full: "hidden",
} as const;
