# TempoDojo Plan 4 — App Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. In this repo, implementers are Gemini 4 Hydrogen (`gemini-4-hydrogen-medium`) workers in Orca worktrees per the gemini-execution skill; the planner writes the failing tests first and integrates.

**Goal:** Finish build-order step 4: sound that survives the iPad's audio quirks and says so when it cannot, an "update ready" notice instead of silent updates, keyboard and page-turner keys on the song players, and a proven offline start.

**Architecture:** The audio adapter reports its context state through the existing engine interface; a small app-level banner shows when sound is blocked and resumes it on tap. The service worker switches from silent auto-update to prompt mode with a non-blocking bar above the tab bar. The song players reuse the existing keyboard hook with song-specific nudges. Offline is verified against a production preview build.

**Tech Stack:** as Plans 1–3 (`vite-plugin-pwa@2.0.0` `virtual:pwa-register/react`).

**Spec:** `docs/superpowers/specs/2026-11-19-tempodojo-design.md` §7.1 (iPad Safari constraints: audio unlocked by a tap, silent mode "use an audio session/playback approach that plays through it where possible, and tell the user if muted", audio suspended in the background), §8 step 4 (offline, install, wake lock, keyboard/page-turner). Design system: `apps/studio-web/DESIGN.md`.

## Global Constraints

- All Plan 1–3 constraints hold. Core libraries are untouched; this plan changes adapters and the app only.
- The browser cannot report the hardware volume or the silent switch directly. What the app can know: the AudioContext state (`running`, `suspended`, `interrupted` on iOS) after a user tap. "Tell the user if muted" therefore means: when playback is on but the context is not running, say so and offer a one-tap resume; and on Apple devices, a one-time sound tip.
- `navigator.audioSession.type = 'playback'` (already set by the metronome engine) is also set before alphaTab and YouTube playback, so song audio plays through the silent switch on iPadOS 17+.
- Updates never interrupt practice: the update bar appears only while nothing is playing, never reloads by itself, and is dismissible.
- Copy (exact): sound banner `The iPad paused the sound. Tap to resume.`; Apple one-time tip `No sound? Turn up the volume. TempoDojo plays even with the silent switch on.` with a `Got it` button; update bar `A new version of TempoDojo is ready.` with `Update` and `Later`.
- Song keys: Space / PageDown / PageUp toggle play; ArrowUp / ArrowDown nudge (GP: ±1 %, with Shift ±5 %; YouTube: next / previous allowed rate). Never fires inside inputs.

## Review Focus

1. **The context becomes `interrupted` mid-practice** (a call, Siri, another app's audio) — the banner appears while the transport still shows Stop, and one tap resumes. Test: Task 1 `banner shows when audio is interrupted while playing`.
2. **Returning from the background** with the app still "playing" — on `visibilitychange` to visible, the engine tries `resume()` once; if that fails the banner shows. Test: Task 1 `tries to resume when the page becomes visible`.
3. **An update arrives during a session** — no bar while playing; the bar appears after Stop. Test: Task 2 `update bar waits for stop`.
4. **Space while a sheet's number field is focused** — types, does not toggle play. Test: Task 3 `keys ignore inputs`.
5. **Opening the installed app with no network** — the app shell, metronome and a stored GP/PDF song open. Verified in Task 4 against the preview build with the server stopped.

---

### Task 1: Audio state and the sound banner

**Files:** Modify `libs/adapters/audio-web/src/web-audio-metronome.ts` (+ spec), `apps/studio-web/src/metronome/useMetronome.ts` (`MetronomeEngineLike` gains an optional `onAudioState`), create `apps/studio-web/src/platform/SoundBanner.tsx`, `sound.css`, `useSoundState.ts`, spec; modify `libs/adapters/notation/src/alphatab-player.ts` (set `audioSession.type = 'playback'` before `play()`), `libs/adapters/youtube/src/youtube-player.ts` (same).

**Interfaces:**
```ts
// audio-web
export type AudioState = 'running' | 'suspended' | 'interrupted' | 'closed';
interface WebAudioMetronome { onAudioState(cb: (s: AudioState) => void): () => void; resumeAudio(): Promise<boolean> } // statechange listener on the context; resumeAudio → ctx.resume() then state === 'running'
// app
export interface MetronomeEngineLike { …; onAudioState?(cb: (s: AudioState) => void): () => void; resumeAudio?(): Promise<boolean> }
useSoundState(engine, playing: boolean) → { blocked: boolean; resume(): Promise<void> } // blocked = playing && state !== 'running'; on visibilitychange→visible while playing: resumeAudio() once
SoundBanner({ blocked, onResume }) // role="alert" button, full width, 64px, inverted ink, above the transport
AppleSoundTip({ kv }) // shows once on iPhone/iPad (navigator.platform/maxTouchPoints heuristic, injected for tests), kv key 'soundTipSeen'
```
- [ ] **Step 1: Failing tests:** `banner shows when audio is interrupted while playing` (fake engine emits 'interrupted' → alert with the exact copy; tap → resumeAudio called; emits 'running' → banner gone); no banner when stopped; `tries to resume when the page becomes visible`; adapter: `onAudioState` relays the context's statechange and `resumeAudio` resolves false when the state stays suspended; Apple tip shows once and `Got it` stores `soundTipSeen`.
- [ ] **Step 2–4:** FAIL → implement → PASS. Mount the banner in MetronomeScreen, ExerciseScreen and the YouTube player (the engine users); the tip on the Metro screen.
- [ ] **Step 5: Commit** `feat: say when the iPad pauses the sound, one-tap resume`

---

### Task 2: Update-ready bar

**Files:** Modify `apps/studio-web/vite.config.mts` (`registerType: 'prompt'`), create `apps/studio-web/src/platform/UpdateBar.tsx`, `useUpdate.ts`, spec; mount in `app/app.tsx` above the TabBar; add `vite-plugin-pwa/react` types to `tsconfig.app.json`.

**Interfaces:** `useUpdate(register = useRegisterSW)` → `{ ready: boolean; update(): void; later(): void }` (wraps `useRegisterSW` from `virtual:pwa-register/react`: `needRefresh` → ready; update → `updateServiceWorker(true)`; later → hide until the next `needRefresh`). `UpdateBar({ ready, playing, onUpdate, onLater })` renders only when `ready && !playing`. App knows "playing" from the practice log's last transport event (any source).
- [ ] **Step 1: Failing tests:** bar hidden while playing, shown after stop with the exact copy; Update calls update; Later hides it; `update bar waits for stop`.
- [ ] **Step 2–4:** FAIL → implement → PASS; `npx nx build studio-web` still emits `sw.js` and no `registerSW.js` auto-reload.
- [ ] **Step 5: Commit** `feat(studio-web): update-ready bar instead of silent updates`

---

### Task 3: Keys on the song players

**Files:** Modify `apps/studio-web/src/platform/useKeyboardTransport.ts` (handlers gain optional `nudgeBig?(dir: 1 | -1)` for Shift+Arrow), `songs/GpPlayerScreen.tsx`, `songs/YoutubePlayerScreen.tsx`; specs added to the existing player spec files as new `describe` blocks.

- [ ] **Step 1: Failing tests:** GP: Space plays then stops; ArrowUp +1 %, Shift+ArrowUp +5 %, clamped; YouTube: Space plays; ArrowUp picks the next allowed rate; `keys ignore inputs` (Space in the From bar field does not play). Existing metronome keyboard tests stay green.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5: Commit** `feat(studio-web): play and tempo keys on song players`

---

### Task 4: Offline proof and release

- [ ] **Step 1:** `npx nx run-many -t test lint typecheck build` → all PASS.
- [ ] **Step 2:** `npx vite preview` of `apps/studio-web/dist` on port 4301; open in the browser, open Songs once (loads alphaTab), let the service worker install; stop the preview server; reload: the app, Metro (click plays), a stored GP song (score renders, plays) and a PDF open with no server. Record the result in `docs/deploy.md` ("Offline: verified <date>").
- [ ] **Step 3:** Capture the sound banner, Apple tip and update bar at 390×844 and the night page; quick Impeccable finish review (one round).
- [ ] **Step 4:** Merge to master and push when the user says so; remind the user of the pending device check (memory `device-check-pending`), now including: lock the iPad mid-click and come back (banner + resume), flip the silent switch (click still plays), install an update (bar appears after Stop).
