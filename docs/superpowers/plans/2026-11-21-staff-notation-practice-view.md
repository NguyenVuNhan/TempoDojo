# Staff Notation Practice View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the letter-grid practice view with a five-line drum staff that has sticking letters above it, backed by exercise data that says which drum each hit is on.

**Architecture:** `core-ladder` gains a per-line `drum` for hands lines, so one exercise can have several hands lines, one per drum. Two hands then hit together by sitting on different lines. A pure layout module in `studio-web` turns an `Exercise` into staff systems (slots, notes, sticking letters, counts). `StaffView` draws those as SVG and replaces `PatternView`. A `showCounts` pref drives a switch on the exercise screen.

**Tech Stack:** TypeScript, React 19, Vitest + Testing Library, Nx (`npx nx test <project>`), Dexie prefs (`@tempodojo/storage`).

**Spec:** `docs/superpowers/specs/2026-11-21-staff-notation-practice-view-design.md`. Approved mockups are in `.superpowers/brainstorm/3330-1795241091/content/` (`staff-v3.html` for layout, `real-life.html` for grooves).

## Global Constraints

- The letter grid is removed **everywhere**. `PatternView.tsx`, its spec and `pattern.css` are deleted, and `StaffView` is the only pattern renderer.
- Staff: five lines. Hands stems point up and feet stems point down. Notes are beamed per beat (one beam for subdivisions 1–3, two for 4–6). Subdivisions 3 and 6 get a "3" or "6" over the beam group.
- **No accent marks on the staff.** Accents appear only as a small `>` above the sticking letter.
- Ghost notes: the notehead sits in `( )` on the staff. In the sticking row a ghost is a smaller, dimmer lowercase letter.
- Flams and drags: small slashed grace notes before the main note, on the same drum. Their sticking keeps the lowercase grace letters (`l` for a flam, `ll` for a drag, using the other hand's letter). Buzz: a "z" slash through the stem.
- Rests are empty space, with no rest glyphs.
- Counts row: drawn at the **very top**, above the sticking, **only** when `prefs.showCounts` is true. When it's off it takes no height. The control is a simple on/off switch (`role="switch"`), not a labelled ON/OFF button.
- Wrapping: never split a beat across lines. `MIN_SLOT_PX = 40`. On iPad width a whole bar fits on one line.
- Hi-hat foot notes are written only where the catalogue keeps them (Task 2 table).
- Tests: new tests may be added. Existing tests may only be rewritten where they assert the old grid markup (`.slot`, `.pattern-line`, `.pattern-label`).
- Do not touch the Songs tab, ranks, targets, timing or metronome behaviour.

## Review Focus

1. **16ths on a phone:** a 4/4 16th bar at 360 px wide must wrap into two lines of two beats, never 1.5 beats. Tested in Task 4 (`beatsPerLineFor`).
2. **Both hands on one slot:** the stacked sticking letters must follow the notehead order from top to bottom (hat R above snare L). Tested in Task 4.
3. **Feet-only exercises** (feet track: kick and hi-hat foot, with no hands line): the staff still draws, the sticking row is empty, double-pedal R/L letters appear under the staff, and the playback ring still shows. Tested in Tasks 4 and 5.
4. **Prefs saved before this change** (no `showCounts` key) must load as `false`. Tested in Task 3.
5. **Odd meters and tuplets:** 5/4 wraps by whole beats, and triplet and sextuplet counts and tuplet numbers are right. Tested in Task 4.

---

### Task 1: Drum per hands line in core-ladder

**Files:**
- Modify: `libs/core/ladder/src/types.ts` (add `HandDrum`, `PatternLine.drum`)
- Modify: `libs/core/ladder/src/pattern.ts` (add `handDrumOf`)
- Modify: `libs/core/ladder/src/rules.ts:200-215` (`accentsForExercise`)
- Test: `libs/core/ladder/src/pattern.spec.ts`, `libs/core/ladder/src/rules.spec.ts`, `libs/core/ladder/src/catalogue/catalogue.spec.ts` (add tests only)

**Interfaces:**
- Produces:
  - `export type HandDrum = 'crash' | 'hihat' | 'ride' | 'tom1' | 'tom2' | 'snare' | 'floortom';`
  - `PatternLine` gets `drum?: HandDrum`. Only valid on `voice: 'hands'`; leaving it out means `'snare'`.
  - `export function handDrumOf(line: PatternLine): HandDrum` returns `line.drum ?? 'snare'`.
  - `accentsForExercise` (unchanged signature): a pulse is accented if **any** `hands` line has an accented step at `pulse * subdivision`. With no hands lines, it keeps today's fallback to `pattern[0]`.

- [ ] **Step 1: Write failing tests**

`pattern.spec.ts`:
```ts
it('handDrumOf defaults to snare', () => {
  expect(handDrumOf({ voice: 'hands', steps: 'R' })).toBe('snare');
  expect(handDrumOf({ voice: 'hands', steps: 'R', drum: 'ride' })).toBe('ride');
});
```
`rules.spec.ts` (`accentsForExercise` is private, so assert through `exerciseSettings(ex, progress, DEFAULT_SETTINGS).accents`, building `progress` the way the existing `exerciseSettings` tests do):
```ts
it('merges accents across hands lines', () => {
  const ex = { ...exerciseById('coord-1-1')!, pattern: [
    { voice: 'hands', drum: 'hihat', steps: 'R R R R R R R R' },
    { voice: 'hands', drum: 'snare', steps: '- - >L - - - >L -' },
  ] } as Exercise;
  // pulses 1 and 3 (beats 2 and 4) are accented
  expect(exerciseSettings(ex, progress, DEFAULT_SETTINGS).accents).toEqual(['normal', 'accent', 'normal', 'accent']);
});
```
`catalogue.spec.ts`:
```ts
it('drum is only set on hands lines', () => {
  for (const ex of CATALOGUE) for (const l of ex.pattern)
    if (l.drum) expect({ id: ex.id, voice: l.voice }).toEqual({ id: ex.id, voice: 'hands' });
});
it('no hand plays two drums in the same slot', () => {
  for (const ex of CATALOGUE) {
    const lines = ex.pattern.filter((l) => l.voice === 'hands').map((l) => parseSteps(l.steps));
    const n = lines[0]?.length ?? 0;
    for (let i = 0; i < n; i++) {
      const hands = lines.map((s) => s[i].hand).filter(Boolean);
      expect({ id: ex.id, slot: i, dup: hands.length !== new Set(hands).size }).toEqual({ id: ex.id, slot: i, dup: false });
    }
  }
});
```

- [ ] **Step 2: Run, expect the two new unit tests to fail** (`handDrumOf` is undefined, and the accent merge reads only the first line)

Run: `npx nx test core-ladder`

- [ ] **Step 3: Implement `HandDrum`, `PatternLine.drum`, `handDrumOf` and the merged `accentsForExercise`**

- [ ] **Step 4: Run, all pass.** The catalogue tests pass against today's data, which has one hands line per exercise.

Run: `npx nx test core-ladder`. Expected: PASS.

- [ ] **Step 5: Commit** `feat(core-ladder): per-line drum for hands patterns`

---

### Task 2: Rewrite coordination exercises for the kit

**Files:**
- Modify: `libs/core/ladder/src/catalogue/coordination.ts`
- Test: `libs/core/ladder/src/catalogue/catalogue.spec.ts` (add tests)

**Interfaces:**
- Consumes: `HandDrum` and `PatternLine.drum` (Task 1).

Rules come from the spec ("Decided by the user: groove content"). **G** = groove: the right-hand timekeeping note goes back under the backbeat. **S** = sticking pattern: the sticking is kept exactly, and each note only gets a drum. Hands lines are listed in staff order, top to bottom (`ride`/`hihat` above `snare`), then `kick`, then `hihat` (foot). "keep" means the line stays unchanged and "drop" means the line is removed. Kick lines are unchanged everywhere.

| id | case | hands lines (drum: steps) | foot | text changes |
|---|---|---|---|---|
| coord-1-1 | G, hat | hihat: `R R R R R R R R` · snare: `- - >L - - - >L -` | drop | focus → `Bury the click with every kick and snare hit. Keep the right-hand hi-hat eighths steady straight through the backbeat.` |
| coord-1-2 | S, ride | ride: `R - R - R - R -` · snare: `- L - L - L - L` | keep | focus → `Alternate R-L eighth notes evenly between ride and snare without letting the quarter-note kick flinch.` tip → `Once the right-hand lead feels automatic, flip to left-hand lead.` |
| coord-1-3 | S, ride | ride: `R R - - R R - -` · snare: `- - L L - - L L` | keep | — |
| coord-2-1 | G, ride | ride: `R R R R R R R R` · snare: `- - >L - - - >L -` | keep | — |
| coord-2-2 | G, hat | hihat: `R - R - R - R - R - R - R - R -` · snare: `- - - - >L - - - - - - - >L - - -` | drop | focus → `Place the "a" of beat 1 cleanly between the hi-hat eighths without rushing beat 2.` (unchanged wording, no foot mention) |
| coord-2-3 | S, hat | hihat: `R - R - >R - R - R - R - >R - R -` · snare: `- L - L - L - L - L - L - L - L` | drop | focus → `Keep the 16th-note hand stream smooth and relaxed, right hand on hi-hat and left on snare, while the kick syncopates underneath.` |
| coord-3-1 | G, hat | hihat: `R - R - R - R - R - R - R - R -` · snare: `- (L) - (L) >L (L) - (L) - (L) - (L) >L (L) - (L)` | drop | — |
| coord-3-2 | G, ride | ride: `R - R - R - - R R - R - R - R -` · snare: `- - - (L) >L - (L) - - (L) - - >L - - (L)` | keep | — |
| coord-3-3 | S, hat | hihat: `>R - R - >R - R - >R - R - >R - R -` · snare: `- L - L - L - L - L - L - L - L` | drop | — |
| coord-4-1 | S, hat | hihat: `>R - R R - R - - >R - R R - R - -` · snare: `- (L) - - >L - L L - (L) - - >L - L L` | drop | focus → `Keep the right-hand accents crisp and left-hand taps low while locking the kick on 1 and 3.` |
| coord-4-2 | S, hat | hihat: `R - - R - R R - R - - R - R R -` · snare: `- L L - >L - - L - L L - >L - - L` | drop | — |
| coord-4-3 | S, snare | unchanged (one hands line, no `drum` = snare; the tip says "hand rhythm on snare") | keep | — |
| coord-5-1 | S, ride | ride: `>R - R R - R - - >R - R R - R - -` · snare: `- L - - >L - L L - L - - >L - L L` | keep | — |
| coord-5-2 | S, hat | hihat: `R - - R - R - - R - - R - R - -` · snare: `- L - - >L - L - - L - - >L - L -` | drop | — |
| coord-5-3 | G, hat | hihat: `R - R - R - R - R - R - R - R -` · snare: `- (L) - (L) >L (L) - (L) - (L) - (L) >L (L) - (L)` | drop | focus → `Keep ghost notes whisper-quiet under the hi-hat eighths over the syncopated Baião kick.` |
| coord-6-1 | S, hat | hihat: `R - R - R - R - R - R - R - R -` · snare: `- - - L - - - L - - - L - - - L` | drop | — |
| coord-6-2 | S, ride | ride: `R - - - - - R - - R - - >R - - -` · snare: `- L - - >L - - L - - - L - - L -` | keep | — |
| coord-6-3 | S, hat | hihat: `>R - R R - >R - - R R - R - R - -` · snare: `- L - - L - L L - - >L - L - >L L` | drop | — |

coord-6-2 is on the ride (my call; listed in the handoff). Its whole point is four limbs, and moving the right hand to the ride keeps the foot as the spec's case 2 allows. Where a `transferTip` now repeats what the staff already shows (it says to move the hand to the ride when the exercise already has it there), trim that clause and leave the rest.

- [ ] **Step 1: Write failing tests** in `catalogue.spec.ts`:
```ts
it('rock foundation is the real groove: hat 8ths, snare 2 and 4, no foot', () => {
  const ex = exerciseById('coord-1-1')!;
  expect(ex.pattern).toEqual([
    { voice: 'hands', drum: 'hihat', steps: 'R R R R R R R R' },
    { voice: 'hands', drum: 'snare', steps: '- - >L - - - >L -' },
    { voice: 'kick', steps: 'K - - - K - - -' },
  ]);
});
it('closed hi-hat hand and a written hi-hat foot never coexist', () => {
  for (const ex of CATALOGUE.filter((e) => e.track === 'coordination')) {
    const hatHand = ex.pattern.some((l) => l.voice === 'hands' && l.drum === 'hihat');
    const foot = ex.pattern.some((l) => l.voice === 'hihat');
    expect({ id: ex.id, both: hatHand && foot }).toEqual({ id: ex.id, both: false });
  }
});
it('coordination text no longer mentions a foot chick where the foot line was dropped', () => {
  for (const ex of CATALOGUE.filter((e) => e.track === 'coordination' && !e.pattern.some((l) => l.voice === 'hihat')))
    expect({ id: ex.id, hit: /chick|left[- ]foot|hi-hat on 2 ?& ?4/i.test(ex.focus) }).toEqual({ id: ex.id, hit: false });
});
```
- [ ] **Step 2: Run, expect FAIL.** Run: `npx nx test core-ladder`
- [ ] **Step 3: Apply the table to `coordination.ts`.**
- [ ] **Step 4: Run, all pass,** including the existing "every pattern line parses and fills exactly one bar". Run: `npx nx test core-ladder`
- [ ] **Step 5: Commit** `feat(core-ladder): orchestrate coordination exercises for the kit`

---

### Task 3: `showCounts` pref

**Files:**
- Modify: `libs/adapters/storage/src/repositories.ts:32-40`
- Test: `libs/adapters/storage/src/repositories-v2.spec.ts` (add a test)

**Interfaces:**
- Produces: `Prefs.showCounts: boolean`, with `DEFAULT_PREFS.showCounts = false`.

- [ ] **Step 1: Failing test.** Save a prefs object without `showCounts` (cast through `unknown`) using the raw table the existing tests use, then `load()`. Expect `showCounts` to be `false`. Also test that a save and load with `showCounts: true` round-trips to `true`.
- [ ] **Step 2: Run, expect FAIL.** Run: `npx nx test storage`
- [ ] **Step 3: Add the field and its default.** `load()` already spreads `DEFAULT_PREFS`. Fix any `Prefs` literals in `apps/studio-web` test utilities (`ladder/test-utils.ts`) so they type-check.
- [ ] **Step 4: Run, expect PASS.** Run: `npx nx run-many -t test -p storage studio-web`
- [ ] **Step 5: Commit** `feat(storage): showCounts pref`

---

### Task 4: Staff layout (pure)

**Files:**
- Create: `apps/studio-web/src/ladder/staff/layout.ts`
- Test: `apps/studio-web/src/ladder/staff/layout.spec.ts`

**Interfaces:**
- Consumes: `Exercise`, `PatternLine`, `HandDrum`, `handDrumOf`, `parseSteps`, `Step` from `@tempodojo/core-ladder`, and `pulsesPerBar`, `Subdivision` from `@tempodojo/core-metronome`.
- Produces:
```ts
export type StaffDrum = HandDrum | 'kick' | 'hihat-foot';
/** Staff position in half-spaces from the top line (0 = top line F5, 8 = bottom line E4). */
export const STAFF_STEP: Record<StaffDrum, number> =
  { crash: -2, hihat: -1, ride: 0, tom1: 1, tom2: 2, snare: 3, floortom: 5, kick: 7, 'hihat-foot': 9 };
export const X_HEAD: ReadonlySet<StaffDrum>; // crash, hihat, ride, hihat-foot
export interface StaffNote { drum: StaffDrum; step: number; head: 'x' | 'normal'; stem: 'up' | 'down';
  ghost: boolean; grace: 'flam' | 'drag' | 'buzz' | null; }
export interface StickLetter { text: string; accent: boolean; ghost: boolean; grace: string | null; }
export interface StaffSlot { slot: number; beat: number; notes: StaffNote[]; // sorted by step ascending
  sticking: StickLetter[]; // hands, same top-to-bottom order as the hand notes
  foot: StickLetter | null; // only for kick tokens R/L (double pedal)
  count: string; }
export interface StaffSystem { beats: number[]; slots: StaffSlot[]; }
export const MIN_SLOT_PX = 40;
export function countLabels(sub: Subdivision): string[]; // labels for one beat; '1' becomes the beat number
export function beatsPerLineFor(widthPx: number, ex: Exercise): number;
export function layoutStaff(ex: Exercise, beatsPerLine: number): StaffSystem[];
export function describeStaff(ex: Exercise): string; // aria-label
```
- `countLabels`: 1 → `['#']`, 2 → `['#','&']`, 3 → `['#','&','a']`, 4 → `['#','e','&','a']`, 5 → `['#','·','·','·','·']`, 6 → `['#','la','li','&','la','li']`. `layoutStaff` replaces `#` with the 1-based beat number.
- `layoutStaff` with `beatsPerLine >= beats` returns a single system.
- `beatsPerLineFor`: `clamp(floor((width - 32) / (sub * MIN_SLOT_PX)), 1, beats)`. A width of 0 or less returns `beats` (jsdom).
- Sticking letter text: `hand` (R/L), or lowercase for a ghost. `grace` is `l`/`r` for a flam and `ll`/`rr` for a drag, using the other hand's letter (as today's `graceText` does). The buzz is drawn on the staff only, so its sticking `grace` is null.
- Line labels in `describeStaff` (add `DRUM_LABEL: Record<StaffDrum, string>` to `labels.ts`: Crash, Hi-hat, Ride, High tom, Mid tom, Snare, Floor tom, Kick, Hi-hat foot). Format: `"<Label>: <step>, <step>…"` per pattern line, lines joined with `"; "`. Steps are described as today's `describeStep` does (`rest`, `accent R`, `ghost L`, `flam R`).

- [ ] **Step 1: Write failing tests**
```ts
it('counts', () => {
  expect(countLabels(4)).toEqual(['#', 'e', '&', 'a']);
  expect(countLabels(6)).toEqual(['#', 'la', 'li', '&', 'la', 'li']);
});
it('wraps 4/4 16ths to two beats per line on a phone, one bar on iPad', () => {
  const ex = exerciseById('coord-4-1')!;
  expect(beatsPerLineFor(360, ex)).toBe(2);
  expect(beatsPerLineFor(768, ex)).toBe(4);
  expect(beatsPerLineFor(0, ex)).toBe(4);
  expect(layoutStaff(ex, 2).map((s) => s.beats)).toEqual([[0, 1], [2, 3]]);
});
it('5/4 wraps by whole beats', () => {
  const ex = { ...exerciseById('coord-1-1')!, meter: { beatsPerBar: 5, denominator: 4, beatUnit: 'quarter' },
    pattern: [{ voice: 'hands', steps: 'R L R L R L R L R L' }] } as Exercise;
  expect(layoutStaff(ex, 2).map((s) => s.beats)).toEqual([[0, 1], [2, 3], [4]]);
});
it('stacks both hands on the backbeat, hat above snare', () => {
  const slot = layoutStaff(exerciseById('coord-1-1')!, 4)[0].slots[2];
  expect(slot.notes.map((n) => n.drum)).toEqual(['hihat', 'snare', ]);
  expect(slot.sticking.map((l) => [l.text, l.accent])).toEqual([['R', false], ['L', true]]);
  expect(slot.count).toBe('2');
});
it('rudiments sit on the snare with ghosts and graces', () => {
  const para = layoutStaff(exerciseById('pas-16')!, 2)[0];
  expect(para.slots.every((s) => s.notes.every((n) => n.drum === 'snare'))).toBe(true);
  const flam = layoutStaff(exerciseById('pas-20')!, 9)[0].slots.find((s) => s.notes.length)!;
  expect(flam.sticking[0].grace).toBe('l');
  expect(flam.notes[0].grace).toBe('flam');
});
it('ghosts are lowercase in sticking and flagged on the note', () => {
  const s = layoutStaff(exerciseById('coord-3-1')!, 4)[0].slots[1];
  expect(s.sticking).toEqual([{ text: 'l', accent: false, ghost: true, grace: null }]);
  expect(s.notes[0].ghost).toBe(true);
});
it('double-pedal kicks get foot letters and no hand sticking', () => {
  const ex = CATALOGUE.find((e) => e.pattern.some((l) => l.voice === 'kick' && /[RL]/.test(l.steps)))!;
  const slot = layoutStaff(ex, 9)[0].slots[0];
  expect(slot.sticking).toEqual([]);
  expect(slot.foot?.text).toMatch(/^[RL]$/);
  expect(slot.notes[0]).toMatchObject({ drum: 'kick', stem: 'down' });
});
it('describes every line with its drum', () => {
  expect(describeStaff(exerciseById('pas-16')!)).toBe('Snare: accent R, L, R, R, accent L, R, L, L');
  expect(describeStaff(exerciseById('coord-1-1')!)).toBe(
    'Hi-hat: R, R, R, R, R, R, R, R; Snare: rest, rest, accent L, rest, rest, rest, accent L, rest; Kick: K, rest, rest, rest, K, rest, rest, rest');
});
```
- [ ] **Step 2: Run, expect FAIL** (the module is missing). Run: `npx nx test studio-web -- layout`
- [ ] **Step 3: Implement `layout.ts` and `DRUM_LABEL`.**
- [ ] **Step 4: Run, expect PASS.** Run: `npx nx test studio-web -- layout`
- [ ] **Step 5: Commit** `feat(studio-web): staff layout model`

---

### Task 5: `StaffView` replaces `PatternView`

**Files:**
- Create: `apps/studio-web/src/ladder/staff/StaffView.tsx`, `apps/studio-web/src/ladder/staff/staff.css`
- Test: `apps/studio-web/src/ladder/staff/StaffView.spec.tsx`
- Delete: `apps/studio-web/src/ladder/PatternView.tsx`, `PatternView.spec.tsx`, `pattern.css`. Move the `PatternLive` type into `StaffView.tsx`.
- Modify: `apps/studio-web/src/ladder/ExerciseScreen.tsx:16,258` (import and use `StaffView`), `ExerciseScreen.spec.tsx:66` (replace `.slot` count with `document.querySelectorAll('[data-slot]')` → 8)
- Modify: `apps/studio-web/src/ladder/labels.ts` (remove `VOICE_LABEL` if nothing else uses it)

**Interfaces:**
- Consumes: everything Task 4 produces, plus `PencilRing` from `../../metronome/PencilRing`.
- Produces: `export function StaffView(props: { exercise: Exercise; live?: PatternLive | null; showCounts?: boolean }): JSX.Element` and `export interface PatternLive { bar: number; pulse: number }`.

Rendering contract (mockup `staff-v3.html` is the visual reference; geometry and sizes are the builder's call within the Global Constraints):
- Root: `<div className="staff" role="img" aria-label={describeStaff(ex)}>` containing one `<svg data-system>` per system. Width comes from a `ResizeObserver` on the root, and `beatsPerLineFor(width, ex)` picks the wrap. Before the first measurement, use width 0, which gives a full bar.
- Each slot renders `<g data-slot={slot}>`. Each sticking letter is `<text data-stick>` and each foot letter `<text data-foot>`. Each count is `<text data-count>`, rendered only when `showCounts`. Each ghost notehead is wrapped by parentheses `<text data-paren>`.
- Accents render only as `<text data-accent>` above the sticking letter, never near a notehead.
- The `PencilRing` (`downbeat={live.pulse === 0}`, `key={\`${live.bar}-${live.pulse}\`}`) sits behind the first slot of beat `live.pulse`, in whichever system holds that beat. It renders even with no hands lines.
- Styling uses the existing theme tokens (`var(--ink)`, `var(--ink-soft)`, fonts from `styles.css`). Follow `apps/studio-web/DESIGN.md`.

- [ ] **Step 1: Write failing tests** in `StaffView.spec.tsx`:
```ts
const view = (id: string, p: Partial<{ live: PatternLive; showCounts: boolean }> = {}) =>
  render(<StaffView exercise={exerciseById(id)!} {...p} />).container;
it('pas-16: 8 slots, sticking RLRRLRLL, 2 accents, no counts by default', () => {
  const c = view('pas-16');
  expect(c.querySelectorAll('[data-slot]')).toHaveLength(8);
  expect([...c.querySelectorAll('[data-stick]')].map((t) => t.textContent).join('')).toBe('RLRRLRLL');
  expect(c.querySelectorAll('[data-accent]')).toHaveLength(2);
  expect(c.querySelectorAll('[data-count]')).toHaveLength(0);
});
it('shows counts when asked', () => {
  expect([...view('coord-1-1', { showCounts: true }).querySelectorAll('[data-count]')].map((t) => t.textContent))
    .toEqual(['1', '&', '2', '&', '3', '&', '4', '&']);
});
it('ghost notes get parentheses', () => {
  expect(view('coord-3-1').querySelectorAll('[data-paren]').length).toBe(2 * 8);
});
it('feet-only exercise: no hand sticking, foot letters, ring still shows', () => {
  const ex = CATALOGUE.find((e) => e.pattern.every((l) => l.voice !== 'hands') && e.pattern.some((l) => /[RL]/.test(l.steps)))!;
  const c = render(<StaffView exercise={ex} live={{ bar: 0, pulse: 1 }} />).container;
  expect(c.querySelectorAll('[data-stick]')).toHaveLength(0);
  expect(c.querySelectorAll('[data-foot]').length).toBeGreaterThan(0);
  expect(c.querySelector('.pencil-ring')).not.toBeNull();
});
it('labels the staff for screen readers', () => {
  expect(view('pas-16').querySelector('[role="img"]')?.getAttribute('aria-label'))
    .toBe('Snare: accent R, L, R, R, accent L, R, L, L');
});
```
- [ ] **Step 2: Run, expect FAIL.** Run: `npx nx test studio-web -- StaffView`
- [ ] **Step 3: Implement `StaffView` and `staff.css`, swap it into `ExerciseScreen`, delete the old files, and rewrite the one `.slot` assertion in `ExerciseScreen.spec.tsx`.**
- [ ] **Step 4: Run the whole app suite, expect PASS.** Run: `npx nx run-many -t test lint -p studio-web core-ladder`
- [ ] **Step 5: Commit** `feat(studio-web): drum staff practice view replaces letter grid`

---

### Task 6: Counts switch on the exercise screen

**Files:**
- Modify: `apps/studio-web/src/ladder/ExerciseScreen.tsx` (practice panel, around line 257), `apps/studio-web/src/ladder/exercise.css`
- Modify: `.gitignore` (add `.superpowers/`)
- Test: `apps/studio-web/src/ladder/ExerciseScreen.spec.tsx` (add a test)

**Interfaces:**
- Consumes: `ladder.prefs.showCounts`, `ladder.setPrefs(p: Prefs)` (existing `LadderState`), `StaffView` `showCounts` prop.

Control: `<input type="checkbox" role="switch" aria-label="Show counts">`, styled as a small track-and-thumb switch with the visible text "Counts". It sits at the top-right of the practice panel, above the staff. Toggling it calls `ladder.setPrefs({ ...ladder.prefs, showCounts: !ladder.prefs.showCounts })`.

- [ ] **Step 1: Failing test:** open pas-16 and expect no `[data-count]`. Click the `switch` named "Show counts" and expect 8 `[data-count]`, `prefs.save` called with `objectContaining({ showCounts: true })`, and `aria-checked`/`checked` true.
- [ ] **Step 2: Run, expect FAIL.** Run: `npx nx test studio-web -- ExerciseScreen`
- [ ] **Step 3: Implement the switch and add `.superpowers/` to `.gitignore`.**
- [ ] **Step 4: Run everything, expect PASS.** Run: `npx nx run-many -t test lint build -p studio-web core-ladder storage`
- [ ] **Step 5: Commit** `feat(studio-web): counts switch for the practice staff`
