---
name: TempoDojo Studio
description: A metronome typeset as a page of a drum method book.
colors:
  paper: "#f2f2ee"
  ink: "#141414"
  ink-soft: "#55554f"
  ink-ghost: "#74746d"
  rule-soft: "#b9b9b2"
  pencil: "#ff4f00"
  select: "#008fa6"
  paper-night: "#141413"
  ink-night: "#ecebe4"
  ink-soft-night: "#a9a8a0"
  ink-ghost-night: "#8d8c85"
  rule-soft-night: "#4d4d48"
  pencil-night: "#ff6a26"
  select-night: "#2bb3c8"
typography:
  display:
    fontFamily: "Libre Caslon Text, Georgia, serif"
    fontSize: "clamp(7.5rem, 30vw, 11rem)"
    fontWeight: 700
    lineHeight: 0.86
    letterSpacing: "-0.015em"
    fontFeature: "lnum, tnum"
  headline:
    fontFamily: "Libre Caslon Text, Georgia, serif"
    fontSize: "clamp(2rem, 9vw, 3rem)"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "lnum, tnum"
  title:
    fontFamily: "Libre Caslon Text, Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.1
  tempo-line:
    fontFamily: "Libre Caslon Text, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.2
  body:
    fontFamily: "Libre Caslon Text, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.2
  count:
    fontFamily: "Libre Caslon Text, Georgia, serif"
    fontSize: "1.375rem"
    fontWeight: 400
    lineHeight: 1
    fontFeature: "lnum"
  label:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.12em"
  control:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "tnum"
  control-caps:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.16em"
rounded:
  none: "0px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "18px"
  lg: "24px"
  gutter: "clamp(16px, 5.5vw, 32px)"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.control-caps}"
    rounded: "{rounded.none}"
    height: "84px"
  button-primary-pressed:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  button-nudge:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    height: "64px"
  button-nudge-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-done:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    height: "48px"
    padding: "0 18px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    height: "48px"
    padding: "0 16px"
  button-text-disabled:
    textColor: "{colors.rule-soft}"
  choice:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    height: "48px"
    padding: "0 14px"
  row-list-item:
    textColor: "{colors.ink}"
    padding: "12px 0"
  empty-note:
    textColor: "{colors.ink-soft}"
    typography: "{typography.body}"
  input-number:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    height: "52px"
    padding: "0 12px"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    width: "min(640px, 100%)"
---

# Design System: TempoDojo Studio

## Overview

**Creative North Star: "The Stick Control Page"**

The interface is a page of an engraved drum method book, set to be read from the drum throne 1.5 to 2 metres away. The tempo is the page heading, set as a huge Caslon numeral; the bar is a line of real engraved notation between two heavy rules; the controls are square, outlined, and set in a heavy grotesque at the foot of the page. Everything is ink on paper. There is no chassis, no glow, no LED, no gradient: the category default of glowing dots around a thin numeral on black is the thing this system refuses.

Density is low and the type is very large, because the reader is far away and holding sticks. The page has one solid black primary (Play/Stop), one orange pencil mark that circles the live note on every beat, and one teal for selection and focus. A night page prints the same book in reverse for dim practice rooms: the tokens swap, the rules do not.

**Key Characteristics:**
- Cool off-white paper and engraving black; colour is reserved for two jobs only.
- Libre Caslon Text for everything read (numerals, headings, notation counts, choice text); Libre Franklin for labels and control verbs.
- Notation drawn as filled engraved shapes, not icons: wedge accent, tapered stem, rotated notehead, crescent ghost parentheses, quarter rest.
- Square corners everywhere, 2px ink outlines, 2px heavy rules around the notation, 1px rules under heads.
- State never carried by colour alone: accents differ in shape, ghosts in size and parentheses, play state in inversion and label.

## Colors

A two-tone engraving palette with one pencil and one selection colour, each restricted to a single job.

### Primary
- **Engraving Black** (`ink`): all text, notation, outlines, heavy rules, and the solid primary button fill.

### Secondary
- **Selection Teal** (`select`): focus outline (3px, 3px offset), the checked choice's border and inset 5px underline, text selection. Nothing decorative.

### Tertiary
- **Orange Pencil** (`pencil`): only the hand-drawn ring around the live note (and the app icon's ring). It marks "now"; it is never a button, a label, or an accent glyph.

### Neutral
- **Cool Paper** (`paper`): page and sheet background; text colour on the black primary.
- **Soft Ink** (`ink-soft`): secondary text (trainer line, beat counts, field labels).
- **Ghost Ink** (`ink-ghost`): ghost and muted noteheads only; a graphic tone, not a text tone.
- **Pencil Rule** (`rule-soft`): underlines on tappable text, dividers between fields, disabled control outlines and text.
- **Night page** (`*-night` tokens): the same roles reversed, applied by `prefers-color-scheme: dark` or `data-theme="dark"`; pencil and teal lift slightly to hold contrast on near-black.

### Named Rules
**The One Pencil Rule.** Orange appears only as the ring on the note being played. If orange is on screen while the metronome is stopped, something is wrong.

**The Teal Means Chosen Rule.** Teal marks selection and keyboard focus, and nothing else. A checked choice also gains a bold weight and an inset underline, so it never relies on hue.

## Typography

**Display Font:** Libre Caslon Text (with Georgia, serif), weights 400 and 700
**Label Font:** Libre Franklin (with system-ui, sans-serif), weights 500 and 800

**Character:** A bookish old-style serif for what the drummer reads, against a heavy, wide-tracked grotesque for what they press. The pairing is the method book's text face and its printed captions.

### Hierarchy
- **Display** (700, clamp(7.5rem, 30vw, 11rem), 0.86): the BPM numeral, lining tabular figures; grows to clamp(11rem, 19vw, 16rem) on iPad landscape. "BPM" sits on its baseline in Franklin 800 1.375rem, 0.1em tracking.
- **Headline** (700, clamp(2rem, 9vw, 3rem), 1): the bar counter under the staff ("Bar N" left, time right), tabular.
- **Title** (700, 1.75rem, 1.1): sheet titles; also stepper values.
- **Tempo line** (400, 1.5rem, 1.2): the metronome mark line ("♩ = 96 · 4/4 · sixteenths"), underlined in Pencil Rule as a tappable line of text.
- **Body** (400–500, 1.125rem): trainer summary, segmented choice text. Check labels set larger (700, 1.375rem).
- **Count** (400, 1.375rem, 1): beat numbers under each note, Soft Ink.
- **Label** (Franklin 500, 0.8125rem, 0.12em, uppercase): the running head and field labels.
- **Control** (Franklin 800, 1.5rem, tabular): nudge buttons; Play/Stop at 1.75rem with 0.16em tracking, uppercase; Done at 1rem, 0.1em, uppercase.

### Named Rules
**The Read-In-Caslon Rule.** Any number or word the drummer reads for meaning (tempo, bar, time, counts, option names, sheet titles) is Caslon. Franklin is for labels and verbs on controls.

**The Running Head Rule.** Uppercase tracked Franklin belongs to the page's running head and to form-field labels, as a printed book uses it. It does not appear as a decorative line above headings.

## Layout

A single centred page column, max 640px, side gutter clamp(16px, 5.5vw, 32px), filling the dynamic viewport height as four stacked areas: running head, heading (tempo), sticking line (notation and bar counter), transport. The transport sits at the bottom in the thumb zone with safe-area padding.

- **Notation grid:** one column per pulse, capped at 8 columns; note height is min(clamp(110px, 19vh, 176px), column width × 1.6) so noteheads always land on the staff line. On narrow containers (≤560px) bars longer than 4 beats wrap into rows of 4 at a reduced height; bar lines open and close the whole bar only, never each row.
- **Transport:** a five-cell nudge row (1fr 1fr 1.4fr 1fr 1fr, Tap in the wider centre cell), 8px gaps, above a full-width Play/Stop.
- **iPad landscape (≥900px, landscape):** the page regroups into a two-column spread (1.5fr page, 1fr transport, 56px gap, max 1180px); nudges become a 2-column grid with Tap spanning the top; sheets become a 460px right-side panel.
- **Rhythm:** 8px between controls, 12px inside fields, 18px field padding, 24px section padding; vertical breathing room above the heading and notation uses viewport-relative clamps.

## Elevation & Depth

Flat. Depth is printed, not lit: rules and outlines separate regions. The one exception is the modal sheet, which lifts above the page with a soft ink shadow and a 28% ink scrim, because it is a sheet laid over the book.

### Shadow Vocabulary
- **Sheet lift** (`box-shadow: 0 -12px 32px color-mix(in srgb, var(--ink) 18%, transparent)`): bottom sheets only.
- **Selected underline** (`box-shadow: inset 0 -5px 0 var(--select)`): a printed mark, not elevation; the checked choice.

### Named Rules
**The Printed Depth Rule.** No shadows on page elements. Separation comes from 2px ink rules and outlines; only an overlay sheet casts a shadow.

## Shapes

Square-cornered throughout (0 radius): buttons, choices, inputs, steppers, checkboxes, sheets. Controls are drawn as 2px Engraving Black outlines on paper. Rules have three weights: 2px ink around the notation and on the sheet's leading edge, 1px ink under the running head and sheet head, 1px Pencil Rule between fields. The only curves are in the notation and in the pencil ring, which is a hand-drawn, open, slightly rotated (−9°) loop.

## Components

### Buttons
- **Primary (Play/Stop):** one per screen. Solid ink, paper text, 84px tall, full width, uppercase Franklin. Pressed state (playing) inverts to paper fill with ink text and an ink outline; the label also changes to Stop.
- **Nudge (−5 −1 Tap +1 +5):** 64px minimum, 2px ink outline on paper, Franklin 800. On press they invert to ink fill (80ms ease-out). Tap is uppercase at 1.25rem.
- **Done:** sheet dismiss, solid ink, 48px, uppercase.
- **Text button:** 2px ink outline, no fill, 48px, Franklin 800 1rem; disabled drops outline and text to Pencil Rule.
- **Text link (running head, tempo line, trainer line):** text with a Pencil Rule underline (offset 5–6px), no box. Opens a sheet.

### Chips (Segmented choices)
- **Style:** 48px tall, 56px minimum, 2px ink outline, Caslon 500 1.125rem, wrapping row with 8px gaps.
- **Selected:** teal border, inset 5px teal underline, Caslon 700. Native radios underneath.

### Inputs / Fields
- **Number input:** 52px, 2px ink outline, square, Caslon 700 1.5rem tabular; label above in uppercase Franklin, Soft Ink.
- **Stepper:** 2px outlined bar, 56px − / + cells either side of a Caslon value; disabled ends go Pencil Rule.
- **Checkbox:** a 26px square 2px outline; checked fills ink with a 10px paper square inside. Label in Caslon 700 1.375rem.
- **Focus:** 3px teal outline, 3px offset, on every focusable element.

### Sheet
- **Style:** bottom sheet up to 640px wide and 88dvh tall, paper, 2px ink top edge, Sheet lift shadow, rising 24px over 220ms (cubic-bezier(0.16, 1, 0.3, 1)) over a 160ms scrim fade; side panel with a 2px left edge on iPad landscape. Head: Caslon title left, Done right, 1px ink rule under. Body: fields separated by 1px Pencil Rule.

### Row List
- **Style:** a bare list of saved items inside a sheet field, no bullets. Each row is a 12px-padded grid: Caslon 700 1.25rem title over a Franklin 500 0.8125rem uppercase meta line (0.08em tracking, Soft Ink, tabular figures, e.g. "30 BPM · 8/4"), with its actions as text buttons on the right (8px apart, spanning both lines). Rows are separated by 1px Pencil Rule; the last row has none.

### Empty Note
- **Style:** the message shown in place of an empty list. Caslon 400 1.125rem, 1.4 line height, Soft Ink, no margin; one plain sentence saying what to do next.

### Sticking Line (signature)
A real percussion staff: one 2px staff line through the noteheads, 2px heavy rules above and below the line, 52px bar lines at the bar's opening and close. Each beat is a tappable engraved note (min 44px wide) that cycles accent → normal → ghost → rest. Accent adds a wedge above; ghost is 82% scale in Ghost Ink inside crescent parentheses; mute is a quarter rest in Ghost Ink. When the bar is a gap (muted) bar, glyphs drop to 35% opacity. Counts sit under each note in Caslon.

### Pencil Ring (signature)
An open, hand-drawn orange loop rotated −9°, 46% of the note height, centred on the live notehead. It redraws in 90ms (stroke-dash, cubic-bezier(0.16, 1, 0.3, 1)) on every beat; 5px stroke, 7px on the downbeat so the downbeat differs in weight, not only position. Static under reduced motion.

## Do's and Don'ts

### Do:
- **Do** set tempo, bar, time and counts in Libre Caslon Text with lining tabular figures, large enough to read from 2 m.
- **Do** keep orange (`pencil`) for the live-note ring alone, and teal (`select`) for selection and focus alone.
- **Do** draw controls as square, 2px ink outlines on paper, with one solid ink primary per screen; press and active states invert.
- **Do** draw notation as filled engraved shapes in the same hand as the existing glyphs.
- **Do** give every state a non-colour signal: shape, weight, size, inversion, or label.
- **Do** keep transport targets at 64px minimum (84px for Play/Stop) in the bottom thumb zone.
- **Do** ship every new surface on both pages by using the tokens; never hard-code a light-page hex.

### Don't:
- **Don't** use glowing dots, LED readouts, dark chassis styling, or a thin numeral on black; that is the category default this world replaces.
- **Don't** round corners on controls, fields, or sheets.
- **Don't** cast shadows on page elements; only an overlay sheet lifts.
- **Don't** use orange for buttons, accents, links, or text.
- **Don't** put uppercase tracked lines above headings as decoration; uppercase Franklin is for the running head and field labels.
- **Don't** substitute icon-font or emoji glyphs for notation or controls.
