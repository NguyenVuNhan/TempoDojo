import * as alphaTab from '@coderline/alphatab';
import type { ScoreInfo } from '@tempodojo/core-songlab';
import {
  NotationError,
  type NotationOptions,
  type NotationPlayer,
  type TrackInfo,
} from './notation-player';
import { barRangeToTicks, pickDrumTrack, scoreInfoFrom } from './score-helpers';

const STYLE_ELEMENT_ID = 'tempodojo-alphatab-styles';

function ensureStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ELEMENT_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = [
    '.at-cursor-bar { background: color-mix(in srgb, var(--select) 15%, transparent); }',
    // One Pencil Rule: the orange beat cursor shows only while playing.
    // alphaTab styles the cursor inline, hence !important.
    '.at-cursor-beat { background: var(--pencil); width: 3px; visibility: hidden !important; }',
    '[data-at-playing] .at-cursor-beat { visibility: visible !important; }',
    '.at-selection div { background: color-mix(in srgb, var(--select) 20%, transparent); }',
    '.at-highlight * { fill: var(--pencil); stroke: var(--pencil); }',
  ].join('\n');
  document.head.appendChild(style);
}

function applyThemeColors(settings: alphaTab.Settings): void {
  const styles = getComputedStyle(document.documentElement);
  const inkValue = styles.getPropertyValue('--ink').trim();
  if (!inkValue) {
    return;
  }
  const inkColor = alphaTab.model.Color.fromJson(inkValue);
  if (!inkColor) {
    return;
  }
  settings.display.resources.mainGlyphColor = inkColor;
  settings.display.resources.staffLineColor = inkColor;
  settings.display.resources.barSeparatorColor = inkColor;
  settings.display.resources.barNumberColor = inkColor;
  settings.display.resources.scoreInfoColor = inkColor;
}

function findBarAtTick(masterBars: alphaTab.model.MasterBar[], tick: number): number | null {
  for (let i = 0; i < masterBars.length; i++) {
    const bar = masterBars[i];
    const start = bar.start;
    const end = start + bar.calculateDuration();
    if (tick >= start && tick < end) {
      return i + 1;
    }
  }
  return null;
}

export async function probeScore(bytes: Uint8Array): Promise<ScoreInfo> {
  try {
    const score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(bytes, new alphaTab.Settings());
    return scoreInfoFrom(score);
  } catch {
    throw new NotationError('unreadable');
  }
}

export function createAlphaTabPlayer(el: HTMLElement, opts: NotationOptions): NotationPlayer {
  ensureStyles();

  const settings = new alphaTab.Settings();
  settings.player.playerMode = alphaTab.PlayerMode.EnabledSynthesizer;
  settings.player.enableCursor = true;
  settings.player.enableUserInteraction = true;
  if (opts.scrollElement) {
    settings.player.scrollElement = opts.scrollElement;
  }
  settings.player.soundFont = new URL('/soundfont/sonivox.sf2', location.href).href;
  // alphaTab guesses its font folder from its own chunk (/assets/), but the Vite plugin copies the fonts to /font/.
  settings.core.fontDirectory = new URL('/font/', location.href).href;

  settings.display.layoutMode = alphaTab.LayoutMode.Page;
  // The page already shows the title; keep the score to the notation itself.
  for (const el of [
    alphaTab.NotationElement.ScoreTitle,
    alphaTab.NotationElement.ScoreSubTitle,
    alphaTab.NotationElement.ScoreArtist,
    alphaTab.NotationElement.ScoreAlbum,
    alphaTab.NotationElement.ScoreWords,
    alphaTab.NotationElement.ScoreMusic,
    alphaTab.NotationElement.ScoreWordsAndMusic,
    alphaTab.NotationElement.ScoreCopyright,
    alphaTab.NotationElement.GuitarTuning,
    alphaTab.NotationElement.ChordDiagrams,
  ]) {
    settings.notation.elements.set(el, false);
  }
  settings.display.barsPerRow = opts.barsPerRow;
  settings.display.scale = opts.scale ?? 1;
  applyThemeColors(settings);

  const api = new alphaTab.AlphaTabApi(el, settings);
  const offPlayingAttr = api.playerStateChanged.on((e) => {
    el.toggleAttribute('data-at-playing', e.state === alphaTab.synth.PlayerState.Playing);
  });

  // Night page: re-ink the score when the OS scheme or the page theme changes while it is open.
  const rethemeScore = () => {
    applyThemeColors(api.settings);
    api.updateSettings();
    if (api.score) api.render();
  };
  const darkQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
  darkQuery?.addEventListener('change', rethemeScore);
  const themeObserver = new MutationObserver(rethemeScore);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  let activeRange: { startTick: number; endTick: number; startBarDuration: number } | null = null;

  return {
    load(bytes: Uint8Array): Promise<ScoreInfo> {
      activeRange = null;
      return new Promise<ScoreInfo>((resolve, reject) => {
        let settled = false;
        // Hoisted so the handlers below can unsubscribe both once either fires.
        const cleanup = () => {
          offLoaded();
          offError();
        };

        const offLoaded = api.scoreLoaded.on((score) => {
          if (settled) {
            return;
          }
          settled = true;
          cleanup();
          const info = scoreInfoFrom(score);
          if (score.tracks.length > 0) {
            const drumIndex = pickDrumTrack(score.tracks);
            api.renderTracks([score.tracks[drumIndex]]);
          }
          resolve(info);
        });

        const offError = api.error.on(() => {
          if (settled) {
            return;
          }
          settled = true;
          cleanup();
          reject(new NotationError('unreadable'));
        });

        const started = api.load(bytes);
        if (!started && !settled) {
          settled = true;
          cleanup();
          reject(new NotationError('unreadable'));
        }
      });
    },

    tracks(): TrackInfo[] {
      const score = api.score;
      if (!score) {
        return [];
      }
      return score.tracks.map((track, index) => ({
        index,
        name: track.name,
        isDrums: track.staves.some((staff) => staff.isPercussion),
      }));
    },

    play(): void {
      if (typeof navigator !== 'undefined') {
        const nav = navigator as unknown as { audioSession?: { type: string } };
        if (nav.audioSession) nav.audioSession.type = 'playback';
      }
      api.play();
    },

    pause(): void {
      api.pause();
    },

    stop(): void {
      api.stop();
    },

    setPercent(percent: number): void {
      api.playbackSpeed = percent / 100;
    },

    setLoop(range: { startBar: number; endBar: number } | null): void {
      if (range === null) {
        activeRange = null;
        api.playbackRange = null;
        api.isLooping = false;
        return;
      }
      const score = api.score;
      if (!score || score.masterBars.length === 0) {
        return;
      }
      const ticks = barRangeToTicks(score.masterBars, range.startBar, range.endBar);
      const clampedStart = Math.max(1, Math.min(score.masterBars.length, range.startBar));
      const startBarDuration = score.masterBars[clampedStart - 1].calculateDuration();

      const pbRange = new alphaTab.synth.PlaybackRange();
      pbRange.startTick = ticks.startTick;
      pbRange.endTick = ticks.endTick;

      activeRange = {
        startTick: ticks.startTick,
        endTick: ticks.endTick,
        startBarDuration,
      };
      api.playbackRange = pbRange;
      api.isLooping = true;
      api.tickPosition = ticks.startTick;
    },

    setCountIn(on: boolean): void {
      api.countInVolume = on ? 1 : 0;
    },

    setMetronome(on: boolean): void {
      api.metronomeVolume = on ? 1 : 0;
    },

    setTrackMute(index: number, muted: boolean): void {
      const track = api.score?.tracks[index];
      if (track) {
        api.changeTrackMute([track], muted);
      }
    },

    setTrackSolo(index: number, solo: boolean): void {
      const track = api.score?.tracks[index];
      if (track) {
        api.changeTrackSolo([track], solo);
      }
    },

    showTracks(indexes: number[]): void {
      const score = api.score;
      if (!score) {
        return;
      }
      const selected = indexes
        .map((i) => score.tracks[i])
        .filter((track): track is alphaTab.model.Track => Boolean(track));
      if (selected.length > 0) {
        api.renderTracks(selected);
      }
    },

    onBar(cb: (bar: number) => void): () => void {
      let lastBar = -1;
      return api.playerPositionChanged.on((e) => {
        const masterBars = api.score?.masterBars;
        if (!masterBars || masterBars.length === 0) {
          return;
        }
        const bar = findBarAtTick(masterBars, e.currentTick);
        if (bar !== null && bar !== lastBar) {
          lastBar = bar;
          cb(bar);
        }
      });
    },

    onPlaying(cb: (playing: boolean) => void): () => void {
      return api.playerStateChanged.on((e) => {
        cb(e.state === alphaTab.synth.PlayerState.Playing);
      });
    },

    onLoopPass(cb: () => void): () => void {
      let prevTick = -1;
      return api.playerPositionChanged.on((e) => {
        if (
          activeRange !== null &&
          prevTick >= 0 &&
          e.currentTick < prevTick &&
          e.currentTick <= activeRange.startTick + activeRange.startBarDuration
        ) {
          cb();
        }
        prevTick = e.currentTick;
      });
    },

    destroy(): void {
      offPlayingAttr();
      darkQuery?.removeEventListener('change', rethemeScore);
      themeObserver.disconnect();
      api.destroy();
    },
  };
}
