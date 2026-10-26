---
name: Well Tutored
description: Women tutors for young women, each on a note card in her own colour.
colors:
  school-indigo: "hsl(247 44% 21%)"
  school-indigo-lift: "hsl(247 44% 34%)"
  page-white: "hsl(0 0% 100%)"
  mist: "hsl(250 22% 95%)"
  hairline: "hsl(248 18% 87%)"
  field-line: "hsl(248 18% 75%)"
  quiet-ink: "hsl(247 12% 40%)"
  error-red: "hsl(3 65% 43%)"
  intake-green: "#5EE08A"
  intake-amber: "#F2A93B"
  tint-coral: "#D98F7F"
  tint-marigold: "#D8B267"
  tint-lavender: "#B5A1CC"
  tint-teal: "#83B7B0"
  tint-leaf: "#9DBB83"
  tint-blue: "#8EA8CE"
typography:
  display:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "clamp(38px, 5vw, 68px)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  tutor-name:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "clamp(36px, 3.6vw, 46px)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "clamp(32px, 4vw, 48px)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  lead:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "clamp(20px, 1.9vw, 26px)"
    fontWeight: 500
    lineHeight: 1.35
  title:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  note: "3px"
  field: "10px"
  panel: "20px"
  pill: "9999px"
spacing:
  rule: "28px"
  card-gap: "28px"
  gutter: "24px"
  gutter-wide: "30px"
  card-pad: "26px"
  card-pad-wide: "30px"
  section: "56px"
  section-wide: "80px"
components:
  button-primary:
    backgroundColor: "{colors.school-indigo}"
    textColor: "{colors.page-white}"
    rounded: "{rounded.pill}"
    padding: "14px 24px"
  button-primary-hover:
    backgroundColor: "{colors.school-indigo-lift}"
  tutor-card:
    backgroundColor: "{colors.tint-blue}"
    textColor: "{colors.school-indigo}"
    rounded: "{rounded.note}"
    padding: "24px 26px 20px"
  paper-note:
    backgroundColor: "{colors.page-white}"
    textColor: "{colors.school-indigo}"
    rounded: "{rounded.note}"
    padding: "14px 16px"
  intake-pill-accepting:
    backgroundColor: "{colors.school-indigo}"
    textColor: "{colors.page-white}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  intake-pill-limited:
    backgroundColor: "{colors.page-white}"
    textColor: "{colors.school-indigo}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  input-field:
    backgroundColor: "{colors.page-white}"
    textColor: "{colors.school-indigo}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
---

# Design System: Well Tutored

Tokens above are the public site's, scoped to `.public-site` in
`src/index.css`. The Workspace keeps its own palette; see the end of
Components.

## Overview

**Creative North Star: "The Named Women, on note cards"**

The tutors are the design. Each one appears as a ruled note card in her own
colour, her name set big and bold above a heavier rule, laid on the page at a
slight angle as if on a desk. The page around her is white and written in one
dark indigo, so the only colour on screen belongs to the women. Well Tutored's
own words go on plain white paper notes. There are no photographs of students,
crests or decorative illustration. A visitor remembers each tutor by her
colour, not a brand palette.

The voice is plain and grown-up, for a parent and a teenage girl reading the
same screen. Type is large and tight, cards are nearly square-cornered paper
with faint ruled lines, and buttons and badges are soft pills. The result is friendly without being cute and serious
without being stuffy. Density is low: a few tutors, a few steps, a lot of
white.

The public site rejects four looks: old-school academic (crests, Latin, serif
parchment), pink and "girly" branding, stock photographs of smiling students,
and marketplace UI (search bars, filters, star ratings, price-sorted grids).

**Key Characteristics:**
- One ink colour, School Indigo, for all text, buttons and the footer.
- Colour comes only from each tutor's own tint, at full strength.
- Big, bold, tightly tracked sans headings in a single family.
- Note cards: 3px corners, ruled lines, a soft paper shadow, a slight resting
  tilt that straightens on hover.
- Pill-shaped buttons and badges; everything else is flat.
- Low density and generous white space.

## Colors

A white page in one dark ink, lit only by the tutors' own colours.

### Primary
- **School Indigo** (`school-indigo`): all text, headings, the primary button,
  the focus ring, the logo disc and the full-bleed footer, where it becomes the
  background. Hover on solid indigo lifts to **Indigo Lift**
  (`school-indigo-lift`).

### Tertiary: the tutor tints
- **Tutor tints** (20 values in `src/lib/tutor-accents.ts`: Coral, Marigold,
  Lavender, Teal, Leaf, Blue, Rose, Plum, Sage, Slate, Terracotta, Ochre,
  Mauve, Periwinkle, Seafoam, Moss, Orchid, Steel, Berry, Olive). Each tutor
  picks one in the Workspace. All are mid-tone and muted, so School Indigo
  text stays readable on every one. Six are listed in the frontmatter as
  representatives; the file is the source of truth. Blue is the fallback.

### Neutral
- **Page White** (`page-white`): the page, inputs and dialogs.
- **Mist** (`mist`): the faint lavender-grey behind secondary surfaces.
- **Hairline** (`hairline`): borders and dividers.
- **Field Line** (`field-line`): input borders, a step darker than Hairline so
  fields read as fields.
- **Quiet Ink** (`quiet-ink`): supporting copy, step labels, the Workspace
  sign-in link.
- **Error Red** (`error-red`): validation messages and the submit-failure box
  only.

### Status
- **Intake Green** and **Intake Amber**: the small dot inside a "Taking
  students" or "Few spaces left" pill. Never used as fills or text.

### Named Rules
**The Colour Belongs to Her Rule.** The only saturated colour on a public page
is a tutor's tint. No brand accent, no gradient, no coloured section
backgrounds that aren't hers.

**The Full Strength Rule.** A tint is used at full strength as a background,
never as a faint wash or a text colour.

**The White Paper Rule.** A note that speaks for Well Tutored rather than one
tutor (the Home notes, a tutor's teaching points) is white, never a tint. A
tint on it would read as that tutor's.

## Typography

**Display Font:** Instrument Sans (with sans-serif)
**Body Font:** Instrument Sans (with sans-serif)

**Character:** one family carries everything. Weight and size do the work: 700
for names and the hero, 600 for section headings and labels, 400 for reading.

### Hierarchy
- **Display** (700, clamp 38–68px, 0.95, -0.04em): the Home headline only,
  kept to one line on desktop so the tutor cards below it lead.
- **Tutor name** (700, clamp 30–36px on her card, 1.0, -0.04em; clamp 44–68px
  on her profile): the largest thing on her card.
- **Headline** (600, clamp 32–48px, 1.05, -0.03em): section headings ("How
  an enquiry works").
- **Lead** (500, clamp 19–24px, 1.35): the line under the Home headline.
- **Title** (600–700, 19–20px, 1.35): a tutor's subject, step titles.
- **Body** (400, 16px, 1.5–1.6): summaries, profile text. Lines capped around
  46em on profiles.
- **Label** (600, 14–15px): nav links, form labels, pills, step numbers.

### Named Rules
**The Tight Heading Rule.** Every public h1–h3 is bold, tracked tighter
(-0.03em or more) and set with balanced wrapping. Loose, light headings read
as a different site.

**The One Family Rule.** The public site uses Instrument Sans only. Fraunces
and DM Sans belong to the Workspace; even `font-serif` resolves to Instrument
Sans inside `.public-site`.

## Layout

Content sits in a centred column: 1210px for the nav and profile, 1150px
for section content. Gutters are 24px on small screens and 30px from `md`
(768px). Sections breathe with 56px of vertical padding, 80px from `md`.

The tutor grid is one column, two from `md` (768px, capped at 908px wide) and
three from `xl` (1280px), with 28px column and 36px row gaps. Cards are square
from `sm` and grow if her text needs more room.

The Home hero is the tutors: a one-line headline and its lead, then the tutor
grid straight away, so the first cards show in the first screen at every
width. The nav's "Meet the tutors" scrolls to it. The three paper notes come
after the grid, square and side by side from `sm` (640px) in the grid's first
908px, and stacked below `sm`. Desktop nav links collapse into a rounded dropdown
card below `md`. The body never goes narrower than 320px.

## Elevation & Depth

Note cards and paper sheets are the only things with depth: a 1px contact line and a soft
shadow below (`0 16px 30px -18px`, 45% indigo), deepening on hover. Buttons,
fields, sections and dialogs stay flat; dialogs separate themselves with a
60% indigo scrim.

**The Paper Only Rule.** A shadow means paper: a note card or a sheet. Anything else that needs
to stand out gets a block of colour or more space.

## Shapes

Note cards and paper sheets have 3px corners, like cut card. Dialogs and the mobile menu card
keep 20px corners, fields 10px, and buttons, badges and the logo disc are full
pills or circles.
Borders are 1px hairlines; intake pills use 1.5px so all three states are the
same height. Section dividers are straight rules: 1px hairlines, or 2px
indigo above each enquiry step.

## Components

### Buttons
- **Shape:** full pill.
- **Primary:** School Indigo fill, white text, 600 weight, 14px × 24px
  padding (17px text on Home, 16px × 28px in the enquiry form).
- **Hover / Focus:** fill lifts to Indigo Lift over a colour transition.
  Focus shows a 2px indigo outline, 3px offset.
- **Text links:** in the nav, no underline at rest; a 2px indigo underline,
  6px offset, on hover.

### Intake pills
- **Style:** a pill whose fill steps down as space runs out: solid indigo for
  "Taking students", white with a faint border for "Few spaces left", outline
  only for "Full for now". A green or amber dot leads the first two.
- **Rule:** the fill carries the meaning, so it reads the same on any tint.

### Note card (signature)
The one card on the public site, in `.note-card` in `src/index.css`.
- **Shape:** 3px corners, the soft paper shadow, resting at a slight angle
  (between -1.5° and 1.5°, set per card with `--rest`).
- **Head:** the title above a 2px rule at 55% indigo (`.note-card-head`).
- **Body:** text sits on faint ruled lines (16% indigo) every 28px; each line
  of text is one rule tall (`.note-card-body`, `--rule` to change the
  spacing).
- **Hover / Focus:** lifts 6px and straightens over 320ms.

### Tutor card
- **Background:** the tutor's tint.
- **Content:** her name with her intake pill beside it, then on the rules her
  subject, university and qualification, and her summary (up to five lines).
- **Shape:** square from `sm`. It links to her profile.
- **Arrival:** on Home the cards are dealt onto the page once, 90ms apart
  (`.deal-in`).

### Paper notes
White note cards with a 1px Hairline edge, for Well Tutored's own words:
- **Home:** three notes ("Small and hand-picked", "How we teach",
  "Helping young women grow") after the tutors, square and ruled to the
  bottom.
- **Profile, "Learning with":** her teaching points, on her tint section.

### Approach card
On a tutor's profile, her approach is a note card in her tint, headed
"Her name's approach", beside her name, subject, intake and summary.

### Enquiry card
On the enquiry page, once a tutor is chosen in the form, her tutor card
appears under the steps, so it's clear who the enquiry is for. It is
hidden below `md` and isn't a link, so the form isn't left by accident.

### Paper sheet
Forms sit on `.paper-sheet`: white, a Hairline edge, 3px corners and the note
card shadow, but straight and unruled, so fields stay easy to fill in.

### Inputs / Fields
- **Style:** white field, 1px Field Line border, 10px corners, 12px × 14px
  padding, 16px text. Labels sit above in 14px semibold.
- **Focus:** the border turns School Indigo.
- **Error:** a plain Error Red message under the field; a submit failure shows
  in a pale red box with a red border.

### Navigation
- **Style:** an 82px bar with the round indigo "w" disc and the lowercase
  wordmark "well tutored" on the left, and "Meet the tutors", the primary
  "Make an enquiry" pill and a quiet "Workspace sign in" link on the right.
- **Mobile:** a toggle opens a 20px-cornered white card under the bar.

### Footer
- **Style:** full-bleed School Indigo with white text, the one large dark
  surface on the site.

### The Workspace
The Workspace is a separate, older register: warm parchment (`hsl(40 44%
94%)`), ink (`hsl(218 18% 18%)`), a burnt-orange "pimento" primary (`hsl(15
58% 48%)`), Fraunces for headings and DM Sans for text, and square corners
throughout (`--radius: 0`). It is defined on `:root` in `src/index.css`. New
Workspace screens follow it and use the shadcn components in
`src/components/ui`; they don't borrow the public site's pills or tints,
except where they preview a tutor's tint.

## Do's and Don'ts

### Do:
- **Do** let each tutor's tint be the only colour on the page, at full
  strength.
- **Do** set tutors' names large and bold; the name is the headline of her
  card.
- **Do** use School Indigo for every piece of text and every primary button.
- **Do** use the note card for any card, and keep every other surface flat.
- **Do** keep public headings in Instrument Sans, bold and tightly tracked.

### Don't:
- **Don't** drift towards old-school academic: no crests, Latin mottos, serif
  parchment or bookplate framing on the public site.
- **Don't** use pink-and-pretty branding, hearts or sparkles; the readers are
  young women, not little girls.
- **Don't** use stock photographs of smiling students. Only the real tutors
  represent Well Tutored.
- **Don't** add marketplace UI: search bars, filters, star ratings or
  price-sorted grids.
- **Don't** add shadows outside paper, gradients or a brand accent
  colour to public pages.
- **Don't** use a tint as text colour or as a pale wash.
