# TempoDojo — Design

Date: 2026-11-19
Status: draft for approval
Supersedes parts of: the original PRD Google Doc ("TempoDojo — Product Requirements Document & Technical Architecture", 2026-11-18). Where this document and the PRD disagree, this document wins. Changes are listed in §9.
Research inputs: `docs/research/01-rudiment-progression.md`, `02-coordination-independence.md`, `03-apps-prior-art.md`.

Legend: **[user]** = decided by the user. **[call]** = my call, made on the user's behalf; open to override. Unmarked = follows directly from the user's stated intent or the research.

---

## 1. Intent and the why

The user is a home drummer on an electronic kit who has been stuck at the same level for a while. Groove and feel don't sound good enough, limbs don't work independently, and skills don't carry into songs. They partly attribute this to not practicing enough. **[user]**

TempoDojo is a practice app that gets them moving again by building fundamentals: the base that groove, independence, and song playing rest on. **[user]**

Three parts, in priority order:

1. **Metronome** — the part that must be excellent. It should work like the core of the *Tempo* app by Frozen Ape. **[user]**
2. **Practice ladder** — the reason to open TempoDojo instead of Tempo: climb levels by drilling exercises until you can play them cleanly at target tempos. **[user]**
3. **Song Lab** — a companion: play real songs you like using the skills you've drilled, Songsterr-style. **[user]**

The user judges their own playing. They can record themselves and evaluate; the app does not need to listen. **[user]**

## 2. Goals, non-goals, anti-goals

### Goals
- A metronome that is rock-solid in timing and as quick to operate as Tempo.
- A ladder that tells the user exactly what to practice next and at what tempo, across hands, coordination, and feet.
- A way to take drilled skills into real songs (loop, slow down, speed back up).
- Visible proof of practice habit: how often and how long. **[user]** This is also the user's own success measure for the app.

### Non-goals (not in this project)
- **Listening / grading** via mic or MIDI: onset detection, latency calibration, pocket meter, mic-verified badges. **[user]** ("least important; I can record and evaluate myself"). Keep the audio-engine API open enough that it could be added later, but build nothing for it.
- Accounts, cloud sync, multi-device. Phase 2 per PRD; not in this project. **[call]**
- Android/iOS packaging. Later, via Capacitor, on the same codebase. **[user]** (web first)
- Double-kick exercises. The user doesn't own a double pedal yet. The feet track is designed to hold them later; v1 ships single-pedal content only. **[call]**
- Scraping Songsterr/MuseScore by URL (PRD's `score-proxy-api`). Dropped: terms-of-service and copyright risk, and the user already owns Guitar Pro files. **[call]**
- Shipping any song transcriptions with the app. Users bring their own files.
- The PRD's 16-step "Quick Sketchpad" for writing grooves. Not discussed with the user; deferred. **[call]**
- Polyrhythm overlays (PRD). Deferred; Tempo-parity features come first. **[call]**

### Anti-goals (would make it a failure even if it works)
- **Streak guilt.** No daily streaks that break and shame. Serious drummers churn on these (research 03).
- **Speed over clean.** Nothing should reward hitting a tempo sloppily. Rank-up always goes through the self-check (§4.4).
- **Library overwhelm.** The app opens on what to practice next, not a catalogue to browse.
- **Fiddly at the kit.** Anything the user must hit mid-practice must be usable from the drum throne with a stick in hand.

## 3. Metronome

Modeled on Tempo's core. **[user]** Feature list below is from the PRD plus research 03; it is the required v1 set.

- **Tempo**: 20–400 BPM, ±1 and ±5 steps, drag/scroll, tap tempo. **[call on range]**
- **Meter**: time signatures 1–16 over 2/4/8 (covers 4/4, 3/4, 6/8, 5/4, 7/8, 9/8, 12/8).
- **Beat unit** **[call]**: the tempo model has an explicit beat unit separate from the meter denominator. BPM always counts beat units. Defaults: X/4 → quarter; X/8 → eighth, with a one-tap switch to dotted-quarter pulse for 6/8, 9/8, 12/8. Subdivision is "clicks per beat unit" (e.g. triplets = 3 per beat). Ladder targets store `{bpm, beatUnit, subdivision}`; "65 BPM · triplets" means 65 quarter-note beats with 3 notes each.
- **Subdivisions**: quarter, 8ths, triplets, 16ths, quintuplets, sextuplets. Subdivision clicks have their own level.
- **Per-beat accents**: tap a beat to cycle Accent → Normal → Ghost → Mute. This also produces "click on 2 & 4" (mute 1 and 3), offered as a one-tap preset.
- **Automator** (one engine, used by metronome, ladder and Song Lab):
  - *Speed-up trainer*: start BPM, target BPM, step (+N BPM), every M bars; optional "pyramid" (go back down).
  - *Gap click*: N bars on, M bars muted, repeating (e.g. 4/1, 2/2, 4/4).
  - *Random mute*: optional (Tempo has it); **[call]** include if cheap, otherwise later.
- **Practice timer**: count-up session time; optional countdown that stops the click.
- **Count-in**: 0–2 bars before start.
- **Sounds**: a handful of synthesized click voices (woodblock, rim, beep, cowbell-ish, voice count). Exact set is the builder's choice; minimum 4.
- **Presets**: save/load named metronome setups.
- **At the kit**: huge BPM readout and beat LEDs readable at 1.5–2 m; big transport (play/stop, tap, ±) in the thumb zone; screen wake lock during playback; space bar / Bluetooth page-turner (keyboard events) toggles play. **[call on page-turner]**

**Timing requirement**: clicks scheduled ahead on the Web Audio clock (lookahead scheduler pattern); no audible drift or jitter over a 10-minute run; tempo changes from the Automator land exactly on bar boundaries.

## 4. Practice ladder

### 4.1 Structure: three tracks **[user]**

| Track | Content | v1 |
|---|---|---|
| **Hands** | The 40 PAS rudiments, in ~4 pedagogical tiers (not 1–40 order). Tier 1: single stroke roll, double stroke open roll, multiple bounce roll, single paradiddle, flam, drag. Subsequent tiers per research 01 §1.2 (Vic Firth sequence). | Yes |
| **Coordination & groove** | ~6 tiers: a foot ostinato is locked first, hands layered on top. Foot ostinato order: kick quarters + hi-hat 2&4 → off-beat kick → hi-hat 8ths → baião → samba/bossa. Middle tiers add groove drills: ghost notes, click on 2&4, "3 bars groove + 1 bar fill", gap click. See research 02 §4 table. | Yes |
| **Feet** | Single-pedal first: kick control and speed, heel-up/heel-down, steady 8ths and 16ths on kick, hi-hat foot. Later tiers: double-kick singles, doubles, foot rudiments — hidden until the user turns on "I have a double pedal". | Single-pedal tiers only |

The exact exercise list per tier is **left to the builder**, drawn from the research reports, as long as: every exercise has a name, sticking/limb notation (R/L/K/H(hat foot)), a reference subdivision, and four targets.

### 4.2 Exercise card

Each exercise shows:
- Name, track, tier, short "what to focus on" note (1–3 lines).
- Notation: sticking blocks for hands (R / L, accents, flams/drags as grace notes); for coordination, a simple multi-line grid (hands / kick / hi-hat foot). A rendered staff is not required for ladder exercises. **[call]**
- Targets: **Bronze / Silver / Gold / Master BPM, always shown with the note value** (e.g. "95 BPM · 16ths"). Targets are **per exercise** (or per family), not global. **Research-driven change from PRD's flat 80/120/160/200.** Starting values: research 01 §2.5 table and research 02 §4; they're estimates and must live in data, not code, so they can be tuned.
- Your **current working tempo** and **best clean tempo**.
- Optional "kit transfer" tip (how to orchestrate it around the kit), shown after Bronze.

### 4.3 Practicing an exercise

Opening an exercise loads the metronome with: the exercise's subdivision, its time signature, and the user's current working tempo. **[call]** The speed-up trainer is pre-configured from working tempo toward the next rank target (+2–5 BPM steps). Feet-first prompt on coordination exercises: "play the feet alone for a minute first". The user can change anything; it's the same metronome.

### 4.4 Ranking up (self-judged) **[user]: the app trusts the user**

To claim a rank at a tempo:
1. The user runs a **rank test**: at the target tempo, a set number of bars with a gap-click pattern (e.g. 2 on / 2 off) **[call on exact pattern; builder may tune per tier]**.
2. A short **self-check** appears: landed beat 1 after the muted bars? stick heights even / ghosts quiet? relaxed? (coordination) feet didn't flinch? All must be ticked to claim.
3. The rank and best clean tempo are saved.

The app has no recording feature and no reminders to record. The user records and reviews themselves outside the app. **[user]**

Users may also just log a best clean tempo without a rank test.

### 4.5 Unlocking **[call]**
- Tier 1 of every track is open from the start.
- The next tier of a track unlocks when every exercise in the current tier is at least Bronze.
- Locked exercises are visible (name, targets) but can't be ranked.

### 4.6 Home screen
Opens to **"Next up"**: 1–2 hands exercises + 1 coordination (+1 feet) the user is working on, picked as the lowest-ranked unlocked exercises they touched most recently **[call]**, plus one-tap access to the plain metronome. The full ladder is one tap away.

## 5. Song Lab

A companion for playing songs with drilled skills. **[user]** Replaces drum-sheet YouTube videos (inconvenient) and Songsterr (needs purchase / computer). **[user]**

### 5.1 Sources
1. **Guitar Pro files** (.gp, .gp3–.gp7, .gpx) and MusicXML — the user and a friend buy these. **[user]** Rendered and played with **alphaTab** (`@coderline/alphatab`). Interactive: notation with a playback cursor, drum track auto-selected.
2. **YouTube videos** — many show the drum sheet on screen. **[user]** Paste a link; play via the official YouTube IFrame player.
3. **PDFs** — sometimes purchased. **[user]** Page viewer with big page-turn targets; can be paired with a YouTube link for audio.

### 5.2 Controls (required: notation view, range loop, easy tempo change **[user]**; the rest **[call]**, suggested and accepted by the user)
- **Range loop**: pick start and end bar (GP) or start and end time (YouTube); repeat.
- **Tempo**: GP playback 25–150% (alphaTab); YouTube at its supported rates (0.25×–2×).
- **Loop trainer**: loop starts slow and steps toward 100% every N passes (the shared Automator logic).
- **Count-in** before each pass.
- **Clocks** **[call]**: Song Lab does not sync TempoDojo's own click to external playback. GP files use alphaTab's built-in metronome and count-in (tempo comes from the file). YouTube loops get an optional count-in only if the user enters the song's BPM for that video; otherwise no count-in. `core/songlab` only computes loop ranges and the playback-speed step per pass; the shared part with the metronome Automator is the stepping logic (start, target, step, every N), not the clock.
- **Mute / solo tracks** (GP): drums off to play along; or isolate kick, etc. **[call]** Per-drum-voice muting is nice-to-have; per-track muting is required.
- **Section markers**: name a range ("Chorus", "Fill into bridge"), jump and loop with one tap. GP files' own section markers are imported.
- **Per-section progress**: remember the highest tempo the user played each section at cleanly.
- **Link a section to a ladder exercise** ("this fill needs 16th kick doubles").
- Mobile reflow: one or two bars per row, legible from a music stand; wake lock during playback.

### 5.3 Not in v1
- Syncing GP notation to YouTube audio with an offset slider (PRD). Doable but fiddly; later. **[call]**
- Pitch/key changes, audio file import (mp3), stem separation.

## 6. Practice stats **[user]**

- Track **sessions**: count per week, **average session length**, total time; time per track and per exercise.
- **Session definition** **[call]**: store raw play/stop events (with what was playing: metronome, exercise id, song id), never just totals, so the definition can change without data migration. A session starts at the first play and ends at the last stop, provided no gap between plays is longer than 10 minutes; a longer gap starts a new session. Session length = that wall-clock span (includes short breaks between reps, which is how drummers think of "a practice session"). Time per track/exercise = summed play time attributed to it.
- **Weekly target** (default: 4 sessions or 120 minutes per week, user-adjustable) instead of daily streaks. **[call]**
- A calendar heatmap of practice days.

## 7. How it's made

### 7.1 Decisions
- **Web first**: React + TypeScript, installable PWA, works offline. **[user]** (agreed to default)
- **Target devices**: an **Android phone** (Chrome) and an **iPad** (Safari). **[user]** Both must work in Phase 1; test on both. iPad Safari constraints to design for: audio must be unlocked by a user tap; the hardware/silent mode can affect Web Audio (use an audio session/playback approach that plays through it where possible, and tell the user if muted); audio is suspended in the background (acceptable: the app is in the foreground while practicing); storage can be evicted on long inactivity (mitigated by `navigator.storage.persist()`, home-screen install and the zip backup). Layout must work in phone portrait and iPad portrait and landscape.
- **Nx monorepo**. **[user]**
- **Core modules in separate libraries, designed to change as little as possible.** **[user]** Core libraries are pure TypeScript: no React, no DOM, no Web Audio imports. Platform specifics (Web Audio, IndexedDB, YouTube, alphaTab) sit behind interfaces in adapter libraries. Core public APIs are kept small and versioned deliberately; apps depend on them, never the reverse.
- **Local-first storage** in IndexedDB (Dexie). No backend in this project. **[call]**, consistent with PRD Phase 1.
- **Imported files** **[call]**: GP and PDF files are stored inside the app (IndexedDB blobs) so sections and progress always have their file. Request persistent storage (`navigator.storage.persist()`) and show storage use in settings.
- **Backup** **[call]**: export/import a single `.zip` containing a JSON of all progress/settings plus the imported files.
- **Hosting** **[call]**: static hosting on Cloudflare Pages or Vercel (HTTPS, needed for PWA install and wake lock), deployed from the repo; the user supplies the account. Phase 1 counts as done only when it's usable from the user's phone at the kit, not just locally.
- **Later mobile**: wrap the same web app in Capacitor (Android first, then iOS), as in the PRD. Native audio only if Web Audio latency or background playback proves inadequate.

### 7.2 Proposed library layout **[call]**, adapted from PRD §3.1

```
apps/
  studio-web/            Vite + React app (PWA)
libs/
  core/metronome/        pure TS: tempo, meter, subdivision, accent pattern, Automator
                         (speed-up, gap click), bar/beat timeline. Emits "schedule these
                         clicks at these times"; knows nothing about audio.
  core/ladder/           pure TS: exercise catalogue types, targets, rank rules,
                         unlock rules, "next up" selection. Catalogue content as data.
  core/practice/         pure TS: sessions, weekly target, stats aggregation.
  core/songlab/          pure TS: loop ranges, sections, loop-trainer stepping,
                         per-section progress. Independent of alphaTab/YouTube.
  adapters/audio-web/    Web Audio click synthesis + lookahead scheduler driving core/metronome.
  adapters/storage/      Dexie repositories behind interfaces defined in core.
  adapters/notation/     alphaTab wrapper.
  adapters/youtube/      YouTube IFrame wrapper.
  ui/kit/                design system components.
```
Builder may rename or merge adapter libs; the **core vs adapter split and the "core has no platform imports" rule are fixed** (enforce with Nx module-boundary tags).

### 7.3 Visual direction
Follow the PRD §4 "tactile studio hardware" direction (dark chassis, LED readouts, Space Grotesk / JetBrains Mono / Inter, orange downbeat/L, cyan subbeat/R, large thumb-zone transport, mobile portrait first). Mic-telemetry colours are unused (no grading). Details are the builder's / designer's.

### 7.4 Quality
- Core libs are unit-tested (scheduling math, Automator stepping at bar boundaries, rank/unlock rules, stats).
- Metronome timing verified with a test that schedules ≥10 minutes and checks computed click times against expected; plus a manual listening check on the user's Android phone and iPad.

## 8. Build order **[call]**

1. Workspace + core/metronome + audio adapter + metronome screen (usable on its own — this alone should be as good as Tempo).
2. Ladder (hands, coordination, feet single-pedal) + storage + practice stats + home "Next up".
3. Song Lab: GP import/playback/loop/tempo → YouTube player → PDF viewer → sections, loop trainer, progress, ladder links.
4. PWA polish (offline, install, wake lock, keyboard/page-turner).

## 9. Changes from the original PRD
- Mic onset detection, calibration, pocket meter, mic-verified badges, XP: **removed** (user: self-judged). In-app recording: not added (user records outside the app).
- Flat Bronze 80 / Silver 120 / Gold 160 / Master 200: **replaced** by per-exercise targets with explicit note values (research).
- Ladder: **added** coordination & groove track and feet track (user).
- Songsterr/MuseScore URL proxy and FastAPI app: **removed**.
- Quick Sketchpad, polyrhythms, YouTube↔notation sync: **deferred**.
- Practice stats with weekly target and heatmap: **added** (user).

## 10. Left to the builder
- Exact exercise list per tier and starting targets (from the research reports; stored as data).
- Click sound design, UI layout details, component library choices within React.
- State management, routing, testing tools.
- Adapter library naming/merging.
