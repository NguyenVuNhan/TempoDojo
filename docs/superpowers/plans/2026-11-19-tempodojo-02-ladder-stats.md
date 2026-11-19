# TempoDojo Plan 2 — Practice Ladder & Practice Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. In this repo, implementers are Gemini 4 Hydrogen (`gemini-4-hydrogen-medium`) workers in Orca worktrees per the gemini-execution skill; the planner writes the tests first.

**Goal:** Add the three-track practice ladder (hands, coordination & groove, feet), self-judged rank tests, unlocks, a "Today" home with Next up and practice stats, and a progress backup, on top of the Plan 1 metronome.

**Architecture:** Two new pure-TS core libraries: `core-ladder` (exercise catalogue as data, pattern grammar, rank/unlock/next-up rules) and `core-practice` (play/stop events → sessions → stats). The storage adapter gains Dexie schema v2 (progress, events, prefs). The app gains a shell with tabs (Today · Ladder · Metro), a Ladder screen, an Exercise screen that drives the shared metronome engine, a rank-test sheet, and backup export/import. Visual work stays inside the established world recorded in `apps/studio-web/DESIGN.md`.

**Tech Stack:** as Plan 1 (Nx 24.0.3, TS 6, React 19, Vitest 4, Dexie 4, fake-indexeddb) plus `fflate` (zip) for backup.

**Spec:** `docs/superpowers/specs/2026-11-19-tempodojo-design.md` §4 (ladder), §6 (stats), §7.1 (backup), §8 step 2. Research: `docs/research/01-rudiment-progression.md` §1.2, §2.5; `docs/research/02-coordination-independence.md` §2, §4. Design system: `apps/studio-web/DESIGN.md`.

## Global Constraints

- All Plan 1 global constraints still hold (core libs: no React/DOM/platform imports, `lib: ["es2022"]`, tags `scope:core`, exports only via `src/index.ts`).
- New core libs: `libs/core/ladder` (`@tempodojo/core-ladder`) and `libs/core/practice` (`@tempodojo/core-practice`), tags `scope:core,type:lib`. `core-ladder` may depend on `core-metronome` (for `Meter`, `Subdivision`, `MetronomeSettings`, `Automator`).
- Ranks: `'unranked' | 'bronze' | 'silver' | 'gold' | 'master'`, in that order.
- Every exercise target is `{ bpm, beatUnit, subdivision }` semantics: the exercise's `meter.beatUnit` is what BPM counts and `subdivision` is notes per beat; the UI always shows BPM with the note value (e.g. `95 BPM · 16ths`).
- Unlock: tier 1 of every track open; tier n+1 of a track opens when every exercise in tier n of that track is ≥ bronze. Feet tiers flagged `requiresDoublePedal` are hidden unless prefs `hasDoublePedal` is true (and never block unlocks of the tiers before them).
- Next up: per track, the unlocked, non-master exercises; order by `lastPracticedAt` desc (touched first), then rank asc, then catalogue order; take 2 hands, 1 coordination, 1 feet.
- Rank test (default for all tiers): at the target BPM, 8 bars with gap click 2 on / 2 off, no speed-up; then the self-check. Checklist items: all tracks — "Came back in on beat 1 after every silent bar", "Stick heights even, ghosts quiet", "Stayed relaxed"; coordination and feet add — "Feet never flinched or sped up". All must be ticked to claim.
- Claiming a rank at BPM b sets `bestCleanBpm = max(best, b)` and `rank = rankFor(bestCleanBpm, targets)` (never lowers a rank). Logging a best clean tempo without a test does the same, so ranks follow tempo either way (spec 4.4: "users may also just log a best clean tempo").
- Sessions: a session spans first play → last stop; a gap between a stop and the next play > 10 min starts a new session. Length = wall-clock span. Time per track/exercise = summed play time.
- Weekly target default: 4 sessions **or** 120 minutes per ISO week (Monday start, local time); met when either is reached. No streaks anywhere.
- Opening an exercise must not overwrite the plain metronome's saved last settings.
- Backup: one `.zip` containing `tempodojo.json` (`{ version: 1, exportedAt, presets, lastSettings, progress, events, prefs }`). Song files join in Plan 3.
- Tabs: Today · Ladder · Metro. Song Lab tab arrives with Plan 3 (not shown before).

## Review Focus

1. **Upgrading from Plan 1 data** — a browser holding schema v1 (presets + last settings) must open v2 with presets intact. Test: Task 5 `v1 database upgrades keeping presets`.
2. **A play with no matching stop** (tab killed, app closed while playing) — sessions/stats must not count an open-ended play as hours; cap an unmatched play at the next event or at `play + 30 min`, whichever is first. Test: Task 4 `unmatched play is capped`.
3. **Exercise tempo vs. metronome tempo** — practicing an exercise then switching to Metro must show the metronome's own last settings, not the exercise's. Test: Task 6 `exercise session does not persist last settings`.
4. **Ranks never go down** — logging a lower clean tempo after a higher one keeps the higher best and rank. Test: Task 3 `lower log keeps best and rank`.
5. **Importing a backup over existing data** — import replaces everything (after a confirm) and rejects files that are not a TempoDojo backup or have a newer `version`, without touching current data. Test: Task 11 `rejects foreign zip` / `rejects newer version`.

---

## File Structure

```
libs/core/ladder/src/
  types.ts          Exercise, PatternLine, Targets, Rank, Progress, Track
  pattern.ts        parseSteps / formatToken (token grammar)
  rules.ts          rankFor, nextTarget, applyClean, isTierUnlocked, unlockedExercises, nextUp, exerciseSettings, rankTestSettings, checklistFor
  catalogue/hands.ts, coordination.ts, feet.ts, index.ts   data
  *.spec.ts
libs/core/practice/src/
  types.ts          PracticeEvent, Session, WeeklyTarget
  sessions.ts       toSessions, playIntervals
  stats.ts          weekStats, totals, timeBy, heatmap, weeklyProgress
libs/adapters/storage/src/
  db.ts (v2), progress-repository.ts, event-repository.ts, prefs-repository.ts, backup.ts
apps/studio-web/src/
  app/App.tsx, app/TabBar.tsx, app/app.css
  practice/usePracticeLog.ts
  ladder/LadderScreen.tsx, ExerciseScreen.tsx, PatternView.tsx, RankTestSheet.tsx, useLadder.ts, ladder.css
  today/TodayScreen.tsx, StatsBlock.tsx, today.css
  settings/BackupSection.tsx
```

---

### Task 1: core-ladder library, types, pattern grammar

**Files:** Create `libs/core/ladder` (Nx `@nx/js:lib`, vitest, tags `scope:core,type:lib`, `lib: ["es2022"]`, `types: []`, `passWithNoTests`), `src/types.ts`, `src/pattern.ts`, `src/pattern.spec.ts`. Planner does the scaffold (config); implementer does `pattern.ts`.

**Interfaces — Produces:**
```ts
export type Track = 'hands' | 'coordination' | 'feet';
export type Rank = 'unranked' | 'bronze' | 'silver' | 'gold' | 'master';
export const RANKS: Rank[];                       // in order
export type Voice = 'hands' | 'kick' | 'hihat';   // hihat = hi-hat foot
export interface PatternLine { voice: Voice; steps: string }   // one bar, tokens separated by single spaces
export interface Targets { bronze: number; silver: number; gold: number; master: number }
export interface Exercise {
  id: string; track: Track; tier: number; name: string; focus: string;
  meter: Meter; subdivision: Subdivision; pattern: PatternLine[]; targets: Targets;
  transferTip?: string; requiresDoublePedal?: boolean; family?: string;
}
export interface Progress { exerciseId: string; workingBpm: number | null; bestCleanBpm: number | null; rank: Rank; totalSeconds: number; lastPracticedAt: number | null }
export interface Step { rest: boolean; hand: 'R' | 'L' | 'K' | 'H' | null; accent: boolean; ghost: boolean; grace: 'flam' | 'drag' | 'buzz' | null }
export function parseSteps(steps: string): Step[];   // throws Error(`Bad token "${t}"`) on invalid input
```
Token grammar (one token per subdivision slot): `-` rest, or `[>]? [(]? [f|d|z]? (R|L|K|H) [)]?` — `>` accent, `( )` ghost (must be balanced), `f` flam, `d` drag, `z` buzz. Accent and ghost together is invalid.

- [ ] **Step 1: Failing tests** (`pattern.spec.ts`): `">R L R R"` → 4 steps, first `{accent:true,hand:'R'}`; `"(L)"` ghost L; `">fR"` accent flam; `"dL"` drag; `"zR"` buzz; `"-"` rest; `"K H - K"` kick/hihat; invalid: `">(R)"`, `"(R"`, `"X"`, `"fK"` (grace on feet), `"R  L"` (double space) all throw `Bad token`.
- [ ] **Step 2:** `npx nx test core-ladder` → FAIL.
- [ ] **Step 3:** Implement `parseSteps`.
- [ ] **Step 4:** Tests PASS; lint/typecheck PASS.
- [ ] **Step 5: Commit** `feat(core-ladder): types and pattern grammar`

---

### Task 2: Exercise catalogue (data)

**Files:** Create `libs/core/ladder/src/catalogue/{hands,coordination,feet,index}.ts`, `catalogue.spec.ts`. Implementer authors data; planner reviews against research and then the **user (a drummer) reviews the hands stickings** before merge.

**Interfaces — Produces:** `export const CATALOGUE: Exercise[]` (hands, then coordination, then feet; ordered by tier then teaching order) and `export function exerciseById(id: string): Exercise | undefined`.

Content rules:
- **Hands:** exactly the 40 PAS International Drum Rudiments, ids `pas-01`…`pas-40` by PAS number, tiers per research 01 §1.2 (Vic Firth): T1 (6): 1 single stroke roll, 6 double stroke open roll, 4 multiple bounce roll, 16 single paradiddle, 20 flam, 31 drag. T2 (10): 7 five, 9 seven, 10 nine stroke roll, 17 double paradiddle, 19 single paradiddle-diddle, 21 flam accent, 22 flam tap, 24 flam paradiddle, 32 single drag tap, 38 single ratamacue. T4 (5): 18 triple paradiddle, 26 flam paradiddle-diddle, 30 flam drag, 36 drag paradiddle #1, 37 drag paradiddle #2. T3: the remaining 19. Each pattern is one PAS-standard cycle (right-hand lead) in the token grammar, with standard accents; meter/subdivision chosen so the cycle fills whole bars (e.g. paradiddle 2/4 sixteenths `">R L R R >L R L L"`; flam accent 2/4 triplets `">fR L R >fL R L"`). Targets per family from research 01 §2.5: singles 70/100/135/170; doubles & buzz 75/110/145/180; short rolls 65/90/120/145; single & double paradiddles 65/95/125/155; paradiddle-diddle & triple paradiddle 60/85/110/135; basic flams 55/80/105/130; triplet flams (flam accent, swiss army triplet) 65/95/125/150; complex flams 55/75/100/125; basic drags 55/75/95/115; ratamacues & drag paradiddles 45/65/85/105. `family` holds the family name. Each has a 1–2 line `focus` and a `transferTip` (e.g. paradiddle: "Right hand on hi-hat, left ghosted on snare, kick on 1 and 3").
- **Coordination:** 6 tiers following research 02 §4 table, 3–4 exercises per tier (ids `coord-<tier>-<n>`), each with `hands`, `kick`, and `hihat` lines in 4/4 (one bar), subdivision 2 or 4. Tier 1 pulse & pairing (60–75 → targets 60/70/80/95); tier 2 hi-hat 2&4 + syncopated kick (70/80/90/105); tier 3 ghost notes & "3 bars groove + 1 bar fill" (70/80/95/110); tier 4 rudiments over feet incl. paradiddle split hat/snare (60/75/90/105); tier 5 baião and samba feet under hands (70/85/100/120); tier 6 4-way independence (65/75/85/100).
- **Feet:** tiers 1–4 single pedal (ids `feet-<tier>-<n>`, 2–3 each): T1 kick quarters/8ths heel-down control (60/80/100/120, 8ths); T2 heel-up 8ths and 16th bursts (70/90/110/130); T3 single-foot doubles and kick 16ths (60/75/90/110, 16ths); T4 hi-hat foot quarters/8ths/2&4 chick against kick (70/90/110/130). Tiers 5–6 `requiresDoublePedal: true` (2 each): T5 double-kick singles (60/90/120/150, 16ths); T6 double-kick doubles and a foot paradiddle (55/75/95/115, 16ths). On double-pedal exercises the `kick` line uses `R`/`L` for right/left foot (the grammar already allows them), a `hihat` line is optional, and there is no `hands` line; all other feet exercises use `K` and `H`.

- [ ] **Step 1: Failing tests** (`catalogue.spec.ts`, planner-written): ids unique; hands has exactly ids `pas-01`…`pas-40` with tiers counts 6/10/19/5 and the T1/T2/T4 membership listed above; every pattern line parses with `parseSteps`; every line's token count equals `pulsesPerBar(meter) * subdivision`; targets strictly increasing bronze<silver<gold<master; tiers within a track are contiguous from 1; coordination has 6 tiers each with ≥3 exercises and every coordination exercise has `kick` and `hihat` lines; feet tiers 1–4 have no `requiresDoublePedal`, tiers 5–6 all have it; every exercise has non-empty `focus`; `exerciseById('pas-16').name === 'Single Paradiddle'`.
- [ ] **Step 2:** FAIL. **Step 3:** author data. **Step 4:** PASS.
- [ ] **Step 5: User review** of hands stickings (print a table: id, name, tier, pattern, targets); fix any the user flags.
- [ ] **Step 6: Commit** `feat(core-ladder): exercise catalogue`

---

### Task 3: Ladder rules

**Files:** Create `libs/core/ladder/src/rules.ts`, `rules.spec.ts`.

**Interfaces — Consumes:** Tasks 1–2; `Automator`, `MetronomeSettings`, `DEFAULT_SETTINGS`, `resizeAccents`, `pulsesPerBar` from core-metronome. **Produces:**
```ts
export function emptyProgress(exerciseId: string): Progress;
export function rankFor(bpm: number | null, t: Targets): Rank;
export function nextTarget(rank: Rank, t: Targets): { rank: Rank; bpm: number } | null;   // null at master
export function applyClean(p: Progress, bpm: number, ex: Exercise): Progress;                // never lowers best/rank; sets workingBpm = max(working ?? 0, bpm)
export function isTierUnlocked(track: Track, tier: number, catalogue: Exercise[], progress: Map<string, Progress>, hasDoublePedal: boolean): boolean;
export function visibleExercises(catalogue: Exercise[], hasDoublePedal: boolean): Exercise[];
export function nextUp(catalogue: Exercise[], progress: Map<string, Progress>, hasDoublePedal: boolean): Exercise[];
export function exerciseSettings(ex: Exercise, p: Progress, base: MetronomeSettings): MetronomeSettings;
export function rankTestSettings(ex: Exercise, bpm: number, base: MetronomeSettings): MetronomeSettings;
export interface ChecklistItem { id: string; label: string }
export function checklistFor(ex: Exercise): ChecklistItem[];
export const RANK_TEST_BARS = 8;
```
Rules: `rankFor` highest rank whose target ≤ bpm. `exerciseSettings`: base with exercise meter/subdivision, accents from the hands line (accented step on a pulse → `'accent'`, else `'normal'`; pulse 0 accent if none), bpm = working ?? bronze − 10 (min 20), speed-up from that bpm toward `nextTarget` bpm, step 2 if gap ≤ 10 else 5, every 4 bars, gap null. `rankTestSettings`: same meter/accents, bpm, speedUp null, gap {2,2}, countInBars 1.

- [ ] **Step 1: Failing tests:** rankFor at below/at/above each threshold; nextTarget from unranked → bronze, master → null; `lower log keeps best and rank` (apply 130 then 100 → best 130); applyClean upgrades rank; unlock: tier 1 open, tier 2 locked until all tier-1 ≥ bronze, then open; double-pedal tiers hidden and not blocking; nextUp picks touched-first then lowest rank then order, 2 hands + 1 coord + 1 feet, skips master and locked; exerciseSettings for `pas-16` with no progress → bpm 55, meter 2/4, subdivision 4, accents ['accent','accent'] (both paradiddle halves start accented), speedUp {55→65, step 2, every 4}; rankTestSettings gap {2,2}, countIn 1, speedUp null; checklistFor hands has 3 items, coordination 4.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `feat(core-ladder): rank, unlock and next-up rules`

---

### Task 4: core-practice library

**Files:** Create `libs/core/practice` (scaffold by planner as Task 1), `src/types.ts`, `sessions.ts`, `stats.ts`, specs.

**Interfaces — Produces:**
```ts
export type PracticeSource = { kind: 'metronome' } | { kind: 'exercise'; exerciseId: string; track: Track } | { kind: 'song'; songId: string };
export interface PracticeEvent { id: string; type: 'play' | 'stop'; at: number; source: PracticeSource }   // at = epoch ms
export interface Interval { start: number; end: number; source: PracticeSource }
export interface Session { start: number; end: number; playedMs: number; intervals: Interval[] }
export const SESSION_GAP_MS = 600_000; export const MAX_OPEN_PLAY_MS = 1_800_000;
export function playIntervals(events: PracticeEvent[], now: number): Interval[];   // sorted by at; unmatched play capped at min(next event, play+30min, now)
export function toSessions(intervals: Interval[]): Session[];
export interface WeeklyTarget { sessions: number; minutes: number }   // default { sessions: 4, minutes: 120 }
export const DEFAULT_WEEKLY_TARGET: WeeklyTarget;
export function weekStart(at: number): number;                          // local Monday 00:00
export function weeklyProgress(sessions: Session[], target: WeeklyTarget, now: number): { sessions: number; minutes: number; met: boolean };
export function averageSessionMinutes(sessions: Session[]): number;   // 0 when none; rounded to 1 decimal
export function sessionsPerWeek(sessions: Session[], weeks: number, now: number): number[];  // oldest→newest, length = weeks
export function timeBySource(intervals: Interval[]): { metronome: number; hands: number; coordination: number; feet: number; song: number; byExercise: Record<string, number> };   // ms
export function practiceDays(sessions: Session[], from: number, to: number): Map<string, number>;   // 'YYYY-MM-DD' local → played minutes
```
- [ ] **Step 1: Failing tests:** play/stop pairs → intervals; two plays 5 min apart → one session; 11 min gap → two sessions; session length = first start→last end; `unmatched play is capped` (play then nothing for 2 h → 30 min; play then another play 10 min later → first capped at 10 min); weeklyProgress met by sessions or by minutes; weekStart is Monday local; sessionsPerWeek length/order; timeBySource attributes exercise time to its track and id; practiceDays keys and minutes.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `feat(core-practice): sessions and stats`

---

### Task 5: Storage v2

**Files:** Modify `libs/adapters/storage/src/db.ts`; create `progress-repository.ts`, `event-repository.ts`, `prefs-repository.ts`, specs; export from `index.ts`. Add deps on `core-ladder`, `core-practice`.

**Interfaces — Produces:** Dexie `version(2)` adding `progress: 'exerciseId, lastPracticedAt'`, `events: 'id, at'` (v1 stores unchanged).
```ts
export interface ProgressRepository { all(): Promise<Map<string, Progress>>; get(id: string): Promise<Progress>; put(p: Progress): Promise<void>; replaceAll(ps: Progress[]): Promise<void> }
export interface EventRepository { add(e: PracticeEvent): Promise<void>; since(at: number): Promise<PracticeEvent[]>; all(): Promise<PracticeEvent[]>; replaceAll(es: PracticeEvent[]): Promise<void> }
export interface Prefs { weeklyTarget: WeeklyTarget; hasDoublePedal: boolean }
export const DEFAULT_PREFS: Prefs;
export interface PrefsRepository { load(): Promise<Prefs>; save(p: Prefs): Promise<void> }
export function createDexieRepositories(dbName?: string): { presets: PresetRepository; progress: ProgressRepository; events: EventRepository; prefs: PrefsRepository; db: TempoDojoDb };
```
`get` returns `emptyProgress(id)` when missing. Prefs stored in `kv` under `'prefs'`, merged over defaults on load. `createDexiePresetRepository` keeps working (shares the same db).

- [ ] **Step 1: Failing tests:** `v1 database upgrades keeping presets` (open a raw Dexie v1 db with a preset + lastSettings, then createDexieRepositories on the same name → preset listed, lastSettings loads); progress put/get/all, get missing → empty; events add/since ordered by at; prefs defaults then save/load merge; replaceAll clears then writes.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `feat(storage): schema v2 with progress, events, prefs`

---

### Task 6: Metronome reuse and practice logging (app)

**Files:** Modify `apps/studio-web/src/metronome/useMetronome.ts` (planner); create `apps/studio-web/src/practice/usePracticeLog.ts`, spec.

**Interfaces:**
- `useMetronome(deps, opts?: { initial?: MetronomeSettings; persist?: boolean; source?: PracticeSource; onTransport?: (type: 'play' | 'stop', source: PracticeSource) => void })` — `persist` default true; when false, never calls `loadLast`/`saveLast`; `initial` overrides defaults; `onTransport` fires on start/stop with `source` (default `{kind:'metronome'}`).
- `usePracticeLog(repo: EventRepository, now = Date.now, makeId = crypto.randomUUID)` → `{ record(type, source): void }` writes an event.
- The engine is a single shared `WebAudioMetronome` for the whole app (one AudioContext): starting playback on one screen stops any other screen's playback (`MetronomeDeps` gains `engine` sharing; switching tabs stops playback).

- [ ] **Step 1: Failing tests:** `exercise session does not persist last settings` (persist:false → saveLast never called, loadLast never called); `initial` applied on mount; onTransport called with source on play and stop; usePracticeLog writes `{type, at, source, id}`.
- [ ] **Step 2–4:** FAIL → implement → PASS (existing Plan 1 tests stay green).
- [ ] **Step 5: Commit** `feat(studio-web): metronome reuse options and practice event log`

---

### Task 7: App shell and tabs

Design: extend the established world (DESIGN.md); Impeccable `impeccable context --target apps/studio-web/src/app/App.tsx` then craft-floor before UI edits. The tab bar is the one the Plan 1 contract deferred.

**Files:** Modify `apps/studio-web/src/app/app.tsx`; create `TabBar.tsx`, `app.css`, `App.spec.tsx`.

**Interfaces:** `App` holds `tab: 'today' | 'ladder' | 'metro'` (default `'today'`, remembered in `kv` key `'lastTab'` via a small hook), renders the screen and a bottom `TabBar` (role `tablist`, three `tab`s "Today", "Ladder", "Metro", `aria-selected`), and stops playback when switching tabs. Opening an exercise (from Today or Ladder) shows `ExerciseScreen` in place with a "Back" control. Tab bar in Franklin 800 caps, active tab ink with teal 4 px underline (Teal Means Chosen), 64 px tall, safe-area aware; on iPad landscape it stays at the bottom.

- [ ] **Step 1: Failing tests:** default tab Today; clicking Metro shows the metronome screen; aria-selected follows; switching tabs while playing calls engine.stop.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `feat(studio-web): app shell with Today, Ladder, Metro tabs`

---

### Task 8: Ladder screen and Exercise screen

Design: Impeccable surface round for the **Ladder** screen (`concept-seed --scope surface --mode operate`, structures only, world fixed); the Exercise screen extends the Metro screen's composition (same heading, notation line, transport).

**Files:** Create `apps/studio-web/src/ladder/{useLadder.ts,LadderScreen.tsx,ExerciseScreen.tsx,PatternView.tsx,ladder.css}`, specs.

**Interfaces:**
- `useLadder(repos)` → `{ catalogue, progress: Map, prefs, unlocked(ex): boolean, logClean(ex, bpm): Promise<void>, setWorking(ex, bpm): Promise<void>, addTime(ex, seconds): Promise<void>, setPrefs(p) }`.
- `LadderScreen({ onOpen(ex) })`: track switcher (Hands · Coordination · Feet as a segmented control), tiers as sections ("Tier 1"…), each exercise row: name, rank word + best clean tempo (`Best 96 · 16ths`) or "Not started", next target (`Next: Silver 95`), locked rows dimmed with "Locked — reach Bronze on every tier 1 exercise" and not openable; Feet shows the "I have a double pedal" checkbox (prefs) that reveals tiers 5–6.
- `PatternView({ exercise })`: renders each `PatternLine` as a row of Caslon glyphs (R/L, K, H) one per slot, accents `>` above, ghosts in parentheses, flam/drag graces as small Caslon letters before the main stroke, rests as `·`; row label (Hands / Kick / Hi-hat foot) in Franklin caps; wraps whole beats.
- `ExerciseScreen({ exercise, onBack })`: running head (Back · track/tier), heading = exercise name (Caslon), `focus` text, `PatternView`, targets row (four ranks with BPM + note value; current rank marked with the teal underline; locked targets above next are soft ink), working-tempo BPM readout + nudges + Play (reusing `useMetronome` with `persist:false`, `initial = exerciseSettings(...)`, `source = {kind:'exercise',...}`), "Log clean tempo" (opens a small numeric prompt prefilled with the current BPM → `logClean`), "Rank test" (Task 9), transfer tip shown when rank ≥ bronze, coordination shows "Feet first: play the feet line alone for a minute" note. Leaving updates `workingBpm` to the last BPM used and adds played seconds to `totalSeconds`.

- [ ] **Step 1: Failing tests:** ladder lists all 40 hands rows in 4 tier sections; tier 2 rows locked on fresh progress; clicking a locked row does nothing; double-pedal checkbox reveals feet tiers 5–6; PatternView for `pas-16` shows 8 glyphs with 2 accents; ExerciseScreen opens with BPM 55 for fresh `pas-16`; Log clean 70 → rank Bronze shown, tier label updates; leaving after nudging to 60 stores workingBpm 60; transfer tip hidden at unranked, shown at bronze; exercise play does not change Metro's last settings.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `feat(studio-web): ladder and exercise screens`

---

### Task 9: Rank test sheet

**Files:** Create `apps/studio-web/src/ladder/RankTestSheet.tsx`, spec.

**Interfaces:** `RankTestSheet({ open, exercise, progress, engine-bound controls via props: start(settings), stop(), position, onClaim(bpm), onClose })`. Flow: step 1 shows the target (`Silver · 95 BPM · 16ths`, choosable among ranks above current) and "Start test" → starts `rankTestSettings` (1 count-in bar, then 8 bars 2 on/2 off) and shows "Bar n of 8"; after bar 8 it stops itself; step 2 the checklist (`checklistFor`) as checkboxes; "Claim Silver" enabled only when all ticked → `onClaim(95)`; "Not yet" closes without changes.

- [ ] **Step 1: Failing tests:** default target = next rank; start calls engine with gap {2,2} and the target bpm; after position bar 8 ends (simulate events) the checklist appears; claim disabled until all ticked; claim calls onClaim(target bpm); Not yet calls onClose only.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `feat(studio-web): self-judged rank test`

---

### Task 10: Today screen and stats

Design: Impeccable surface round for **Today** (structures only, world fixed).

**Files:** Create `apps/studio-web/src/today/{TodayScreen.tsx,StatsBlock.tsx,today.css}`, specs.

**Interfaces:** `TodayScreen({ onOpen(ex), onOpenMetro() })`: heading with the week ("This week"), weekly target progress set as text ("3 of 4 sessions · 96 of 120 min", met → "Target met"), Next up list (from `nextUp`, each row like the ladder rows, opens the exercise), a "Plain metronome" action, and `StatsBlock`: average session length, sessions per week for the last 8 weeks (a small bar row drawn in ink, no chart library), time by track this week, and a practice-day calendar for the last 12 weeks (squares, ink density by minutes, legend; never streak counts). Weekly target editable (sessions 1–14, minutes 15–1200) in a Sheet; saved to prefs.

- [ ] **Step 1: Failing tests:** fresh data → Next up shows `pas-01`, `pas-06`, `coord-1-1`, `feet-1-1` (per nextUp), stats show "No sessions yet"; with seeded events: "1 of 4 sessions"; target met text; editing target saves prefs; calendar renders 84 day cells with the right number marked; no element contains the word "streak".
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `feat(studio-web): Today with next up and practice stats`

---

### Task 11: Backup export / import

**Files:** Create `libs/adapters/storage/src/backup.ts`, spec; `apps/studio-web/src/settings/BackupSection.tsx`, spec (placed in the Today screen's target sheet as "Backup"). Add dep `fflate`.

**Interfaces:**
```ts
export interface BackupData { version: 1; exportedAt: number; presets: Preset[]; lastSettings: MetronomeSettings | null; progress: Progress[]; events: PracticeEvent[]; prefs: Prefs }
export async function exportBackup(repos): Promise<Uint8Array>;            // zip with tempodojo.json
export async function readBackup(zip: Uint8Array): Promise<BackupData>;    // throws BackupError('not-a-backup' | 'newer-version' | 'corrupt')
export async function importBackup(repos, data: BackupData): Promise<void>; // replaces all stores
```
UI: "Export backup" downloads `tempodojo-backup-YYYY-MM-DD.zip`; "Import backup" file input → `readBackup` → confirm "Replace everything on this device with the backup from <date>?" → import → reload state.

- [ ] **Step 1: Failing tests:** round trip export→read→import into a fresh db reproduces presets, progress, events, prefs, lastSettings; `rejects foreign zip` (zip without tempodojo.json → not-a-backup, existing data untouched); `rejects newer version` (version 2 → newer-version); corrupt bytes → corrupt.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `feat: progress backup export and import`

---

### Task 12: Finish review, documentation, device check

- [ ] **Step 1:** `npx nx run-many -t test lint typecheck build` → all PASS.
- [ ] **Step 2:** Capture Today, Ladder (each track), Exercise (hands and coordination), Rank test (both steps), stats with seeded demo data (labelled synthetic), at 390×844, 1180×820, and night page; animations disabled for captures.
- [ ] **Step 3:** Impeccable finish reviewer with the surface briefs; apply fix rounds (two, then ask the user).
- [ ] **Step 4:** Impeccable documenter updates `apps/studio-web/DESIGN.md` (merge).
- [ ] **Step 5:** User device check on Android phone and iPad: open an exercise, practice, log a clean tempo, run a rank test, see Today update, export a backup and import it on the other device.
