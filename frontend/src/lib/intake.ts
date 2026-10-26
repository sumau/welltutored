// A tutor's intake, as the public site names it.
export const intakeLabels = {
  accepting: "Taking students",
  limited: "Few spaces left",
  full: "Full for now",
} as const;

// A tutor's intake as a pill, the same on any tint: white while she takes
// students, so it reads as a label rather than a button, and for a full
// tutor the pale indigo of the footer logo's hover (#D3D2DB: 80% white over
// School Indigo) with a firmer edge, so it holds on every tint. Every pill
// has the same border width, so all three are the same height, and the
// white ones keep their edge on a white page.
export const intakePillClasses = {
  accepting: "border-[1.5px] border-foreground/15 bg-white text-foreground",
  limited: "border-[1.5px] border-foreground/15 bg-white text-foreground",
  full: "border-[1.5px] border-foreground/30 bg-[#D3D2DB] text-foreground",
} as const;

// The dot inside the pill: green, amber, then indigo for a full tutor.
export const intakePillDotClasses = {
  accepting: "bg-[#5EE08A]",
  limited: "bg-[#F2A93B]",
  full: "bg-foreground",
} as const;
