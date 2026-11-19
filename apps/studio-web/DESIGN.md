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
  tab:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.14em"
  sticking:
    fontFamily: "Libre Caslon Text, Georgia, serif"
    fontSize: "min(3rem, calc(var(--slot) * 0.95))"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "lnum"
  caption:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.06em"
rounded:
  none: "0px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "18px"
  lg: "24px"
  xl: "32px"
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
  tab:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.tab}"
    rounded: "{rounded.none}"
    height: "64px"
  tab-selected:
    textColor: "{colors.ink}"
  button-stop-test:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.control-caps}"
    rounded: "{rounded.none}"
    height: "84px"
  click-label:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "4px 12px"
  click-label-silent:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  ladder-row:
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    height: "64px"
    padding: "14px 0"
  ladder-row-locked:
    textColor: "{colors.ink-soft}"
  rank-mark:
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    size: "14px"
  target-cell:
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "10px 8px"
  target-cell-future:
    textColor: "{colors.ink-soft}"
  stat-row:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "0 0 10px"
  calendar-day:
    backgroundColor: "{colors.ink}"
    rounded: "{rounded.none}"
    size: "14px"
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
- The book has three sections (Today, Ladder, Metro) behind a printed tab bar; exercises are written as sticking letters in Caslon, the way a method book prints R and L under the staff.

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

**The Ink Quantity Rule.** Progress is shown by how much ink is laid down (a rank mark filling, a bar rising, a day darkening), never by a new hue. Rank has no bronze, silver, or gold colour.

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
- **Sticking** (Caslon 700, up to 3rem, scaled from the slot): the R / L / K / H letters of an exercise pattern. Graces are the other hand in lower case, Caslon 700 at half the slot, raised; buzz is an italic 700 "z".
- **Tab** (Franklin 800, 0.9375rem, 0.14em, uppercase): the three tab-bar labels.
- **Caption** (Franklin 500, 0.6875rem, uppercase, 0.06–0.08em): chart axis captions and the calendar legend only. Voice labels above pattern lines use Franklin 500 0.75rem, 0.1em, uppercase, Soft Ink.
- **Section headings** (Caslon 700, sentence case): tier headings and Today's "Next up" / "Your practice" at the Title size; stat headings ("Sessions per week", "Practice days") at 1.375rem. Stat values Caslon 700 1.5–2rem, tabular.

### Named Rules
**The Read-In-Caslon Rule.** Any number or word the drummer reads for meaning (tempo, bar, time, counts, option names, sheet titles) is Caslon. Franklin is for labels and verbs on controls.

**The Running Head Rule.** Uppercase tracked Franklin belongs to the page's running head and to form-field labels, as a printed book uses it. It does not appear as a decorative line above headings. The same register names a staff (a voice label above its pattern line, as a score names its instrument), the tab-bar sections, and a chart's axis; headings themselves, including stat headings, are Caslon sentence case.

## Layout

A single centred page column, max 640px, side gutter clamp(16px, 5.5vw, 32px), filling the dynamic viewport height as four stacked areas: running head, heading (tempo), sticking line (notation and bar counter), transport. The transport sits at the bottom in the thumb zone with safe-area padding.

- **Notation grid:** one column per pulse, capped at 8 columns; note height is min(clamp(110px, 19vh, 176px), column width × 1.6) so noteheads always land on the staff line. On narrow containers (≤560px) bars longer than 4 beats wrap into rows of 4 at a reduced height; bar lines open and close the whole bar only, never each row.
- **Transport:** a five-cell nudge row (1fr 1fr 1.4fr 1fr 1fr, Tap in the wider centre cell), 8px gaps, above a full-width Play/Stop.
- **iPad landscape (≥900px, landscape):** the page regroups into a two-column spread (1.5fr page, 1fr transport, 56px gap, max 1180px); nudges become a 2-column grid with Tap spanning the top; sheets become a 460px right-side panel.
- **Rhythm:** 8px between controls, 12px inside fields, 18px field padding, 24px section padding, 32px between tiers and between Today's sections and stat groups; vertical breathing room above the heading and notation uses viewport-relative clamps.
- **App shell:** fixed to the dynamic viewport (100dvh) as two rows: the panel (minmax(0, 1fr), scrolls on its own with contained overscroll) and the tab bar (auto). The bar never covers content; a screen taller than the space scrolls above it. Inside the shell the metronome page drops its bottom padding to 16px and takes the tab bar's height back from the space above the staff (clamp(20px, 4.5vh, 56px)).
- **Short screens (max-height 780px):** the shell tightens the vertical rhythm (8px above the heading, 12px around the staff, 10px under the page) so Play stays on screen on a 360×740 phone.
- **Sticking pattern:** one bar on one line per voice, never wrapped. Slot width comes from a container query: clamp(18px, (100cqi − 20px − (beats − 1) × 11px) ÷ slots, 64px); only when 18px slots cannot fit does the bar scroll sideways. 10px side padding keeps the pencil ring on the first and last note unclipped.
- **Exercise screen:** running head, then content (title, pattern, actions, targets, focus, best, tip) in 18px gaps, then a transport sticky to the bottom of the scrolling page above a 2px ink rule: BPM numeral (Caslon 700, clamp(3.5rem, 16vw, 5rem)) with its note value, a climb check, four nudges (−5 −1 +1 +5), Play. The pattern comes first, directly under the title. On iPad landscape it takes the same two-column spread as the metronome (1.5fr / 1fr, 56px gap, max 1180px), transport bottom-aligned on the right without its top rule, numeral clamp(7.5rem, 11vw, 10rem).
- **Ladder and Today:** single 640px column, page bottom padding 32px plus safe area. Ladder rows below 420px wide stack the "Next" line under the status instead of on the right.

## Elevation & Depth

Flat. Depth is printed, not lit: rules and outlines separate regions. The one exception is the modal sheet, which lifts above the page with a soft ink shadow and a 28% ink scrim, because it is a sheet laid over the book.

### Shadow Vocabulary
- **Sheet lift** (`box-shadow: 0 -12px 32px color-mix(in srgb, var(--ink) 18%, transparent)`): bottom sheets only.
- **Selected underline** (`box-shadow: inset 0 -5px 0 var(--select)`): a printed mark, not elevation; the checked choice. The selected tab and the current-rank target cell carry the same mark at 4px (`inset 0 -4px 0 var(--select)`).

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

- **Stop test (rank test, running):** 84px full width, paper fill, 2px ink outline, Franklin 800 1.75rem uppercase 0.16em: the transport size, because it is pressed mid-test with sticks in hand. Press inverts to ink.
- **Sheet primary (Start test, Claim, Save, Save target):** solid ink, full width, 64px, Franklin 800 1.25rem uppercase 0.14em; disabled fills Pencil Rule with paper text.
- **Exercise actions (Log clean tempo, Rank test):** text buttons in a two-column grid, 8px gap, 64px tall, 1rem, because they are touched mid-practice.

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

### Navigation (Tab bar)
- **Style:** a paper bar under a 2px ink rule at the foot of the shell, three equal tabs (Today · Ladder · Metro) in the page column (640px; 1180px on iPad landscape), safe-area padding below. Tabs are 64px tall, borderless, Tab type in Soft Ink.
- **Selected:** Engraving Black text and a 4px inset teal underline. Press inverts to ink fill with paper text (80ms ease-out). Focus ring sits inside (−6px offset). Arrow keys, Home and End move between tabs.

### Ladder Row
- **Style:** a full-width text row, 64px minimum, 14px vertical padding, 1px Pencil Rule between rows (none after the last). Grid: a 14px rank mark, then the exercise name (Caslon 700 1.25rem) over a status line (Caslon 400 1rem, Soft Ink; the earned rank word goes Caslon 700 ink), and a "Next: Silver 80" / "Mastered" line on the right in Franklin 800 0.8125rem uppercase 0.08em, tabular.
- **Locked:** the row drops to Soft Ink, is not pressable, and loses the Next line. A tier that is locked says why in one Caslon sentence under its heading ("Locked — reach Bronze on every tier 1 exercise").
- **Tier heading:** "Tier N" in Caslon 700 1.75rem, 32px above each tier. Today's "Next up" list reuses these rows unchanged.

### Rank Mark
- **Style:** a 14px square with a 2px ink outline that fills from the bottom as rank rises: Unranked is a Pencil Rule outline, Bronze an empty ink outline, Silver a 4px ink band at the foot, Gold half filled, Master solid ink. Rank is also always written out in the row; the mark is the glanceable echo.

### Targets Row
- **Style:** an ordered row of four equal cells (Bronze, Silver, Gold, Master), 8px gaps, each a 1px Pencil Rule box, 10px 8px padding: rank word in Caslon 0.9375rem over the BPM in Caslon 1.375rem, tabular. Ranks above the next one are Soft Ink.
- **Current:** the next rank to earn goes Caslon 700, ink outline, and a 4px inset teal underline (`aria-current`).

### Rank Test Sheet
- **Style:** a sheet in steps. Setup: target choices, a Caslon 700 1.375rem target line, a Soft Ink note, a 64px sheet primary. Running: the target line, a large Caslon readout (clamp(2.5rem, 12vw, 3.5rem)), the Click/Silent label, and the 84px Stop test. Check: one plain Soft Ink instruction, checkboxes, Save and a text button.
- **Click / Silent label:** Caslon 700 2rem in a 2px ink box, 4px 12px padding. A click bar is ink on paper; a silent bar inverts to paper on ink. Told by inversion and the word, never by colour.

### Today
- **Weekly line:** "This week" at Headline size, then the week's progress as a Caslon 400 1.5rem line; when met, "Target met" in Caslon italic 700 1.25rem. The target is changed from a Soft Ink underlined text link.
- **Stat row:** label left in Caslon 400 1.125rem, value right in Caslon 700 1.5rem tabular, 10px under, 1px Pencil Rule. The time list repeats this as a bare list with the last rule dropped.
- **Week chart:** eight solid-ink bars on a 72px track, 6px gaps, max 420px wide, the count above each bar in Caslon 0.875rem; an empty week is a Pencil Rule sliver. Two Caption labels ("8 weeks ago", "This week") each span half the chart, so a caption never widens a bar column.
- **Practice calendar:** 12 weeks of 14px square days in columns of seven, 3px gaps. Five ink levels: level 0 a 1px Pencil Rule outline, then ink at 25%, 50%, 75%, and solid; future days are a 6% ink tint. A Caption legend shows the five levels. No streak count anywhere.

### Backup (Settings sheet)
- **Style:** a sheet field with its field label, one Soft Ink Caslon 1rem note, then Export and Import as text buttons in a wrapping row (8px gaps; the file input is visually hidden inside the Import label, which takes the teal focus ring). Results print as one Caslon 1rem sentence in ink; errors set it bold.

### Sticking Pattern (signature)
An exercise written as sticking letters, one line per voice (Hands, Kick, Hi-hat foot), each named by its voice label above, all held between 2px ink rules (16px above, 18px below, 12px between lines). Every voice keeps the whole bar on one line so beats stack exactly under each other. Each slot is a Caslon 700 letter (R, L, K, H) aligned by its bottom edge; an accent adds a filled engraved wedge above the letter (0.4 × 0.23 slot) without shifting it; a ghost is Caslon 400 in Ghost Ink between Ghost Ink parentheses; a flam or drag sets the other hand's lower-case letter(s) raised before the stroke in Caslon 700; a rest is a Ghost Ink centred dot. Beats are divided by a 1px Pencil Rule with 5px either side. While playing, the pencil ring (1.35 × slot wide) circles the first slot of the live beat on the first line.

**The One Bar Rule.** A pattern is one bar per line and its voices never wrap apart: slots shrink to 18px, and only then does the bar scroll sideways as a whole.

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
- **Do** keep every voice of a pattern in one unwrapped bar, shrinking slots before scrolling, so the feet always sit under the hands they go with.
- **Do** show rank as a filling square plus the written rank word; progress is ink quantity, not colour.
- **Do** chart practice in ink alone (solid bars, ink-level days) with plain captions.
- **Do** size anything pressed mid-practice like transport: 64px for actions, 84px for the one stop or play.

### Don't:
- **Don't** use glowing dots, LED readouts, dark chassis styling, or a thin numeral on black; that is the category default this world replaces.
- **Don't** round corners on controls, fields, or sheets.
- **Don't** cast shadows on page elements; only an overlay sheet lifts.
- **Don't** use orange for buttons, accents, links, or text.
- **Don't** put uppercase tracked lines above headings as decoration; uppercase Franklin is for the running head and field labels.
- **Don't** substitute icon-font or emoji glyphs for notation or controls.
- **Don't** wrap a pattern's voices apart or break a bar across lines; voices never wrap apart.
- **Don't** count streaks, flames, or chains of days; the calendar shows practice, it does not punish a missed day.
- **Don't** set stat or section headings as uppercase eyebrows; they are Caslon sentence case.
- **Don't** let the tab bar overlay content; the panel scrolls above it.
