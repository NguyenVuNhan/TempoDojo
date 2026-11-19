# Deploying TempoDojo (studio-web)

The app is a static PWA. It needs HTTPS for install, offline use and the screen wake lock.

## Build

```bash
npm ci
npx nx build studio-web
```

Output: `apps/studio-web/dist` (contains `index.html`, `manifest.webmanifest`, `sw.js`).

## Cloudflare Pages (preferred)

1. Push the repo to GitHub.
2. In Cloudflare Pages, create a project from the repo.
   - Build command: `npx nx build studio-web`
   - Build output directory: `apps/studio-web/dist`
   - Environment: `NODE_VERSION=24`
3. SPA fallback is handled by the service worker; no redirect rules are needed for the single route.

## Vercel (alternative)

- Framework preset: Other.
- Build command: `npx nx build studio-web`; output directory: `apps/studio-web/dist`.

## Try it on a phone without deploying

`npx nx preview studio-web --host` serves the built app on your LAN, but over plain HTTP, so install and wake lock won't work; use a deploy (or an HTTPS tunnel) for the real device check.

## Install

- Android Chrome: open the URL → menu → Install app.
- iPad Safari: open the URL → Share → Add to Home Screen.

## Updates

The service worker runs in prompt mode: a new deploy shows "A new version of TempoDojo is ready." above the tab bar, only while nothing is playing. **Update** reloads into the new version; **Later** hides the bar until the next deploy. Nothing reloads by itself mid-practice.

## Offline

Verified 2026-11-19 against `vite preview` of the production build with the server stopped: the app shell, the metronome (plays), a stored Guitar Pro song (score renders and plays) and a stored PDF (renders, page turns) all open with no network. Everything in `dist` that the app loads is precached, including the alphaTab font, soundfont and workers and the pdf.js worker (`.mjs`); YouTube songs need the network.
