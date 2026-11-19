# TempoDojo Plan 3 — Song Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. In this repo, implementers are Gemini 4 Hydrogen (`gemini-4-hydrogen-medium`) workers in Orca worktrees per the gemini-execution skill; the planner writes the failing tests first and integrates.

**Goal:** Add Song Lab: import Guitar Pro files, YouTube links and PDFs; play them with range loops, easy tempo changes, count-in, a loop trainer, track mute/solo, named sections with per-section best tempo and links to ladder exercises; song practice counts in the stats and the backup carries the files.

**Architecture:** A new pure-TS `core-songlab` library owns songs, loop ranges, sections, the loop-trainer step per pass, YouTube id parsing and rate snapping. Three adapters wrap the platforms behind small interfaces: `adapters/notation` (alphaTab), `adapters/youtube` (IFrame API), `adapters/pdf` (pdf.js). Storage goes to Dexie v3 (songs + file blobs) and backup v2 (files inside the zip). The app gains a Songs tab with a library and one player screen per source kind; screens take the adapter interfaces as props so they are tested with fakes.

**Tech Stack:** as Plans 1–2 plus `@coderline/alphatab@1.9.0` (with its Vite plugin `@coderline/alphatab/vite`), `pdfjs-dist@6.5.438`, YouTube IFrame Player API (script from `https://www.youtube.com/iframe_api`, network required).

**Spec:** `docs/superpowers/specs/2026-11-19-tempodojo-design.md` §5 (Song Lab), §6 (song time in stats), §7.1 (imported files, backup, storage use), §7.2 (library layout), §8 step 3. Design system: `apps/studio-web/DESIGN.md`.

## Global Constraints

- All Plan 1–2 constraints hold. `core-songlab` (`libs/core/songlab`, `@tempodojo/core-songlab`, tags `scope:core,type:lib`) has no React/DOM/alphaTab/YouTube/pdf.js imports; it may import `@tempodojo/core-metronome` (the speed-up stepping in `automator.ts`).
- Adapters: `libs/adapters/notation` (`@tempodojo/notation`), `libs/adapters/youtube` (`@tempodojo/youtube`), `libs/adapters/pdf` (`@tempodojo/pdf`), tags `scope:adapter,type:lib`.
- Sources: Guitar Pro `.gp .gp3 .gp4 .gp5 .gpx .gp7` and MusicXML `.xml .musicxml .mxl` (alphaTab); YouTube links (`youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`, `youtube.com/embed/`, `m.youtube.com`); PDF.
- Tempo: GP 25–150 % of the file tempo (step buttons ±5 %, ±1 %); YouTube rates snap to 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2.
- Loop trainer: start %, target %, step %, every N passes; the speed for pass n uses the metronome Automator's stepping (`barTempo` with `everyBars = everyPasses`, `pyramid: false`).
- Count-in: GP via alphaTab's count-in (on by default); YouTube only when the song has a BPM: one bar of 4 clicks on TempoDojo's engine before each pass; no BPM → no count-in, and the toggle says why.
- Clocks: TempoDojo's click is never synced to external playback (spec §5.2).
- Files live in IndexedDB as blobs; deleting a song deletes its file. Settings shows storage use (`navigator.storage.estimate()`).
- Backup v2: zip with `tempodojo.json` (`version: 2`, adds `songs`) plus `files/<fileId>` entries; v1 backups still import (no songs). Newer than 2 → `newer-version`.
- Practice events for songs use `{ kind: 'song', songId }`; Today's "Time this week" gains a "Songs" row.
- Tabs become Today · Ladder · Songs · Metro.
- Wake lock while any song plays. Mobile notation reflow: 2 bars per row under 600 px wide, 4 above.

## Review Focus

1. **A GP file alphaTab cannot read** (corrupt, unsupported) — import shows "This file could not be opened as a Guitar Pro or MusicXML score." and stores nothing. Test: Task 5 `rejects an unreadable score`.
2. **A loop end before its start, or past the song's end** — ranges are ordered and clamped (bars 1..barCount, seconds 0..duration, at least 1 bar / 1 s). Test: Task 1 `normalizeRange orders and clamps`.
3. **Deleting a song** removes its file blob and its sections, and does not touch other songs. Test: Task 2 `remove deletes the file too`.
4. **A backup with songs imported into an app that has other songs** — replaces everything, file bytes intact. Test: Task 2 `v2 round trip keeps file bytes`.
5. **A YouTube link with extra parameters or a timestamp** (`&t=42s`, `?si=…`, `list=…`) still parses to the 11-char id; non-YouTube links are refused. Test: Task 1 `parseYoutubeId`.

---

## File Structure

```
libs/core/songlab/src/
  types.ts        Song, SongKind, LoopRange, Section, LoopTrainer, ScoreInfo
  ranges.ts       normalizeRange, rangeLabel, sectionsFromMarkers
  trainer.ts      trainerPercent, clampGpPercent, snapYoutubeRate, YOUTUBE_RATES
  youtube-id.ts   parseYoutubeId
  progress.ts     recordSectionClean, newSection
  *.spec.ts
libs/adapters/storage/src/
  db.ts (v3), song-repository.ts, backup.ts (v2)
libs/adapters/notation/src/   notation-player.ts (interface), alphatab-player.ts, score-helpers.ts (+spec)
libs/adapters/youtube/src/    video-player.ts (interface), youtube-player.ts
libs/adapters/pdf/src/        pdf-doc.ts (interface + pdf.js impl)
apps/studio-web/src/songs/
  useSongs.ts, SongsScreen.tsx, AddYoutubeSheet.tsx, songs.css
  GpPlayerScreen.tsx, YoutubePlayerScreen.tsx, PdfViewerScreen.tsx, player.css
  SectionsSheet.tsx, TrainerControls.tsx, useLoopTrainer.ts, TracksSheet.tsx
```

---

### Task 1: core-songlab library

**Files:** Create `libs/core/songlab` (Nx lib, same setup as `core-practice`: bundler resolution, `lib: ["es2022"]`, `types: []`, passWithNoTests off), files above; specs `ranges.spec.ts`, `trainer.spec.ts`, `youtube-id.spec.ts`, `progress.spec.ts`.

**Interfaces (Produces):**
```ts
export type SongKind = 'gp' | 'youtube' | 'pdf';
export type LoopRange = { kind: 'bars'; startBar: number; endBar: number } | { kind: 'time'; startSec: number; endSec: number }; // bars 1-based inclusive
export interface Section { id: string; name: string; range: LoopRange; bestCleanPercent: number | null; exerciseId: string | null; fromFile: boolean }
export interface LoopTrainer { startPercent: number; targetPercent: number; stepPercent: number; everyPasses: number }
export interface Song {
  id: string; title: string; kind: SongKind;
  fileId: string | null;        // gp / pdf blob
  fileName: string | null;
  youtubeId: string | null;     // youtube, or the audio paired with a pdf
  bpm: number | null;           // youtube count-in
  sections: Section[];
  lastPercent: number;          // last tempo used, 100 = original
  trainer: LoopTrainer | null;
  createdAt: number; lastOpenedAt: number | null;
}
export interface ScoreInfo { title: string; barCount: number; tempo: number; markers: { bar: number; name: string }[] } // bar 1-based
export function normalizeRange(r: LoopRange, limits: { barCount?: number; durationSec?: number }): LoopRange;
export function rangeLabel(r: LoopRange): string;            // "Bars 9–16" / "1:05–1:32"
export function sectionsFromMarkers(info: ScoreInfo, makeId: () => string): Section[]; // marker i → bars marker.bar .. next.bar-1 (last → barCount), fromFile true
export const GP_MIN_PERCENT = 25, GP_MAX_PERCENT = 150;
export const YOUTUBE_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
export function clampGpPercent(p: number): number;           // round, clamp 25..150
export function snapYoutubeRate(percent: number): number;    // nearest rate, ties go down
export function trainerPercent(t: LoopTrainer, pass: number): number; // pass 0-based, via barTempo
export function parseYoutubeId(url: string): string | null;
export function newSection(name: string, range: LoopRange, id: string): Section;
export function recordSectionClean(s: Section, percent: number): Section; // never lowers
```

- [ ] **Step 1: Failing tests** (planner):
  - `normalizeRange orders and clamps`: bars {12, 4} with barCount 10 → {4, 10}; {0, 0} → {1, 1}; time {90, 30} with duration 60 → {30, 60}; {5, 5.2} → {5, 6} (min 1 s).
  - `rangeLabel`: `Bars 9–16`, `Bar 3` when equal, `1:05–1:32`.
  - `sectionsFromMarkers`: markers Intro@1, Verse@5, Chorus@13, barCount 20 → Intro 1–4, Verse 5–12, Chorus 13–20, all fromFile, bestCleanPercent null.
  - `trainerPercent`: {60, 100, 10, 2} → passes 0..9 = 60,60,70,70,80,80,90,90,100,100, pass 20 = 100; a down trainer {100, 80, 5, 1} → 100, 95, 90 …80.
  - `clampGpPercent`: 10→25, 151→150, 87.4→87. `snapYoutubeRate`: 60→0.5, 63→0.75 (nearest), 62.5→0.5 (tie down), 300→2, 10→0.25.
  - `parseYoutubeId`: `https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s`, `https://youtu.be/dQw4w9WgXcQ?si=abc`, `https://m.youtube.com/watch?list=x&v=dQw4w9WgXcQ`, `https://www.youtube.com/shorts/dQw4w9WgXcQ`, `https://www.youtube.com/embed/dQw4w9WgXcQ` → `dQw4w9WgXcQ`; `https://vimeo.com/123`, `not a url`, `https://youtube.com/watch?v=short` → null.
  - `recordSectionClean`: null→80; 80 then 70 keeps 80; 80 then 95 → 95.
- [ ] **Step 2–4:** FAIL → implement (worker) → PASS: `npx nx test core-songlab`.
- [ ] **Step 5: Commit** `feat(core-songlab): songs, ranges, sections, loop trainer`

---

### Task 2: Storage v3 and backup v2

**Files:** Modify `libs/adapters/storage/src/db.ts` (version 3: add `songs: 'id, lastOpenedAt'`, `files: 'id'`), `repositories.ts` (add `songs`, `files` to `createDexieRepositories`), `backup.ts`; create `song-repository.ts`; specs `songs.spec.ts`, extend with a new `backup-v2.spec.ts` (existing `backup.spec.ts` stays and must still pass).

**Interfaces:**
```ts
export interface StoredFile { id: string; name: string; type: string; bytes: Uint8Array; size: number; addedAt: number } // bytes, not Blob: clones reliably in IndexedDB on iPad Safari and in tests
export interface FileRepository { put(f: StoredFile): Promise<void>; get(id: string): Promise<StoredFile | undefined>; remove(id: string): Promise<void>; all(): Promise<StoredFile[]>; replaceAll(fs: StoredFile[]): Promise<void> }
export interface SongRepository { list(): Promise<Song[]>; get(id: string): Promise<Song | undefined>; put(s: Song): Promise<void>; remove(id: string): Promise<void>; replaceAll(ss: Song[]): Promise<void> } // list: lastOpenedAt desc, then createdAt desc; remove also removes the song's file
export async function storageUsage(): Promise<{ usedBytes: number; quotaBytes: number } | null>;
// backup.ts: BACKUP_VERSION = 2; BackupData gains songs: Song[] and files: { id, name, type, size, addedAt, bytes: Uint8Array }[] (bytes travel as zip entries files/<id>, not JSON)
```
- [ ] **Step 1: Failing tests:** `v2 database upgrades keeping progress and presets`; `list orders by last opened`; `remove deletes the file too` (and leaves another song's file); `v2 round trip keeps file bytes` (export → read → import into a db that had other songs: exactly the backup's songs, identical bytes); `reads a v1 backup with no songs`; `rejects version 3 as newer-version`; existing `backup.spec.ts` unchanged and green.
- [ ] **Step 2–4:** FAIL → implement → PASS: `npx nx test storage`.
- [ ] **Step 5: Commit** `feat(storage): songs, file blobs and backup v2`

---

### Task 3: Notation adapter (alphaTab)

**Files:** Create `libs/adapters/notation/src/{notation-player.ts,alphatab-player.ts,score-helpers.ts,score-helpers.spec.ts,index.ts}`; add `@coderline/alphatab@1.9.0`; modify `apps/studio-web/vite.config.mts` (add `alphaTab()` from `@coderline/alphatab/vite`; workbox `globPatterns` add `sf2,otf,eot`; `maximumFileSizeToCacheInBytes: 6 * 1024 * 1024`).

**Interfaces:**
```ts
export interface TrackInfo { index: number; name: string; isDrums: boolean }
export interface NotationPlayer {
  load(bytes: Uint8Array): Promise<ScoreInfo>;    // rejects NotationError('unreadable')
  tracks(): TrackInfo[];
  play(): void; pause(): void; stop(): void;
  setPercent(p: number): void;                    // playbackSpeed = p / 100
  setLoop(r: { startBar: number; endBar: number } | null): void; // playbackRange + isLooping
  setCountIn(on: boolean): void; setMetronome(on: boolean): void;
  setTrackMute(index: number, muted: boolean): void; setTrackSolo(index: number, solo: boolean): void;
  showTracks(indexes: number[]): void;            // renderTracks
  onBar(cb: (bar: number) => void): () => void;   // 1-based bar under the cursor
  onPlaying(cb: (playing: boolean) => void): () => void;
  onLoopPass(cb: () => void): () => void;         // fires each time playback wraps to the range start
  destroy(): void;
}
export class NotationError extends Error { code: 'unreadable' }
export function createAlphaTabPlayer(el: HTMLElement, opts: { barsPerRow: number; scrollElement?: HTMLElement }): NotationPlayer;
// score-helpers.ts — pure, typed on a minimal structural shape so tests never load alphaTab:
export function pickDrumTrack(tracks: { staves: { isPercussion: boolean }[] }[]): number; // first percussion track, else 0
export function barRangeToTicks(masterBars: { start: number; calculateDuration(): number }[], startBar: number, endBar: number): { startTick: number; endTick: number };
export function scoreInfoFrom(score: { title: string; tempo: number; masterBars: { section: { text: string } | null }[] }): ScoreInfo;
```
Settings: `player.playerMode` enabled with synth, `player.soundFont` = alphaTab's bundled sonivox via the Vite plugin, `display.layoutMode` Page with `display.barsPerRow` from opts, `notation.elements` hide guitar tuning/chord diagrams, colors from CSS tokens read at create time (`getComputedStyle`): staff and notes `--ink`, cursor bar `--select` at 15 %, beat cursor `--pencil`.
- [ ] **Step 1: Failing tests** (helpers only): `pickDrumTrack` picks index 2 of [guitar, bass, drums]; 0 when none; `barRangeToTicks` for bars 2–3 of three 3840-tick bars → {3840, 11520}; `scoreInfoFrom` maps sections at bars 1 and 5 to markers with 1-based bars and barCount.
- [ ] **Step 2–4:** FAIL → implement → PASS; then `npx nx build studio-web` succeeds with the plugin and the precache list includes the soundfont.
- [ ] **Step 5: Commit** `feat(notation): alphaTab player adapter`

---

### Task 4: YouTube and PDF adapters

**Files:** Create `libs/adapters/youtube/src/{video-player.ts,youtube-player.ts,index.ts}` and `libs/adapters/pdf/src/{pdf-doc.ts,index.ts}`; add `pdfjs-dist@6.5.438`.

**Interfaces:**
```ts
export interface VideoPlayer {
  ready: Promise<void>;
  play(): void; pause(): void; seek(sec: number): void;
  time(): number; duration(): number;
  setRate(rate: number): void; rates(): number[];   // rates the video allows
  onPlaying(cb: (playing: boolean) => void): () => void;
  destroy(): void;
}
export function createYouTubePlayer(el: HTMLElement, videoId: string): VideoPlayer; // loads iframe_api once (shared promise), playerVars { playsinline: 1, rel: 0, modestbranding: 1 }
export interface PdfDoc { pageCount: number; renderPage(page: number, canvas: HTMLCanvasElement, cssWidth: number): Promise<void>; destroy(): void }
export function openPdf(bytes: Uint8Array): Promise<PdfDoc>; // rejects PdfError('unreadable'); worker via `pdfjs-dist/build/pdf.worker.min.mjs?url`; renders at devicePixelRatio
```
- [ ] **Step 1:** No unit tests (thin platform wrappers); a type-only spec `adapters.spec.ts` asserting both modules export the functions. Verified by Task 8–9 manual runs.
- [ ] **Step 2: Commit** `feat(youtube, pdf): video and pdf adapters`

---

### Task 5: Songs tab, library and import

Design: Impeccable surface round for **Songs** (operate, structures only, world fixed).

**Files:** Modify `apps/studio-web/src/app/{app.tsx,TabBar.tsx,useLastTab.ts,App.spec.tsx}` (fourth tab "Songs", id `songs`, order Today · Ladder · Songs · Metro; `AppDeps` gains `songs: SongRepository`, `files: FileRepository`, `players: PlayerFactories`); create `apps/studio-web/src/songs/{useSongs.ts,SongsScreen.tsx,AddYoutubeSheet.tsx,songs.css}`, specs.

**Interfaces:**
```ts
export interface PlayerFactories {
  notation(el: HTMLElement, opts: { barsPerRow: number; scrollElement?: HTMLElement }): NotationPlayer;
  video(el: HTMLElement, videoId: string): VideoPlayer;
  pdf(bytes: Uint8Array): Promise<PdfDoc>;
  /** Reads a GP/MusicXML file far enough to get its title and bars; rejects NotationError. */
  probeScore(bytes: Uint8Array): Promise<ScoreInfo>;
}
useSongs(repos: { songs: SongRepository; files: FileRepository }, probe: PlayerFactories['probeScore'], now?, makeId?) → {
  loaded, songs: Song[],
  importFile(file: File): Promise<Song>,       // by extension: GP/MusicXML → probeScore → title from score (fallback file name), sections from markers; .pdf → title = file name without extension
  addYoutube(input: { url: string; title: string; bpm: number | null }): Promise<Song>, // rejects on bad URL
  update(s: Song): Promise<void>, remove(id: string): Promise<void>, touch(id: string): Promise<void>,
}
SongsScreen({ songs: ReturnType<typeof useSongs>, onOpen(song) })
```
Library: running head "Songs" / count; three import controls ("Add Guitar Pro or MusicXML", "Add PDF", "Add YouTube link"); rows (title, kind word + sections count + last tempo "Last 80 %", tap opens); delete via a row's "Remove" text button with confirm "Remove <title> and its file from this device?"; empty note "Add a Guitar Pro file, a PDF or a YouTube link to practise along with a song."
- [ ] **Step 1: Failing tests:** four tabs in order; importing a `.gp` calls probe and lists the song titled from the score with its marker sections; `rejects an unreadable score` (alert text above, nothing stored); `.pdf` titled from the file name; unsupported `.mp3` → "TempoDojo opens Guitar Pro, MusicXML and PDF files."; YouTube sheet rejects a vimeo link ("That is not a YouTube link.") and saves a valid one with BPM; remove asks and deletes; rows open the song.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5: Commit** `feat(studio-web): Songs tab and library`

---

### Task 6: Loop trainer and sections (shared player logic)

**Files:** Create `apps/studio-web/src/songs/{useLoopTrainer.ts,TrainerControls.tsx,SectionsSheet.tsx}`, specs.

**Interfaces:**
```ts
useLoopTrainer(trainer: LoopTrainer | null, basePercent: number) → { percent: number; pass: number; onPass(): void; reset(): void } // percent = trainer ? trainerPercent(trainer, pass) : basePercent
TrainerControls({ trainer, onChange(t | null), kind: 'gp' | 'youtube' }) // check "Loop trainer" + four number fields Start %, Target %, Step %, Every N passes; defaults {60, 100, 5, 2}
SectionsSheet({ open, song, currentRange: LoopRange | null, currentPercent: number, exercises: Exercise[], onChange(sections: Section[]), onLoop(section), onOpenExercise(ex), onClose })
// rows: name, rangeLabel, "Best 85 %" or "No clean pass yet", linked exercise name (tap → onOpenExercise); actions per row: Loop, Clean at <current> % (recordSectionClean), Link exercise (picker of the catalogue grouped by track), Rename, Delete. "Save current loop as section" (name field, default "Section N") when currentRange is set.
```
- [ ] **Step 1: Failing tests:** trainer passes step the percent and stop at target; reset returns to start; saving the current loop adds a named section; "Clean at 85 %" records and never lowers; linking an exercise shows its name and calls onOpenExercise on tap; deleting asks first; GP-imported sections are labelled "From the file".
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5: Commit** `feat(studio-web): loop trainer and song sections`

---

### Task 7: Guitar Pro player screen

Design: Impeccable surface round for the **GP player** (operate, world fixed: the score is the page; transport in the thumb zone like Metro).

**Files:** Create `apps/studio-web/src/songs/{GpPlayerScreen.tsx,TracksSheet.tsx,player.css}`, specs (with a `FakeNotationPlayer` in `songs/test-utils.ts`).

**Interfaces:** `GpPlayerScreen({ song, file: StoredFile, players, songs, exercises, onBack, onOpenExercise, onTransport })`. Behaviour: creates the notation player on mount (barsPerRow 2 below 600 px container width, else 4), loads the file, shows only the drum track (`pickDrumTrack`), percent starts at `song.lastPercent`; transport: "−5 %", "−1 %", percent readout "80 %" (Caslon), "+1 %", "+5 %", Play/Stop (84 px); loop row: "Loop from bar [n] to bar [m]" number fields + "Loop on" check (→ setLoop), "Sections" text button (SectionsSheet), "Tracks" (TracksSheet: per track Mute / Solo checks; the drum track first), Count-in check (default on), Click check (alphaTab metronome, default off), TrainerControls; loop passes call `useLoopTrainer.onPass` and apply the new percent; playing → wake lock + `onTransport('play', { kind: 'song', songId })`; leaving saves `lastPercent` and stops.
- [ ] **Step 1: Failing tests:** loads and shows drum track only; nudges clamp at 25/150 and call setPercent; loop fields call setLoop with ordered, clamped bars; a loop pass with trainer {60,100,10,1} moves 60 → 70; mute/solo call the player; play/stop logs song events; leaving stores lastPercent.
- [ ] **Step 2–4:** FAIL → implement → PASS; manual check with a real `.gp` file in the browser (render, cursor, loop, speed). **Step 5: Commit** `feat(studio-web): Guitar Pro player`

---

### Task 8: YouTube player screen

**Files:** Create `apps/studio-web/src/songs/YoutubePlayerScreen.tsx`, spec (FakeVideoPlayer).

**Interfaces:** `YoutubePlayerScreen({ song, players, songs, engine: MetronomeEngineLike, exercises, onBack, onOpenExercise, onTransport })`. Video on top (16:9, full column width); "Set A" / "Set B" buttons capture `time()` (shown "A 1:05 · B 1:32"), "Loop on" check; a 250 ms poll seeks back to A when `time() >= B` and counts a pass; rate buttons from `YOUTUBE_RATES ∩ rates()` as a segmented control; count-in check enabled only when `song.bpm` (otherwise disabled with "Add the song's BPM to count in" and a BPM field that saves to the song); with count-in, each pass pauses at A, plays one bar of 4 clicks on `engine` at `song.bpm × rate`, then plays; TrainerControls stepping the snapped rate; Sections (time ranges).
- [ ] **Step 1: Failing tests:** A/B capture and ordering; reaching B seeks to A and increments the pass; rate snap to the video's allowed rates; count-in disabled without BPM and runs 4 engine clicks then plays with BPM; logs song play/stop.
- [ ] **Step 2–4:** FAIL → implement → PASS; manual check on a real video. **Step 5: Commit** `feat(studio-web): YouTube player with A/B loop`

---

### Task 9: PDF viewer

**Files:** Create `apps/studio-web/src/songs/PdfViewerScreen.tsx`, spec (fake PdfDoc).

**Interfaces:** `PdfViewerScreen({ song, file, players, songs, onBack, onTransport })`: renders the current page to a canvas at the column width; huge previous/next targets (left and right thirds of the page, plus 64 px "Previous" / "Next" buttons with "Page 2 of 5"); keys ArrowRight/PageDown/Space → next, ArrowLeft/PageUp → previous (Bluetooth page turners send these); optional paired YouTube link ("Pair a YouTube video" sheet → `song.youtubeId`), shown as a compact player with play/pause and rate; remembers the last page in `kv` key `pdfPage:<songId>`.
- [ ] **Step 1: Failing tests:** renders page 1; next/prev bounded; keys turn pages; pairing saves youtubeId; last page restored.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5: Commit** `feat(studio-web): PDF viewer with page turner keys`

---

### Task 10: Integration — stats, backup copy, storage use

**Files:** Modify `apps/studio-web/src/today/StatsBlock.tsx` (Songs row from `timeBySource().song`), `settings/BackupSection.tsx` (copy: "Progress, practice log, presets, settings and your song files, in one file."), add `settings/StorageLine.tsx` ("Using 48 MB of 2.1 GB on this device." from `storageUsage()`; hidden when unavailable), `app/app.tsx` (open song → player by kind; exercise links from sections open the ExerciseScreen in the Ladder tab).
- [ ] **Step 1: Failing tests:** Today lists "Songs 12 min" for song events; backup copy; storage line formatting (bytes → KB/MB/GB, one decimal above 10 MB none); App opens the right player per kind; a section's linked exercise opens the exercise screen.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5: Commit** `feat(studio-web): songs in stats, backup and storage use`

---

### Task 11: Finish review, documentation, device check

- [ ] **Step 1:** `npx nx run-many -t test lint typecheck build` → all PASS.
- [ ] **Step 2:** Captures (synthetic library; a small self-made GP file and a public-domain PDF; a YouTube link the user supplies or none) of library, GP player (idle, playing, sections, tracks), YouTube player, PDF viewer at 390×844, 1180×820 and the night page.
- [ ] **Step 3:** Impeccable finish reviewer; fix rounds (two, then ask the user).
- [ ] **Step 4:** Impeccable documenter merges DESIGN.md.
- [ ] **Step 5:** User device check (Android phone, iPad): import a GP file, loop a fill at 70 % with the trainer to 100 %, save it as a section and mark it clean, mute drums; play a YouTube drum-sheet video with an A/B loop at 0.75×; turn PDF pages with taps; export a backup with songs and import it on the other device.
