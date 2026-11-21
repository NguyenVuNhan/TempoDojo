# Staff Notation in the Practice View — Design

Date: 2026-11-21
Branch: `Improve-practice-layout`
Mockups (throwaway): `.superpowers/brainstorm/3330-1795241091/content/staff-v3.html`

## Intent and why

The practice view (`apps/studio-web/src/ladder/PatternView.tsx`) currently draws an exercise as a
letter grid: a HANDS row (R/L), a KICK row and a HI-HAT FOOT row. At the kit this is confusing.
Example: **8th-Note Rock Foundation** shows hands `R R >L R R R >L R`, and the user could not tell
how to play it. The real groove is: right hand on closed hi-hat on every 8th, left hand on snare on
2 and 4. The grid fails for two reasons:

1. It says *which hand*, never *which drum*.
2. One hands row can hold one letter per slot, so two hands hitting together (hat + snare on the
   backbeat) cannot be expressed. The data silently dropped the right-hand hat on 2 and 4.

The user finds sticking letters the fastest thing to read most of the time, but sometimes needs real
notation to know where to hit. The reference they gave is an Online Drummer worksheet: a standard
drum staff with sticking letters printed above the notes.

**Success:** the user can open any exercise, glance at the screen from the throne (phone or iPad on
a stand, 50–100 cm away), and know both which hand and which drum for every note.

## Goals

- Replace the letter grid **everywhere** (all tracks: hands/rudiments, coordination, feet) with a
  combined view: a standard five-line drum staff with sticking letters above.
- Exercise data says which drum every hit is on and allows simultaneous hits by both hands.
- Correct the coordination exercises so the staff shows what is actually played on the kit.
- Optional count row ("1 e & a"), off by default, behind a simple toggle switch, remembered.

## Non-goals

- The Songs tab / Guitar Pro score player is untouched.
- No editing of exercises in the UI; no user-authored patterns.
- No change to ranks, targets, timing or metronome behaviour.
- No multi-bar exercises; every exercise stays exactly one bar.

## Anti-goals (would be a failure even if it "works")

- Notation too small to read at 1 m on a phone. Prefer wrapping onto more lines over shrinking.
- Accent wedges (`>`) cluttering the staff (the user explicitly does not want them there).
- Sticking letters that do not line up vertically with their notes.
- The count row taking space when it's switched off.

## Decided by the user

**Layout (mockup v3):**
- Five-line percussion staff with barlines at both ends. Standard drum-kit positions:
  hi-hat (hands) = x notehead above the top line; snare = third space; kick = bottom space;
  hi-hat foot = x notehead below the staff on a ledger line.
- Hands notes stem up, feet notes stem down. Notes are beamed per beat (8ths one beam, 16ths two).
- **Sticking letters above the staff**, each centred over its note. When two hands hit on the same
  slot, the letters stack in the same top-to-bottom order as their noteheads.
- **No accent marks on the staff.** Full/accented strokes are plain noteheads.
- **Ghost notes** are the notehead wrapped in parentheses `( )` on the staff.
- **Count row** ("1 e & a", "1 & 2 &", triplet "1 & a", etc.) sits at the very **top**, above the
  sticking. It is hidden by default and shown via a **simple on/off toggle switch** (a switch
  control, not a labelled ON/OFF button). When hidden it takes no space.
- **iPad / wide screens:** one bar per line. **Phone:** the bar wraps so notes stay readable at
  1 m (mockup: two beats per line for a 4/4 16th bar).
- The letter grid is removed entirely, including for pad rudiments (every note on snare).

## Decided by me (check these)

- **Accents stay on the sticking letters** (small `>` above the letter, as today), not on the staff.
- **Ghost strokes in the sticking row** render as a smaller, dimmer lowercase letter.
- **Grace notes:** flams and drags are small slashed grace notes before the main note on the staff
  (same drum as the main note unless the data says otherwise); the sticking keeps today's small
  lowercase grace letters (`lR`, `rrL`). Buzz strokes get the standard "z" tremolo slash on the stem.
- **Tuplets:** subdivision 3 and 6 get a small "3"/"6" over the beam group.
- **Live beat marker:** the existing `PencilRing` stays and moves onto the staff, marking the current
  beat (first slot of the beat), as it does today on the first grid row.
- **Count toggle:** saved in `Prefs` (`libs/adapters/storage/src/repositories.ts`) as e.g.
  `showCounts: boolean`, default `false`; applies to all exercises. The toggle lives in the
  practice panel near the staff.
- **Rendering:** hand-built SVG in a React component, not alphaTab. alphaTab is already a
  dependency (Songs), but the view needs exact control over sticking alignment, stacking,
  wrapping, the pencil ring and the count row; the notation set is small and fixed. Builder may
  revisit if they find alphaTab handles all of this cleanly.
- **Rudiments (hands track) stay all-snare**, even where their `transferTip` describes a kit
  groove. No data changes for the hands track beyond what the new shape requires.
- **Drums follow the hand by default:** right hand → hi-hat, left hand → snare. Use a different
  drum only where the exercise's `transferTip` names it unambiguously (e.g. "right hand on the
  ride"). Where a tip offers a choice ("hat or ride", "snare or rack tom"), take the first
  hat/snare option. Tips that don't name a drum ("around the toms", "orchestrate across…") are
  ignored. Accents do not move notes to other drums.
- **Double-pedal exercises** (`feet.ts`, kick lines stored as `R L R L`) show small R/L foot
  letters **below** the staff, aligned with the kick notes. Other feet notes get no letters.

## Decided by the user: groove content (after checking real-world notation)

Real drum notation (rock beat references; Online Drummer sheet) shows three cases, mocked in
`.superpowers/brainstorm/3330-1795241091/content/real-life.html`:

1. **Groove with the hand on closed hi-hat:** hat on every slot it plays, snare **stacked** under
   the hat on the backbeat (both hands hit together). The left foot just keeps the hats closed and
   is **not written**.
2. **Groove with the hand on ride:** same as 1, and a hi-hat foot chick (e.g. 2 and 4) **is**
   written below the staff.
3. **Sticking-pattern exercise** (paradiddle split, linear, any exercise whose point is the
   sticking): keep the sticking exactly; assign a drum to each note; add no notes.

Rules for the catalogue rewrite:
- **Groove exercises** (a beat with a backbeat where the left-hand snare replaced a right-hand
  timekeeping note, e.g. Rock Foundation, `R - R - >L - R -…`, the ghosted funk grooves
  `R (L) R (L) >L (L)…`) become case 1 or 2: put the right-hand timekeeping note back under the
  backbeat. Sticking-pattern exercises become case 3. The builder classifies each coordination
  exercise and lists every classification in the PR.
- **8th-Note Rock Foundation is case 1** (user's choice): right hand on closed hi-hat every 8th,
  left hand snare on 2 and 4 stacked under the hat, kick on 1 and 3, **no hi-hat foot**. Its
  `focus` text, which mentions the left-foot chick, is rewritten to match.
- **Generalised (my call, following the user's Rock Foundation choice):** wherever the right hand
  is on closed hi-hat and the left foot is written chicking, drop the foot notes (case 1) and
  update `focus`/`transferTip` text that mentions them. Where the right hand is already on the ride
  per the tip, keep the foot (case 2). Every exercise whose foot line is dropped is listed in
  the PR.

## Data model change (constraints for the builder)

Current shape (`libs/core/ladder/src/types.ts`):
`pattern: { voice: 'hands' | 'kick' | 'hihat'; steps: string }[]`, one token per slot,
tokens like `>R`, `(L)`, `fR`, `dL`, `zR`, `K`, `H`, `-` (parser: `libs/core/ladder/src/pattern.ts`).

Needed:
- Every hand hit carries a **drum** (at least: snare, hi-hat, ride, high tom, mid tom, floor tom,
  crash). Feet stay kick and hi-hat foot.
- **Two hand hits in the same slot** must be possible (one per hand).
- Pad rudiments stay terse to author: a hands line with no drum info defaults to snare.

The exact shape is the builder's call. One obvious option: allow several `hands` lines, each with an
optional `drum` (default `snare`), e.g. Rock Foundation becomes a `hands` line on `hihat` with
`R R R R R R R R` and a `hands` line on `snare` with `- - L - - - L -`.

Things the data change must keep working:
- `accentsForExercise` in `libs/core/ladder/src/rules.ts` reads accents from the first `hands` line
  to drive metronome click accents. With several hand lines it must merge them, so an accent
  on any hand line counts, and the click accents must not change for rudiments.
- `catalogue.spec.ts` "every pattern line parses and fills exactly one bar" must still hold.
- The screen-reader `aria-label` of the pattern must still describe every hit, now with its drum.
- Existing tests must not be edited to make them pass, except where they assert the old grid
  markup. Those tests should be rewritten to assert the new view.

## Left to the builder

- Exact SVG geometry, sizes and the phone wrap breakpoint. Constraints: readable at 1 m;
  wrap at beat boundaries; never split a beat across lines; same staff on iPad shows one bar per line.
- Styling consistent with the current dark theme and type in `apps/studio-web/src/styles.css` /
  `pattern.css`.
- Staff positions for toms/ride/crash (standard drum-kit notation conventions).
- Whether rests are drawn as rest glyphs or left as empty space (keep it uncluttered; the mockup
  leaves empty space).
- Housekeeping: add `.superpowers/` to `.gitignore`.
