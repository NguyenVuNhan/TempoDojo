import { VideoError, type VideoPlayer } from './video-player';

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  setPlaybackRate(suggestedRate: number): void;
  getAvailablePlaybackRates(): number[];
  destroy(): void;
}

interface YTPlayerOptions {
  videoId: string;
  width?: string | number;
  height?: string | number;
  playerVars?: {
    playsinline?: 0 | 1;
    rel?: 0 | 1;
    modestbranding?: 0 | 1;
    controls?: 0 | 1;
  };
  events?: {
    onReady?: () => void;
    onStateChange?: (event: { data: number }) => void;
    onError?: (event: { data: number }) => void;
  };
}

interface YTNamespace {
  Player: new (element: HTMLElement | string, options: YTPlayerOptions) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) {
    return Promise.resolve();
  }
  if (apiPromise) {
    return apiPromise;
  }

  apiPromise = new Promise<void>((resolve, reject) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      resolve();
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new VideoError('unavailable'));
    };
    document.head.appendChild(script);
  });

  return apiPromise;
}

export function createYouTubePlayer(el: HTMLElement, videoId: string): VideoPlayer {
  const container = document.createElement('div');
  el.appendChild(container);

  let player: YTPlayer | null = null;
  let isReady = false;
  let destroyed = false;
  const listeners = new Set<(playing: boolean) => void>();

  const ready = loadYouTubeApi().then(
    () =>
      new Promise<void>((resolve, reject) => {
        if (destroyed || !window.YT?.Player) {
          reject(new VideoError('unavailable'));
          return;
        }

        player = new window.YT.Player(container, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            controls: 1,
          },
          events: {
            onReady: () => {
              isReady = true;
              resolve();
            },
            onStateChange: (event) => {
              if (event.data === 1) {
                for (const cb of listeners) cb(true);
              } else if (event.data === 2 || event.data === 0) {
                for (const cb of listeners) cb(false);
              }
            },
            onError: () => {
              if (!isReady) {
                reject(new VideoError('unavailable'));
              }
            },
          },
        });
      }),
  );

  return {
    ready,
    play() {
      if (typeof navigator !== 'undefined') {
        const nav = navigator as unknown as { audioSession?: { type: string } };
        if (nav.audioSession) nav.audioSession.type = 'playback';
      }
      if (isReady) player?.playVideo();
    },
    pause() {
      if (isReady) player?.pauseVideo();
    },
    seek(sec: number) {
      if (isReady) player?.seekTo(sec, true);
    },
    time(): number {
      return isReady && player ? player.getCurrentTime() : 0;
    },
    duration(): number {
      return isReady && player ? player.getDuration() : 0;
    },
    setRate(rate: number) {
      if (isReady) player?.setPlaybackRate(rate);
    },
    rates(): number[] {
      return isReady && player ? player.getAvailablePlaybackRates() : [1];
    },
    onPlaying(cb: (playing: boolean) => void): () => void {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    destroy() {
      destroyed = true;
      isReady = false;
      listeners.clear();
      player?.destroy();
      player = null;
      container.remove();
    },
  };
}
