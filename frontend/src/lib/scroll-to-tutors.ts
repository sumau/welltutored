// Scroll Home's tutor section into view and move focus to it, so keyboard and
// screen reader users land in the same place. Arriving from another page
// jumps; a click on Home glides, unless the visitor asks for reduced motion.
export function scrollToTutors(behavior: ScrollBehavior = "smooth") {
  const target = document.getElementById("tutors");
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  target?.scrollIntoView({ behavior: reduceMotion ? "auto" : behavior });
  target?.focus({ preventScroll: true });
}
