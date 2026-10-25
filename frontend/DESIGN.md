---
name: Well Tutored
description: Women tutors for young women, each in her own colour.
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
    fontSize: "clamp(46px, 7vw, 108px)"
    fontWeight: 700
    lineHeight: 0.92
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
  field: "10px"
  card: "20px"
  pill: "9999px"
spacing:
  card-gap: "16px"
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
    rounded: "{rounded.card}"
    padding: "30px"
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

**Creative North Star: "The Named Women"**

The tutors are the design. Each one appears as her name, set big and bold, on
a band of her own colour, with nothing between her and the reader. The page
around her is white and written in one dark indigo, so the only colour on
screen belongs to the women. There are no photographs of students, crests or
decorative illustration. A visitor remembers each tutor by her colour, not a
brand palette.

The voice is plain and grown-up, for a parent and a teenage girl reading the
same screen. Type is large and tight, shapes are soft and generously rounded,
and fills are solid. The result is friendly without being cute and serious
without being stuffy. Density is low: a few tutors, a few steps, a lot of
white.

The public site rejects four looks: old-school academic (crests, Latin, serif
parchment), pink and "girly" branding, stock photographs of smiling students,
and marketplace UI (search bars, filters, star ratings, price-sorted grids).

**Key Characteristics:**
- One ink colour, School Indigo, for all text, buttons and the footer.
- Colour comes only from each tutor's own tint, at full strength.
- Big, bold, tightly tracked sans headings in a single family.
- Flat surfaces, soft 20px cards, pill-shaped buttons and badges.
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
never as a faint wash or a text colour. Hover lightens it (75% tint, 25%
white) so the indigo text keeps its contrast.

## Typography

**Display Font:** Instrument Sans (with sans-serif)
**Body Font:** Instrument Sans (with sans-serif)

**Character:** one family carries everything. Weight and size do the work: 700
for names and the hero, 600 for section headings and labels, 400 for reading.

### Hierarchy
- **Display** (700, clamp 46–108px, 0.92, -0.04em): the Home hero headline
  only.
- **Tutor name** (700, clamp 36–46px, 0.95, -0.04em): a tutor's name on her
  card and profile. The largest thing in any card.
- **Headline** (600, clamp 32–48px, 1.05, -0.03em): section headings ("Meet
  the tutors", "How an enquiry works").
- **Lead** (500, clamp 20–26px, 1.35): the hero's supporting line, capped at
  22em.
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

Content sits in a centred column: 1210px for the nav, hero and profile, 1150px
for section content. Gutters are 24px on small screens and 30px from `md`
(768px). Sections breathe with 56px of vertical padding, 80px from `md`.

The tutor grid is one column, two from `sm` (640px) and three from `xl`
(1280px), with 16px gaps. The hero is one column, splitting into a 1.35 : 1
headline-and-lead pair from `lg` (1024px), aligned to the bottom, with a faint
2px rule (15% indigo) between them. Desktop nav links collapse into a rounded dropdown
card below `md`. The body never goes narrower than 320px.

## Elevation & Depth

The public site is flat. There are no shadows on cards, buttons or dialogs.
Depth comes from colour blocks: a tinted card on white, a white section
against a Mist band, the full-bleed indigo footer. Dialogs separate
themselves with a 60% indigo scrim, not a shadow.

**The Flat Colour Rule.** If something needs to stand out, give it a block of
colour or more space, never a drop shadow.

## Shapes

The form language is soft and round. Cards and dialogs have 20px corners,
fields 10px, and buttons, badges and the logo disc are full pills or circles.
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

### Tutor card (signature)
- **Corner Style:** 20px.
- **Background:** the tutor's tint at full strength.
- **Content:** her name (Tutor name style), subject (bold title), university
  and qualification, a three-line summary under a 20% indigo rule, and her
  intake pill pinned to the bottom.
- **Internal Padding:** 26px, 30px from `md`.
- **Hover / Focus:** the tint lightens by a quarter over 200ms. Nothing lifts
  or moves.

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
- **Do** keep public surfaces flat and separate them with colour or space.
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
- **Don't** add drop shadows, gradients or a brand accent colour to public
  pages.
- **Don't** use a tint as text colour or as a pale wash.
