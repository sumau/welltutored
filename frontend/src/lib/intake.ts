// A tutor's intake, as the public site names it.
export const intakeLabels = {
  accepting: "Taking students",
  limited: "Few spaces left",
  full: "Full for now",
} as const;

// A tutor's intake as a pill. The fill steps down with availability, so it
// reads the same on any tint: solid, then white, then only an outline. Every
// pill has the same border width, so all three are the same height, and the
// white one keeps its edge on a white page.
export const intakePillClasses = {
  accepting: "border-[1.5px] border-foreground bg-foreground text-background",
  limited: "border-[1.5px] border-foreground/15 bg-white text-foreground",
  full: "border-[1.5px] border-foreground/50 text-foreground",
} as const;

// The dot inside the pill. A full tutor's pill has none.
export const intakePillDotClasses = {
  accepting: "bg-[#5EE08A]",
  limited: "bg-[#F2A93B]",
  full: "hidden",
} as const;
