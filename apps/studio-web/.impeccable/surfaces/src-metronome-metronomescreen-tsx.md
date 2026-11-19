---
version: 1
slug: "src-metronome-metronomescreen-tsx"
primary_target: "src/metronome/MetronomeScreen.tsx"
related_targets: []
---

Scope: the Metro tab (main metronome screen) of studio-web, plus its settings/automator/presets sheets. Mode: Operate.
Audience and job: a home e-kit drummer at the throne, device on a stand 1.5–2 m away, sticks in hand; set tempo/meter/accents, start/stop, nudge tempo mid-practice, read where they are in the bar.
Constraints: glanceable at distance; transport ≥ 64 px in the thumb zone; standard web controls (buttons, tabs, sheets); never colour-only state; Android Chrome + iPad Safari, portrait and iPad landscape.

## Direction contract

THESIS: The metronome typeset as a page of a drum method book: the tempo set as the page heading, the bar set as a sticking line. It refuses the category default of glowing dots around a thin numeral on black.

OWN-WORLD: Engraved method-book page: cool off-white paper #F2F2EE, engraving black #141414, one orange pencil #FF4F00 that only ever circles the live note, teal #008FA6 for selection/active tab. Libre Caslon Text for numerals, headings and sticking glyphs; Libre Franklin for labels and controls. Heavy rules above and below the sticking line; square-cornered 2 px outlined controls; one solid black primary.

STORY: The drummer sees the tempo and where the bar is from across the room, taps the beat they want quieter, and starts or stops without looking for anything.

FIRST VIEWPORT: Top: running head (preset name left; bar · session time right) over a hairline rule. Heading: BPM as a ~170 px Caslon numeral with "BPM" beside it; under it a tempo line "♩ = 96 · 4/4 · sixteenths" that opens settings. Middle: the sticking line between two heavy rules, one engraved glyph per beat, accent mark ">" above accents, ghosts smaller and grey, mutes as a rest; count numbers below. Bottom thumb zone: −5 −1 tap +1 +5 row, full-width black Play/Stop. Tab bar: Metro · Dojo · Song Lab.

FORM: The Stick Control Page, my top-ranked grounded candidate (1 of 7), taken as IMPECCABLE’S PICK; seed:557ae17cd5a2a9c8.

SIGNATURE: The orange pencil circle: a hand-drawn ring, slightly rotated, that jumps to the live note on every beat; tapping a note re-engraves it through accent → normal → ghost → rest.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Unresolved: dark "night page" variant for dim rooms (chosen card's named risk) — tokens prepared, design pass deferred.
