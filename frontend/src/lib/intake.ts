// A tutor's intake, as the public site names it.
export const intakeLabels = {
  accepting: "Taking students",
  limited: "Few spaces left",
  full: "Full for now",
} as const;

// A tutor's intake as a rubber stamp. The fill steps down with availability,
// so it reads the same on any tint without relying on colour: solid ink,
// then white, then only a faded outline.
export const intakeStampClasses = {
  accepting: "stamp bg-foreground text-background",
  limited: "stamp bg-white text-foreground",
  full: "stamp border-foreground/50 text-foreground",
} as const;
