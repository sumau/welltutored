---
name: Well Tutored
description: Women tutors for young women, each on a note card in her own colour.
colors:
  school-indigo: "hsl(247 44% 21%)"
  school-indigo-lift: "hsl(247 44% 42%)"
  page-white: "hsl(0 0% 100%)"
  mist: "hsl(250 22% 95%)"
  hairline: "hsl(248 18% 87%)"
  field-line: "hsl(248 18% 75%)"
  quiet-ink: "hsl(247 12% 40%)"
  error-red: "hsl(3 65% 43%)"
  intake-green: "#5EE08A"
  intake-amber: "#F2A93B"
  full-pale: "#D3D2DB"
  tint-coral: "#D98F7F"
  tint-marigold: "#D8B267"
  tint-lavender: "#B5A1CC"
  tint-teal: "#83B7B0"
  tint-leaf: "#9DBB83"
  tint-blue: "#8EA8CE"
typography:
  display:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "clamp(42px, 5.2vw, 72px)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  tutor-name:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "clamp(26px, 2.2vw, 30px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "clamp(32px, 4vw, 48px)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  lead:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.6
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
  rule-tutor-card: "26px"
  card-gap: "28px"
  gutter: "24px"
  gutter-wide: "30px"
  card-pad: "20px"
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
    padding: "20px 20px 14px"
  paper-note:
    backgroundColor: "{colors.page-white}"
    textColor: "{colors.school-indigo}"
    rounded: "{rounded.note}"
    padding: "20px 22px 18px"
  intake-pill-accepting:
    backgroundColor: "{colors.page-white}"
    textColor: "{colors.school-indigo}"
    rounded: "{rounded.pill}"
    height: "26px"
    padding: "0 11px"
  intake-pill-limited:
    backgroundColor: "{colors.page-white}"
    textColor: "{colors.school-indigo}"
    rounded: "{rounded.pill}"
    height: "26px"
    padding: "0 11px"
  intake-pill-full:
    backgroundColor: "{colors.full-pale}"
    textColor: "{colors.school-indigo}"
    rounded: "{rounded.pill}"
    height: "26px"
    padding: "0 11px"
  step-number:
    backgroundColor: "{colors.school-indigo}"
    textColor: "{colors.page-white}"
    rounded: "{rounded.pill}"
    size: "34px"
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
own words sit plainly on the white page, and its forms on a straight white
sheet. There are no photographs of students,
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
- Note cards: 3px corners, ruled lines, a soft paper shadow. A tutor's
  tinted card, and her own white notes, rest at a slight tilt; Well
  Tutored's white paper (forms) sits straight.
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
- **Full Pale** (`full-pale`): the fill of a "Full for now" pill, the same
  pale indigo the footer's white logo disc fades to on hover (80% white over
  School Indigo).

### Named Rules
**The Colour Belongs to Her Rule.** The only saturated colour on a public page
is a tutor's tint. No brand accent, no gradient, no coloured section
backgrounds that aren't hers.

**The Full Strength Rule.** A tint is used at full strength as a background,
never as a faint wash or a text colour.

**The White Paper Rule.** A white note in Well Tutored's own voice is
straight, never tilted, and never takes a tint: either would read as a
tutor's. A tutor's own words on white (her teaching points, on her tint) rest
at a tilt like her card.

## Typography

**Display Font:** Instrument Sans (with sans-serif)
**Body Font:** Instrument Sans (with sans-serif)

**Character:** one family carries everything. Weight and size do the work: 700
for names and the hero, 600 for section headings and labels, 400 for reading.

### Hierarchy
- **Display** (700, clamp 42–72px, 0.95, -0.04em; clamp 50–68px from `lg`,
  where it takes two lines in the grid's first box): the Home headline only.
- **Tutor name** (700, clamp 26–30px on her card, wrapping rather than cut short, 1.0, -0.04em; clamp 44–68px
  on her profile): the largest thing on her card.
- **Headline** (600–700, clamp 32–48px, 1.05, -0.03em): section headings
  ("How an enquiry works", "Learning with her name", the enquiry page's
  title). "About her name" on a profile is a step smaller (clamp 30–40px).
- **Lead** (400, 18px, 1.5–1.6): a tutor's summary under her name on her
  profile, and Home's tagline under the headline: its first clause
  semibold, on a line of its own except between `lg` and `xl`, where it
  runs on; the rest broken after "who" from `xl`.
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

The Home hero is the tutors. Below `lg` (1024px) the headline and tagline
stack above the tutor grid: one column, two from `md` (768px), 28px gaps.
From `lg` it is one grid of three columns, 32px apart and 44px between
rows, each row as tall as its tallest card: the
headline, with the tagline under it, takes the first box, straight on the
white page, and a tutor card fills each box after it. Five tutors
fill two rows, whole in the first screen of a 1440×900 laptop; six to eight
start a third, whose tops show above the fold. On a desktop screen under 760px tall the hero's top padding
tightens. "How an enquiry works" follows the grid directly; under its
three steps, a safeguarding line links to the Safeguarding dialog. Desktop
nav links collapse into a rounded dropdown card below `md`. The body never goes narrower than 320px.

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
  padding with 17px text on page sections; 14px text and 10px × 20px in
  the header; 16px × 28px, full width, for "Send enquiry".
- **Disabled:** "Send enquiry" fades to half opacity while sending.
- **Cursor:** every public button, links or not, shows the pointing hand.
- **Dialog close:** the Safeguarding and Privacy dialogs end in a primary
  "Close" pill; their corner × turns Indigo Lift on hover.
- **Hover / Focus:** fill lifts to Indigo Lift over a colour transition.
  Focus shows a 2px indigo outline, 3px offset.
- **Quiet links:** "Tutor sign in" and "All tutors" are 13–14px Quiet Ink,
  turning School Indigo on hover. Footer links underline on hover.

### Intake pills
- **Style:** on tutor cards, a pill: white with a faint border for "Taking
  students" and "Few spaces left", so neither looks like a button, and Full
  Pale with a 30% indigo border and indigo text for "Full for now", so a full
  tutor stands out on every tint. A dot leads each: green, amber, then indigo.
- **Rule:** the fill, dot and words carry the meaning, so each reads the same
  on any tint.
- **Profile:** a tutor's profile shows her intake as a plain line, the dot
  and the words with no fill or border, so the hero's only solid pill is its
  button.

### Note card (signature)
The one card on the public site, in `.note-card` in `src/index.css`.
- **Shape:** 3px corners, the soft paper shadow. A tinted card rests at a
  slight angle (between -1.5° and 1.5°, set per card with `--rest`), and so
  does a tutor's white teaching-point note; a white note in Well Tutored's
  voice leaves `--rest` unset and sits straight.
- **Head:** the title above a 2px rule at 55% indigo (`.note-card-head`).
- **Body:** text sits on faint ruled lines (16% indigo) every 28px; each line
  of text is one rule tall (`.note-card-body`, `--rule` to change the
  spacing).
- **Hover / Focus:** a card that is a link lifts 6px and straightens over
  320ms. One that isn't (her approach card, her "Learning with" notes) stays at
  rest, so it doesn't look pressable.

### Tutor card
- **Background:** the tutor's tint.
- **Content:** rules 26px apart: her name, her subject, and her university
  and qualification in smaller 12.5px type, each wrapping to a second line
  rather than being cut short; a blank rule; then four lines of
  her summary, about 165 characters. The profile has the rest. Cards in a
  row stretch to the tallest.
- **Intake:** her intake pill is stuck on the card's top edge at the right,
  half on and half off, like a label.
- **Shape:** landscape. It links to her profile, and an arrow at the right
  end of her name says so, since a phone never sees the hover lift. A tutor who is full comes
  after the ones taking students.
- **On Home:** below `lg`, centred rows of two, so a short last row sits in
  the middle rather than leaving a gap; from `lg`, the boxes of the hero's
  grid.
- **Arrival:** on Home the cards are dealt onto the page once, 90ms apart
  (`.deal-in`).
- **Loading:** while the tutors load, nothing shows: three invisible cards
  hold their space in the same grid, so the real cards land where they were
  and no grey cards flash up first. "Loading tutors..." is for screen
  readers only.

### Paper notes
White note cards on a tutor's tint section, for her teaching points under
"Learning with her name": a title over the 2px rule, then ruled body text,
each at a slight tilt because the words are hers. No white note in Well
Tutored's own voice is in use now; if one returns, the White Paper Rule
keeps it straight.

### Approach card
On a tutor's profile, her approach is a note card in her tint, headed
"Her name's approach", beside her name, subject, intake and summary.

### Enquiry card
On the enquiry page, once a tutor is chosen in the form, her tutor card
appears under the steps, and steps 1 and 3 name her, so it's clear who the
enquiry is for. It is
hidden below `lg` (1024px). It links back to her profile, and asks first if
the form has been filled in.

### Profile ending
A tutor's profile has no form of its own: the enquiry form lives only on
`/enquire`. The profile ends with a short section after her tinted band:
"Ask about lessons with her name" (a 600-weight Headline, like Home's "How
an enquiry works"), one line saying she replies herself, and a "Make an
enquiry" pill to `/enquire` with her chosen, like the hero's button and the
header's. From `md` the pill sits level with the heading, as on Home; on a
phone it follows the line, so the line isn't stranded under the button. The
Safeguarding note closes the section, as under Home's steps. A full tutor's
ending says she is full for now, links to the other tutors, and has no note.

### Enquiry steps
The three steps of an enquiry, worded once (`src/lib/enquiry-steps.ts`)
and shown two ways. On Home: three columns, each under a 2px indigo rule,
with a quiet "Step 1" label, a 20px title and muted text. Beside the form on
`/enquire`: a numbered list, each number white on a 34px indigo disc, the
title bold and the text muted on the same line.

### Safeguarding note
One fixed paragraph wherever an enquiry is described or sent: under Home's
steps, at the end of a tutor's profile, and under the form. A Hairline rule
above, an indigo shield icon, 15px muted text short enough to fit one line on
a laptop, ending in a bold underlined "Read how we keep students safe" that
opens the Safeguarding dialog and turns Indigo Lift on hover.

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
- **Style:** an 82px bar with the round indigo "w" disc (40px, the height of the header pill) and the lowercase
  wordmark "well tutored" on the left, which goes to the tutors at the top of
  Home, and the primary "Make an enquiry" pill and a quiet "Tutor sign
  in" link on the right. There is no separate tutors link: the logo is it.
- **Logo hover:** the disc and the wordmark lift to Indigo Lift together,
  like the buttons.
- **Mobile:** a toggle opens a 20px-cornered white card under the bar.
- **Favicon:** the same disc and bold "w" (`public/favicon.svg`, the "w"
  drawn as an outline), swapping to white with an indigo "w" in a dark
  browser theme, like the footer's.

### Footer
- **Style:** full-bleed School Indigo with white text, the one large dark
  surface on the site.
- **Hover:** links underline; the logo's white disc and wordmark fade to
  80% instead.

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
