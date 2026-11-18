# TempoDojo Plan 1 — Workspace & Metronome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An Nx workspace and a standalone, installable metronome web app (Tempo-parity core) that the user can run from their Android phone and iPad at the kit.

**Architecture:** Pure-TypeScript core library `core-metronome` computes *what* to click and *when* (tempo/meter/accent/Automator math and a click timeline) with no platform imports. Adapter library `audio-web` drives that timeline with a Web Audio lookahead scheduler and synthesized click voices; `storage` persists presets in IndexedDB via Dexie. The React app `studio-web` is a thin UI over these.

**Tech Stack:** Nx 24.0.3 (npm), TypeScript 6, Vite, React 19, Vitest 4, @testing-library/react, Dexie 4 + fake-indexeddb (tests), vite-plugin-pwa, Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-11-19-tempodojo-design.md` (§3 Metronome, §7 How it's made, §8 step 1 and 4). Plans 2 (ladder + stats) and 3 (Song Lab) follow separately.

## Global Constraints

- Workspace root is the repo root `C:\repo\TempoDojo`; package manager npm; Nx 24.0.3 (match the user's other Nx repo).
- Core libraries (`libs/core/*`) import nothing from React, DOM, Web Audio, Dexie, or any adapter. Enforced two ways: their `tsconfig.lib.json` `"lib": ["ES2022"]` (no `"DOM"`), and Nx `@nx/enforce-module-boundaries` tags: `scope:core` may depend only on `scope:core`; `scope:adapter` on `scope:core|adapter`; `scope:ui` on `scope:core|ui`; `type:app` on anything.
- Core public API is exported only from each lib's `src/index.ts`; apps never deep-import.
- Tempo range 20–400 BPM. Meter: 1–16 beats over denominator 2/4/8. Subdivisions (clicks per beat unit): 1, 2, 3, 4, 5, 6. Count-in 0–2 bars.
- Beat unit is explicit: X/2→half, X/4→quarter, X/8→eighth, with a dotted-quarter switch for 6/8, 9/8, 12/8 (then pulses per bar = beats/3). BPM counts beat units.
- Accent cycle on tap: accent → normal → ghost → mute → accent.
- Automator tempo changes and gap mutes happen exactly at bar boundaries.
- Timing: clicks scheduled on the AudioContext clock with 25 ms scheduler tick, 100 ms schedule-ahead.
- Target devices: Android Chrome and iPad Safari; layouts for phone portrait and iPad portrait/landscape.
- Visual direction per spec §7.3 / PRD §4 tokens: `--bg-chassis #0B0C0E`, `--bg-module #131519`, `--bg-well #08090A`, `--border-hairline #23262E`, `--accent-downbeat #FF4F00`, `--accent-subbeat #00E5FF`; fonts Space Grotesk 700 (display), JetBrains Mono tabular-nums (BPM/timers), Inter (labels). Transport pads ≥ 64×64 px in the bottom thumb zone; BPM readable at 1.5–2 m.
- No mic, MIDI, recording, accounts, or backend.
- Out of this plan: random-mute Automator mode (spec allows deferring), practice-session event logging (Plan 2 adds it on top of `onEvent`/play-stop), anything ladder or Song Lab.

## Review Focus

1. **Tempo/settings edited while playing** — expect the change to take effect from the next pulse with no doubled, dropped, or burst clicks. Test: Task 4 `update() mid-bar`.
2. **Tab hidden / screen locked then resumed** — expect no burst of overdue clicks; late events are skipped and the beat grid continues. Test: Task 6 `skips events already in the past`.
3. **Speed-up config where target < start, step 0, or every 0** — expect slow-down ramps to work and invalid step/every to be rejected by `normalizeSettings`. Tests: Task 3 `descending ramp`, Task 2 `normalizes invalid automator`.
4. **Changing time signature with custom accents** — expect existing beats to keep their levels, new beats normal, beat 1 never lost when lengthening. Test: Task 2 `resizeAccents`.
5. **iPad first play / suspended AudioContext / silent switch** — expect the first Play tap to resume audio and clicks to be audible; `navigator.audioSession.type = 'playback'` set when available. Test: Task 6 `resumes suspended context on start`.

---

## File Structure

```
apps/studio-web/                    React app (Vite, PWA)
  src/main.tsx, src/app/App.tsx
  src/metronome/                    screen + components + hooks
  src/styles/tokens.css
libs/core/metronome/  (scope:core)  name: @tempodojo/core-metronome
  src/types.ts                      settings & event types
  src/meter.ts                      pulse math, accents, normalizeSettings
  src/automator.ts                  barTempo, isBarMuted
  src/timeline.ts                   ClickTimeline
  src/tap-tempo.ts                  TapTempo
  src/presets.ts                    Preset type + PresetRepository interface
  src/index.ts
libs/adapters/audio-web/ (scope:adapter)  @tempodojo/audio-web
  src/voices.ts                     click synthesis
  src/scheduler.ts                  LookaheadScheduler (clock-injected)
  src/web-audio-metronome.ts        WebAudioMetronome (real AudioContext glue)
libs/adapters/storage/ (scope:adapter)    @tempodojo/storage
  src/db.ts, src/preset-repository.ts
libs/ui/kit/ (scope:ui)                   @tempodojo/ui-kit
  src/ (Pad, Led, Readout, Sheet components)
```

---

### Task 1: Nx workspace, library skeletons, boundary enforcement

**Files:**
- Create: workspace files at repo root (`nx.json`, `package.json`, `tsconfig.base.json`, `eslint.config.mjs`), `apps/studio-web`, `libs/core/metronome`, `libs/adapters/audio-web`, `libs/adapters/storage`, `libs/ui/kit`
- Create: `.gitignore` (node_modules, dist, .nx, coverage)

**Interfaces:**
- Produces: import paths `@tempodojo/core-metronome`, `@tempodojo/audio-web`, `@tempodojo/storage`, `@tempodojo/ui-kit`; Nx targets `test`, `lint`, `typecheck`, `build` on every project.

- [ ] **Step 1:** Create the workspace with `npx create-nx-workspace@24.0.3 tempodojo --preset=apps --pm=npm --nxCloud=skip` in a temp folder and move its contents (not `.git`) into the repo root. Add plugins `@nx/react`, `@nx/vite`, `@nx/js`, `@nx/eslint` at 24.0.3.
- [ ] **Step 2:** Generate `apps/studio-web` (`@nx/react:app`, bundler vite, unit test runner vitest, no e2e) and the four libs (`@nx/js:lib` for core/adapters with vitest; `@nx/react:lib` for ui-kit) at the paths above with tags from Global Constraints.
- [ ] **Step 3:** Set core lib `tsconfig.lib.json` `"lib": ["ES2022"]`; configure `@nx/enforce-module-boundaries` depConstraints exactly as in Global Constraints.
- [ ] **Step 4: Boundary check.** Temporarily add `import 'react';` and `export const w = window;` to `libs/core/metronome/src/index.ts`; run `npx nx run-many -t lint,typecheck -p core-metronome`. Expected: FAIL (module boundary or type error for both lines). Remove them; rerun. Expected: PASS.
- [ ] **Step 5:** Run `npx nx run-many -t test,lint,typecheck,build`. Expected: all PASS (generated placeholder tests).
- [ ] **Step 6: Commit** `chore: scaffold Nx workspace with core/adapter/ui boundaries`

---

### Task 2: Core types and meter math

**Files:**
- Create: `libs/core/metronome/src/types.ts`, `src/meter.ts`, `src/meter.spec.ts`; export from `src/index.ts`

**Interfaces:**
- Produces:
```ts
export type BeatUnit = 'half' | 'quarter' | 'eighth' | 'dotted-quarter';
export type AccentLevel = 'accent' | 'normal' | 'ghost' | 'mute';
export type Subdivision = 1 | 2 | 3 | 4 | 5 | 6;
export interface Meter { beatsPerBar: number; denominator: 2 | 4 | 8; beatUnit: BeatUnit }
export interface SpeedUp { startBpm: number; targetBpm: number; stepBpm: number; everyBars: number; pyramid: boolean }
export interface Gap { barsOn: number; barsOff: number }
export interface Automator { speedUp: SpeedUp | null; gap: Gap | null }
export interface MetronomeSettings {
  bpm: number; meter: Meter; subdivision: Subdivision;
  accents: AccentLevel[];            // length === pulsesPerBar(meter)
  subdivisionLevel: 'normal' | 'ghost' | 'mute';
  countInBars: 0 | 1 | 2; automator: Automator; soundId: string;
}
export const DEFAULT_SETTINGS: MetronomeSettings; // 120 BPM, 4/4 quarter, sub 1, ['accent','normal','normal','normal'], sub 'ghost', countIn 0, automator {null,null}, soundId 'woodblock'
export function defaultBeatUnit(denominator: 2|4|8): BeatUnit;
export function pulsesPerBar(meter: Meter): number;          // dotted-quarter: beats/3
export function pulseSeconds(bpm: number): number;           // 60 / bpm
export function nextAccent(level: AccentLevel): AccentLevel; // the tap cycle
export function resizeAccents(accents: AccentLevel[], length: number): AccentLevel[];
export function clickPreset2and4(meter: Meter): AccentLevel[]; // 4/4 → ['mute','accent','mute','accent']
export function normalizeSettings(s: MetronomeSettings): MetronomeSettings; // clamps & fixes, never throws
```

- [ ] **Step 1: Write failing tests** in `meter.spec.ts`:
  - `pulsesPerBar({beatsPerBar:6,denominator:8,beatUnit:'eighth'}) === 6`; same with `'dotted-quarter'` → `2`; `{12,8,'dotted-quarter'}` → `4`; `{7,8,'eighth'}` → `7`.
  - `defaultBeatUnit(4) === 'quarter'`, `(8) === 'eighth'`, `(2) === 'half'`.
  - `nextAccent` cycles `accent→normal→ghost→mute→accent`.
  - `resizeAccents(['accent','ghost','mute','normal'], 6)` → `['accent','ghost','mute','normal','normal','normal']`; `resizeAccents(['ghost','normal'], 1)` → `['ghost']`; `resizeAccents([], 3)` → `['accent','normal','normal']`.
  - `clickPreset2and4({4,4,'quarter'})` → `['mute','accent','mute','accent']`.
  - `normalizes invalid automator`: bpm 5 → 20, bpm 999 → 400; `beatsPerBar` 0 → 1, 20 → 16; accents length fixed via `resizeAccents`; `beatUnit:'dotted-quarter'` with beats not divisible by 3 → `defaultBeatUnit`; speedUp with `stepBpm<=0` or `everyBars<1` → `speedUp:null`; speedUp start/target clamped to 20–400; gap with `barsOn<1` or `barsOff<0` → `gap:null`; `countInBars` 5 → 2.
- [ ] **Step 2:** Run `npx nx test core-metronome`. Expected: FAIL (missing exports).
- [ ] **Step 3:** Implement `types.ts` and `meter.ts` with the signatures above.
- [ ] **Step 4:** Run `npx nx test core-metronome`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(core-metronome): settings types and meter math`

---

### Task 3: Automator math

**Files:**
- Create: `libs/core/metronome/src/automator.ts`, `src/automator.spec.ts`

**Interfaces:**
- Consumes: `SpeedUp`, `Gap`, `MetronomeSettings` (Task 2).
- Produces:
```ts
export function barTempo(baseBpm: number, speedUp: SpeedUp | null, barIndex: number): number; // barIndex 0-based, count-in excluded
export function isBarMuted(gap: Gap | null, barIndex: number): boolean;
```

Rules: no speedUp → `baseBpm`. Step k = `floor(barIndex / everyBars)`. Ramp moves from `startBpm` toward `targetBpm` by `stepBpm` per step (direction from sign of target−start), never passing target. Non-pyramid: holds at target. Pyramid: after the first step that reaches target, holds target for one step, then walks back toward start by `stepBpm` per step, then holds at start. Gap: cycle length `barsOn+barsOff`; bar muted iff `barIndex % cycle >= barsOn`.

- [ ] **Step 1: Write failing tests:**
  - `{start:80,target:100,step:5,every:4,pyramid:false}`: bars 0–3 → 80, 4 → 85, 16 → 100, 40 → 100.
  - same with `step:7`: bar 8 → 94, bar 12 → 100 (clamped, not 101).
  - `descending ramp` `{start:120,target:100,step:10,every:2}`: bar 0 → 120, 2 → 110, 4 → 100, 10 → 100.
  - pyramid `{start:80,target:90,step:5,every:1,pyramid:true}`: bars 0..6 → `[80,85,90,90,85,80,80]`.
  - `isBarMuted({barsOn:3,barsOff:1}, b)` for b 0..7 → `[F,F,F,T,F,F,F,T]`; `{2,2}` b 0..3 → `[F,F,T,T]`; `null` → false.
- [ ] **Step 2:** Run `npx nx test core-metronome`. Expected: FAIL.
- [ ] **Step 3:** Implement per Rules.
- [ ] **Step 4:** Run tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(core-metronome): speed-up and gap-click automator`

---

### Task 4: Click timeline

**Files:**
- Create: `libs/core/metronome/src/timeline.ts`, `src/timeline.spec.ts`

**Interfaces:**
- Consumes: Tasks 2–3.
- Produces:
```ts
export interface ClickEvent {
  time: number;        // seconds on the caller's clock
  bar: number;         // count-in bars are negative (-2, -1); first real bar 0
  pulse: number;       // 0-based within bar
  sub: number;         // 0 = on the pulse, 1..subdivision-1 = subdivision clicks
  level: AccentLevel;  // resolved: pulse uses accents[pulse]; sub uses subdivisionLevel; gap-muted bar → 'mute'
  bpm: number;         // tempo of this bar
  countIn: boolean;
}
export class ClickTimeline {
  constructor(settings: MetronomeSettings, startTime: number);
  /** Returns and consumes all events with time < untilTime, in order. */
  take(untilTime: number): ClickEvent[];
  /** Applies new settings from the next pulse boundary not yet taken. Bar/pulse counters continue; if the new meter is shorter than the current pulse index, the next pulse starts a new bar. */
  update(settings: MetronomeSettings): void;
  /** Time of the next untaken event. */
  peekTime(): number;
}
```
Notes: settings pass through `normalizeSettings`. Count-in bars use `settings.bpm`, accents `['accent', then 'normal'…]`, no subdivisions, `countIn: true`. Muted events are still emitted (level `'mute'`) so the UI can show beats during gap bars. Compute each pulse time from the previous one (`+ pulseSeconds(bpm)`), and sub times as `pulseTime + sub * pulseSeconds(bpm)/subdivision`; accumulate from bar start (`barStart + pulse * pulseSeconds`) to avoid floating drift.

- [ ] **Step 1: Write failing tests:**
  - 120 BPM 4/4, sub 1, start 10: `take(12)` → 4 events at `10, 10.5, 11, 11.5`, levels `accent,normal,normal,normal`, bar 0.
  - sub 3 at 60 BPM: first pulse yields times `0, 1/3, 2/3` (toBeCloseTo 9 digits), `sub` 0,1,2, sub levels `ghost`.
  - countIn 1 at 120 4/4 start 0: first 4 events `countIn:true`, bar −1; event at t=2 is bar 0 pulse 0.
  - speedUp `{80→100, step 10, every 1}`: bar 1 pulse 0 time = `4*0.75 = 3`; bar 2 starts at `3 + 4*60/90`.
  - gap `{1,1}`: all bar-1 events level `'mute'`, bar 2 back to accents.
  - `update() mid-bar`: 120 BPM, take(1.0) (pulses at 0, 0.5 taken), `update(bpm 60)`; next events at `1.0, 2.0` (pulse 2, 3), no event between 1.0 and 2.0 except subdivisions; no duplicates of taken times.
  - 6/8 dotted-quarter at 60: pulses 1 s apart, 2 per bar.
  - `long run accuracy`: 120 BPM, take(600) → event 1200's time equals `600` exactly within 1e-9 (no accumulated drift).
- [ ] **Step 2:** Run tests. Expected: FAIL.
- [ ] **Step 3:** Implement `ClickTimeline`.
- [ ] **Step 4:** Run tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(core-metronome): click timeline with count-in, automator, live update`

---

### Task 5: Tap tempo and preset contract

**Files:**
- Create: `libs/core/metronome/src/tap-tempo.ts`, `src/tap-tempo.spec.ts`, `src/presets.ts`

**Interfaces:**
- Produces:
```ts
export class TapTempo {
  /** timestampMs from performance.now(); returns rounded BPM once ≥2 taps, else null. Averages up to the last 4 intervals; a gap > 2000 ms resets; result clamped 20–400. */
  tap(timestampMs: number): number | null;
  reset(): void;
}
export interface Preset { id: string; name: string; settings: MetronomeSettings; updatedAt: number }
export interface PresetRepository {
  list(): Promise<Preset[]>;              // newest updatedAt first
  save(preset: Preset): Promise<void>;    // upsert by id
  remove(id: string): Promise<void>;
  loadLast(): Promise<MetronomeSettings | null>;
  saveLast(settings: MetronomeSettings): Promise<void>;
}
```
- [ ] **Step 1: Failing tests:** taps at 0, 500 → 120; at 0,500,1000,1500,2000 → 120; taps 0,600,1100 → `round(60000/550)=109`; 0, 500, then 3000 → `null` (reset) and next 3500 → 120; taps 0, 100 → 400 (clamped).
- [ ] **Step 2:** Run tests. Expected: FAIL.
- [ ] **Step 3:** Implement `TapTempo`; add `presets.ts` types; export both.
- [ ] **Step 4:** Run tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(core-metronome): tap tempo and preset repository contract`

---

### Task 6: Audio adapter — voices and lookahead scheduler

**Files:**
- Create: `libs/adapters/audio-web/src/voices.ts`, `voices.spec.ts`, `scheduler.ts`, `scheduler.spec.ts`, `web-audio-metronome.ts`, `index.ts`

**Interfaces:**
- Consumes: `ClickTimeline`, `ClickEvent`, `MetronomeSettings`.
- Produces:
```ts
export const VOICES: { id: 'woodblock' | 'rim' | 'beep' | 'cowbell' | 'clave'; label: string }[];
/** Mono samples for one click; accent louder and (for beep) higher than normal; ghost ≈ 30% of normal peak. Never longer than 60 ms. */
export function renderClick(voiceId: string, level: Exclude<AccentLevel,'mute'>, sampleRate: number): Float32Array;

export interface AudioClock { readonly currentTime: number; play(samples: Float32Array, when: number): void }
export interface Ticker { start(fn: () => void, intervalMs: number): void; stop(): void }
export class LookaheadScheduler {
  constructor(clock: AudioClock, ticker: Ticker, opts?: { tickMs?: number; aheadSec?: number }); // defaults 25, 0.1
  start(settings: MetronomeSettings, onEvent?: (e: ClickEvent) => void): void; // timeline starts at clock.currentTime + 0.05
  update(settings: MetronomeSettings): void;
  stop(): void;
  readonly running: boolean;
}
export class WebAudioMetronome {   // real AudioContext + Worker-based ticker; caches rendered clicks per voice/level
  start(settings: MetronomeSettings): Promise<void>; // resumes context; sets navigator.audioSession.type='playback' if present
  update(settings: MetronomeSettings): void;
  stop(): void;
  onEvent(cb: (e: ClickEvent, delayMs: number) => void): () => void; // delayMs = until the click is heard, for UI LEDs
}
```
Scheduler rule: on each tick, `take(clock.currentTime + aheadSec)`; play non-mute events with `time >= clock.currentTime`; **skip** events already in the past (still forward them to `onEvent`). Ticker in the browser is a Web Worker posting every `tickMs` (keeps running when main thread timers are throttled).

- [ ] **Step 1: Failing tests** (`voices.spec.ts`): every voice/level returns length ≤ `0.06*sampleRate`, peak(accent) > peak(normal) > peak(ghost) > 0, peak ≤ 1.
- [ ] **Step 2: Failing tests** (`scheduler.spec.ts`, with a fake clock whose `currentTime` the test advances and a manual ticker):
  - at 120 BPM after start at clock 0 and one tick, plays exactly the events with time < 0.1 (i.e. only the 0.05 downbeat).
  - advancing 2 s in 25 ms ticks plays 4 clicks at `0.05, 0.55, 1.05, 1.55`, each played once.
  - muted accents are not played but are passed to `onEvent`.
  - `skips events already in the past`: jump clock from 0.1 to 5.0 in one tick → no plays for times < 5.0, next play ≥ 5.0 on-grid (`0.05 + 0.5k`).
  - `stop()` → further ticks play nothing; `running` false.
  - `resumes suspended context on start` (`WebAudioMetronome` with a stub context `{state:'suspended', resume: vi.fn()}`): `resume` called once.
- [ ] **Step 3:** Run `npx nx test audio-web`. Expected: FAIL.
- [ ] **Step 4:** Implement; clicks are short synthesized buffers (sine/noise bursts with exponential decay) — exact timbre is the builder's choice.
- [ ] **Step 5:** Run tests. Expected: PASS.
- [ ] **Step 6: Commit** `feat(audio-web): click voices and lookahead scheduler`

---

### Task 7: Storage adapter — presets and last settings

**Files:**
- Create: `libs/adapters/storage/src/db.ts`, `preset-repository.ts`, `preset-repository.spec.ts`, `index.ts`

**Interfaces:**
- Consumes: `PresetRepository`, `Preset`, `MetronomeSettings`, `normalizeSettings`.
- Produces: `export function createDexiePresetRepository(dbName?: string): PresetRepository;` (default db name `tempodojo`, Dexie schema v1: `presets: 'id, updatedAt'`, `kv: 'key'`). `loadLast` returns `normalizeSettings(stored)` so older/invalid data is repaired. Also `export async function requestPersistentStorage(): Promise<boolean>` (calls `navigator.storage?.persist?.()`, false if unavailable).
- [ ] **Step 1: Failing tests** (fake-indexeddb, fresh db name per test): save two presets → `list()` newest first; save same id again → upsert (one entry, new name); `remove` deletes; `loadLast()` null initially; `saveLast` then `loadLast` round-trips; stored settings with `bpm: 900` load as 400.
- [ ] **Step 2:** Run `npx nx test storage`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(storage): Dexie preset repository`

---

### Task 8: App shell and main metronome screen

Visual design task: use the `impeccable` skill for the component/layout pass, within the Global Constraints tokens.

**Files:**
- Create: `apps/studio-web/src/styles/tokens.css`, `src/metronome/MetronomeScreen.tsx`, `src/metronome/useMetronome.ts`, `src/metronome/MetronomeScreen.spec.tsx`; `libs/ui/kit/src/{Pad,Led,Readout}.tsx`
- Modify: `apps/studio-web/src/app/App.tsx`

**Interfaces:**
- Consumes: `WebAudioMetronome`, `TapTempo`, `DEFAULT_SETTINGS`, `nextAccent`, `pulsesPerBar`, `createDexiePresetRepository`.
- Produces: `useMetronome(deps?: { engine?: MetronomeEngineLike; repo?: PresetRepository })` returning `{ settings, setSettings(patch), playing, toggle(), tap(), currentPulse: {bar, pulse} | null }`, where `MetronomeEngineLike = Pick<WebAudioMetronome,'start'|'update'|'stop'|'onEvent'>` (injectable for tests). Settings are saved with `repo.saveLast` (debounced 500 ms) and restored on mount.

Screen content: large BPM readout that also changes tempo by vertical drag (1 BPM per 8 px) and mouse wheel; −5/−1/+1/+5 pads; tap pad; play/stop pad (bottom thumb zone); one LED per pulse lit by `currentPulse` (downbeat orange, others cyan; muted pulses dim); tapping a pulse LED cycles its accent with `nextAccent`; meter and subdivision shown as compact labels that open the settings sheet (Task 9).

- [ ] **Step 1: Failing tests** (RTL, fake engine): dragging the readout up 16 px changes 120→122; +1 changes 120→121 and calls `engine.update` while playing; −5 at 22 → 20 (clamped); play calls `engine.start` with current settings, again calls `stop`; tapping LED 2 changes its accent `normal→ghost`; `onEvent` for pulse 2 marks LED 2 active; restored `loadLast` settings (bpm 90) appear on mount.
- [ ] **Step 2:** Run `npx nx test studio-web`. Expected: FAIL.
- [ ] **Step 3:** Implement hook, screen, ui-kit primitives, tokens.
- [ ] **Step 4:** Run tests. Expected: PASS. Run `npx nx serve studio-web`, open in a phone-sized viewport, press play: clicks audible, LEDs move.
- [ ] **Step 5: Commit** `feat(studio-web): main metronome screen`

---

### Task 9: Settings sheet and presets

**Files:**
- Create: `apps/studio-web/src/metronome/SettingsSheet.tsx`, `PresetsSheet.tsx`, `SettingsSheet.spec.tsx`, `PresetsSheet.spec.tsx`; `libs/ui/kit/src/Sheet.tsx`

**Interfaces:**
- Consumes: `useMetronome`, `resizeAccents`, `defaultBeatUnit`, `clickPreset2and4`, `VOICES`, `PresetRepository`.

Settings sheet controls: beats per bar (1–16) and denominator (2/4/8); dotted-quarter toggle shown only for 6/8, 9/8, 12/8; subdivision (1–6, labelled quarter / 8ths / triplets / 16ths / quintuplets / sextuplets for a quarter beat); subdivision level (normal/ghost/mute); sound (VOICES); count-in (0/1/2); "Click on 2 & 4" button applying `clickPreset2and4`. Presets sheet: list, save current as named preset, load, delete.

- [ ] **Step 1: Failing tests:** changing 4/4→7/8 yields accents length 7 with first 4 preserved and beat unit eighth; selecting 6/8 then dotted-quarter shows 2 LEDs; "Click on 2 & 4" in 4/4 sets `['mute','accent','mute','accent']`; saving a preset named "Paradiddle 90" then loading it restores bpm/meter/accents; deleting removes it from the list.
- [ ] **Step 2:** Run tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(studio-web): metronome settings and presets`

---

### Task 10: Automator panel and practice timer

**Files:**
- Create: `apps/studio-web/src/metronome/AutomatorPanel.tsx`, `PracticeTimer.tsx`, `usePracticeTimer.ts`, specs for both

**Interfaces:**
- Consumes: `Automator`, `SpeedUp`, `Gap`, `useMetronome`.
- Produces: `usePracticeTimer({ playing, onCountdownEnd })` → `{ elapsedSec, countdownSec: number | null, setCountdown(sec | null) }`; elapsed counts only while playing; when countdown reaches 0 it calls `onCountdownEnd` (wired to stop the metronome).

Automator panel: speed-up toggle with start/target/step/every-bars/pyramid fields (defaults start = current bpm, target = bpm+20, step 5, every 4); gap toggle with bars on/off (defaults 3/1; quick picks 4/1, 2/2, 4/4); while running, the screen shows the live bar tempo from events' `bpm` and a "muted" indicator on gap bars.

- [ ] **Step 1: Failing tests:** enabling speed-up with defaults at 100 BPM produces `automator.speedUp = {startBpm:100,targetBpm:120,stepBpm:5,everyBars:4,pyramid:false}`; quick pick 2/2 sets `gap {barsOn:2,barsOff:2}`; timer (fake timers) counts 3 s only while playing; countdown 5 s stops the engine at 5 s.
- [ ] **Step 2:** Run tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(studio-web): automator panel and practice timer`

---

### Task 11: PWA, wake lock, keyboard, deploy

**Files:**
- Create: `apps/studio-web/src/platform/useWakeLock.ts`, `useKeyboardTransport.ts`, specs; PWA icons in `apps/studio-web/public/`
- Modify: `apps/studio-web/vite.config.ts` (vite-plugin-pwa), `apps/studio-web/src/main.tsx` (call `requestPersistentStorage` once)
- Create: `docs/deploy.md`

**Interfaces:**
- Produces: `useWakeLock(active: boolean)` (requests `navigator.wakeLock.request('screen')` when active, re-requests on `visibilitychange` back to visible, releases when inactive; no-op if unsupported). `useKeyboardTransport({ toggle, nudge })`: Space and PageDown/PageUp toggle play (Bluetooth page-turners send these); ArrowUp/ArrowDown nudge ±1 BPM; ignored while focus is in an input.

- [ ] **Step 1: Failing tests:** wake lock requested when active becomes true, released on false, re-requested after visibility returns; Space toggles; PageDown toggles; Space inside an `<input>` does not toggle; ArrowUp calls `nudge(1)`.
- [ ] **Step 2:** Run tests. Expected: FAIL.
- [ ] **Step 3:** Implement hooks; configure vite-plugin-pwa (`registerType: 'autoUpdate'`, precache app shell, manifest name "TempoDojo", `display: 'standalone'`, `orientation: 'any'`, theme/background `#0B0C0E`).
- [ ] **Step 4:** Run tests. Expected: PASS. `npx nx build studio-web` → `dist/apps/studio-web` contains `manifest.webmanifest` and `sw.js`.
- [ ] **Step 5:** Write `docs/deploy.md`: Cloudflare Pages (preferred) or Vercel, build command `npx nx build studio-web`, output `dist/apps/studio-web`, SPA fallback; the user connects their own account.
- [ ] **Step 6: Commit** `feat(studio-web): PWA install, wake lock, keyboard transport`

---

### Task 12: Device acceptance (manual, with the user)

- [ ] **Step 1:** Run all checks: `npx nx run-many -t test,lint,typecheck,build`. Expected: all PASS.
- [ ] **Step 2:** User deploys per `docs/deploy.md` (or serve over LAN HTTPS) and installs to home screen on the **Android phone** and the **iPad**.
- [ ] **Step 3:** Checklist on each device, recorded in the PR description: first Play tap produces sound (iPad with silent mode on, too); 10 minutes at 120 BPM against a reference metronome shows no audible drift; tempo change while playing is seamless; speed-up 80→100 step 5 every 4 bars changes on the downbeat; gap 2/2 mutes the right bars; screen stays awake; app opens offline after install; layout fits phone portrait and iPad portrait/landscape; BPM readable from the throne.
- [ ] **Step 4:** Fix any failures through the normal task loop before calling Plan 1 done.
