import type { ClickEvent, MetronomeSettings } from '@tempodojo/core-metronome';
import { LookaheadScheduler, type AudioClock, type Ticker } from './scheduler';

export type AudioState = 'running' | 'suspended' | 'interrupted' | 'closed';

export interface AudioContextLike {
  state: string;
  currentTime: number;
  sampleRate: number;
  destination: unknown;
  resume(): Promise<void>;
  addEventListener?(type: 'statechange', cb: () => void): void;
  removeEventListener?(type: 'statechange', cb: () => void): void;
  createBuffer(
    channels: number,
    length: number,
    sampleRate: number,
  ): { copyToChannel(data: Float32Array, channel: number): void };
  createBufferSource(): {
    buffer: unknown;
    connect(dest: unknown): void;
    start(when: number): void;
  };
}

const WORKER_SOURCE = `let id = null;
self.onmessage = (e) => {
  if (e.data && e.data.type === 'start') {
    if (id !== null) clearInterval(id);
    id = setInterval(() => self.postMessage('tick'), e.data.intervalMs);
  } else if (e.data && e.data.type === 'stop') {
    if (id !== null) {
      clearInterval(id);
      id = null;
    }
  }
};`;

/**
 * Creates a Ticker backed by a Blob Web Worker so lookahead ticks continue
 * reliably when main-thread timers are throttled, falling back to setInterval
 * when Worker/Blob/URL.createObjectURL are unavailable.
 */
export function createWorkerTicker(): Ticker {
  const canUseWorker =
    typeof Worker !== 'undefined' &&
    typeof Blob !== 'undefined' &&
    typeof URL !== 'undefined' &&
    typeof URL.createObjectURL === 'function';

  if (canUseWorker) {
    let worker: Worker | null = null;
    let url: string | null = null;

    const cleanup = (): void => {
      if (worker) {
        worker.postMessage({ type: 'stop' });
        worker.terminate();
        worker = null;
      }
      if (url) {
        URL.revokeObjectURL(url);
        url = null;
      }
    };

    return {
      start(fn: () => void, intervalMs: number): void {
        cleanup();
        const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' });
        url = URL.createObjectURL(blob);
        worker = new Worker(url);
        worker.onmessage = () => fn();
        worker.postMessage({ type: 'start', intervalMs });
      },
      stop(): void {
        cleanup();
      },
    };
  }

  let timerId: ReturnType<typeof globalThis.setInterval> | null = null;
  const timerApi = typeof window !== 'undefined' ? window : globalThis;

  return {
    start(fn: () => void, intervalMs: number): void {
      if (timerId !== null) {
        timerApi.clearInterval(timerId);
      }
      timerId = timerApi.setInterval(fn, intervalMs);
    },
    stop(): void {
      if (timerId !== null) {
        timerApi.clearInterval(timerId);
        timerId = null;
      }
    },
  };
}

/**
 * Web Audio API metronome engine combining LookaheadScheduler, a Web Worker
 * ticker, and an AudioContext-backed AudioClock.
 */
export class WebAudioMetronome {
  private context: AudioContextLike | null;
  private readonly ticker: Ticker;
  private scheduler: LookaheadScheduler | null = null;
  private readonly listeners = new Set<(e: ClickEvent, delayMs: number) => void>();
  private readonly audioStateListeners = new Set<(s: AudioState) => void>();
  private attachedContext: AudioContextLike | null = null;

  constructor(opts?: { context?: AudioContextLike; ticker?: Ticker }) {
    this.context = opts?.context ?? null;
    this.ticker = opts?.ticker ?? createWorkerTicker();
  }

  async start(settings: MetronomeSettings): Promise<void> {
    this.setPlaybackAudioSession();

    const ctx = this.getOrCreateContext();
    if (ctx.state !== 'running') {
      await ctx.resume();
    }

    this.scheduler?.stop();
    const clock: AudioClock = {
      get currentTime(): number {
        return ctx.currentTime;
      },
      get sampleRate(): number {
        return ctx.sampleRate;
      },
      play(samples: Float32Array, when: number): void {
        const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
        buffer.copyToChannel(samples, 0);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(when);
      },
    };

    this.scheduler = new LookaheadScheduler(clock, this.ticker);
    this.scheduler.start(settings, (event) => {
      const delayMs = (event.time - ctx.currentTime) * 1000;
      for (const listener of this.listeners) {
        listener(event, delayMs);
      }
    });
  }

  update(settings: MetronomeSettings): void {
    this.scheduler?.update(settings);
  }

  stop(): void {
    this.scheduler?.stop();
  }

  onEvent(cb: (e: ClickEvent, delayMs: number) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  onAudioState(cb: (s: AudioState) => void): () => void {
    this.audioStateListeners.add(cb);
    if (this.context) {
      this.attachStateListener(this.context);
    }
    return () => {
      this.audioStateListeners.delete(cb);
    };
  }

  async resumeAudio(): Promise<boolean> {
    const ctx = this.context;
    if (!ctx) {
      return false;
    }
    this.setPlaybackAudioSession();
    try {
      await ctx.resume();
    } catch {
      // Fall through to report whether the context actually reached 'running'.
    }
    return ctx.state === 'running';
  }

  private setPlaybackAudioSession(): void {
    if (typeof navigator !== 'undefined') {
      const nav = navigator as unknown as { audioSession?: { type: string } };
      if (nav.audioSession) {
        nav.audioSession.type = 'playback';
      }
    }
  }

  private attachStateListener(ctx: AudioContextLike): void {
    if (this.attachedContext === ctx) {
      return;
    }
    this.attachedContext = ctx;
    ctx.addEventListener?.('statechange', () => {
      const state = ctx.state as AudioState;
      for (const listener of this.audioStateListeners) {
        listener(state);
      }
    });
  }

  private getOrCreateContext(): AudioContextLike {
    if (this.context) {
      this.attachStateListener(this.context);
      return this.context;
    }
    const AudioContextCtor =
      typeof window !== 'undefined'
        ? (window.AudioContext ??
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext)
        : undefined;
    if (!AudioContextCtor) {
      throw new Error('Web Audio API is not available in this environment');
    }
    this.context = new AudioContextCtor() as unknown as AudioContextLike;
    this.attachStateListener(this.context);
    return this.context;
  }
}
