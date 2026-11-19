# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One primary user: a home drummer practicing alone on an electronic kit who has plateaued. Groove and feel don't sound good enough, limbs don't move independently, and skills don't carry into songs. They judge their own playing (recording themselves outside the app when they want to).

## Product Purpose

TempoDojo gets a stuck drummer moving again by building fundamentals. Three parts, in priority order: a metronome as good as the core of Frozen Ape's *Tempo*; a practice ladder (hands, coordination & groove, feet) climbed by playing exercises cleanly at per-exercise target tempos; and Song Lab, a companion for playing real songs (Guitar Pro files, YouTube drum-sheet videos, PDFs) with looping and tempo control. Success, in the user's words: visible proof they practice often and for meaningful lengths of time.

## Positioning

A Tempo-grade metronome with a fundamentals ladder built on top of it, where the drummer is trusted to judge "clean" themselves.

## Operating Context

Used from the drum throne, sticks in hand, headphones often on, the device on a stand 1.5–2 m away: an Android phone (Chrome) or an iPad (Safari), installed to the home screen. Controls are hit mid-practice; the screen must stay awake while playing.

## Capabilities and Constraints

- No mic or MIDI listening/grading, no in-app recording or recording reminders, no accounts or cloud sync, no backend.
- No daily streaks; a weekly target and a practice-day calendar instead.
- Data is stored on the device, with zip backup/restore.
- Users bring their own song files; the app ships no transcriptions.
- Double-kick content arrives later, when the user owns a double pedal.

## Brand Commitments

Name: TempoDojo. The user's original PRD (2026-11-18) pinned a "tactile studio hardware" direction (inspired by Teenage Engineering OP-1, Elektron Digitakt, Boss DB-90): dark chassis, LED readouts, Space Grotesk / JetBrains Mono / Inter, orange (#FF4F00) downbeat and left hand, cyan (#00E5FF) sub-beats and right hand. Recorded as a binding constraint; the visual system itself lives in DESIGN.md.

## Evidence on Hand

Research in `docs/research/` (rudiment progression, coordination curricula, app prior art). Design spec: `docs/superpowers/specs/2026-11-19-tempodojo-design.md`. No testimonials, users, or metrics exist; do not fabricate any.

## Product Principles

1. Clean over fast: nothing rewards hitting a tempo sloppily.
2. Operable mid-practice: anything touched while playing works from the throne with a stick in hand.
3. Open on what to practice next, not on a catalogue.
4. Trust the drummer: self-judged progress, no surveillance, no guilt mechanics.
5. The core stays stable: practice logic lives in platform-free libraries that change rarely.

## Accessibility & Inclusion

Glanceable at 1.5–2 m: very large numerals and high-contrast state. Large touch targets (≥ 64 px for transport). Never signal state by colour alone (downbeat vs. other beats also differ in shape or position).
