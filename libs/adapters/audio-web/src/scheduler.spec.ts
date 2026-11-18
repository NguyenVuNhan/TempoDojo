import { DEFAULT_SETTINGS, type ClickEvent, type MetronomeSettings } from '@tempodojo/core-metronome';
import { LookaheadScheduler, type AudioClock, type Ticker } from './scheduler';
import { WebAudioMetronome, type AudioContextLike } from './web-audio-metronome';

class FakeClock implements AudioClock {
  currentTime = 0;
  readonly sampleRate = 48000;
  played: { when: number; samples: Float32Array }[] = [];
  play(samples: Float32Array, when: number): void {
    this.played.push({ samples, when });
  }
}

class ManualTicker implements Ticker {
  fn: (() => void) | null = null;
  intervalMs = 0;
  start(fn: () => void, intervalMs: number): void {
    this.fn = fn;
    this.intervalMs = intervalMs;
  }
  stop(): void {
    this.fn = null;
  }
  tick(): void {
    this.fn?.();
  }
}

const settings = (patch: Partial<MetronomeSettings> = {}): MetronomeSettings => ({ ...DEFAULT_SETTINGS, ...patch });

const setup = () => {
  const clock = new FakeClock();
  const ticker = new ManualTicker();
  const scheduler = new LookaheadScheduler(clock, ticker);
  return { clock, ticker, scheduler };
};

const playedTimes = (clock: FakeClock) => clock.played.map((p) => Math.round(p.when * 1000) / 1000);

describe('LookaheadScheduler', () => {
  it('ticks every 25 ms by default', () => {
    const { ticker, scheduler } = setup();
    scheduler.start(settings());
    expect(ticker.intervalMs).toBe(25);
    expect(scheduler.running).toBe(true);
  });

  it('starts 50 ms after start and schedules 100 ms ahead', () => {
    const { clock, ticker, scheduler } = setup();
    scheduler.start(settings());
    ticker.tick();
    expect(playedTimes(clock)).toEqual([0.05]);
  });

  it('plays each click exactly once as time advances', () => {
    const { clock, ticker, scheduler } = setup();
    scheduler.start(settings());
    for (let t = 0; t <= 1.9 + 1e-9; t += 0.025) {
      clock.currentTime = t;
      ticker.tick();
    }
    expect(playedTimes(clock)).toEqual([0.05, 0.55, 1.05, 1.55]);
  });

  it('does not play muted clicks but reports them', () => {
    const { clock, ticker, scheduler } = setup();
    const seen: ClickEvent[] = [];
    scheduler.start(settings({ accents: ['accent', 'mute', 'normal', 'mute'] }), (e) => seen.push(e));
    for (let t = 0; t <= 1.9 + 1e-9; t += 0.025) {
      clock.currentTime = t;
      ticker.tick();
    }
    expect(playedTimes(clock)).toEqual([0.05, 1.05]);
    expect(seen.map((e) => e.level)).toEqual(['accent', 'mute', 'normal', 'mute']);
  });

  it('skips events already in the past', () => {
    const { clock, ticker, scheduler } = setup();
    const seen: ClickEvent[] = [];
    scheduler.start(settings(), (e) => seen.push(e));
    clock.currentTime = 0.1;
    ticker.tick();
    clock.currentTime = 5.0;
    ticker.tick();
    expect(playedTimes(clock)).toEqual([0.05, 5.05]);
    expect(seen.length).toBeGreaterThan(2);
  });

  it('applies update() to upcoming clicks', () => {
    const { clock, ticker, scheduler } = setup();
    scheduler.start(settings());
    ticker.tick(); // 0.05
    clock.currentTime = 0.5;
    ticker.tick(); // 0.55
    scheduler.update(settings({ bpm: 60 }));
    clock.currentTime = 1.9;
    ticker.tick();
    expect(playedTimes(clock)).toEqual([0.05, 0.55, 1.05]);
  });

  it('stop() halts playback', () => {
    const { clock, ticker, scheduler } = setup();
    scheduler.start(settings());
    ticker.tick();
    scheduler.stop();
    expect(scheduler.running).toBe(false);
    clock.currentTime = 3;
    ticker.tick();
    expect(clock.played).toHaveLength(1);
  });

  it('uses louder samples for accents than for normal clicks', () => {
    const { clock, ticker, scheduler } = setup();
    scheduler.start(settings());
    ticker.tick();
    clock.currentTime = 0.5;
    ticker.tick();
    const peak = (s: Float32Array) => s.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    expect(peak(clock.played[0].samples)).toBeGreaterThan(peak(clock.played[1].samples));
  });
});

describe('WebAudioMetronome', () => {
  const stubContext = (state: 'suspended' | 'running') => {
    const started: number[] = [];
    const ctx = {
      state,
      currentTime: 0,
      sampleRate: 48000,
      destination: {},
      resume: vi.fn(async () => {
        ctx.state = 'running';
      }),
      createBuffer: vi.fn((_channels: number, length: number, sampleRate: number) => ({
        length,
        sampleRate,
        copyToChannel: vi.fn(),
      })),
      createBufferSource: vi.fn(() => ({
        buffer: null as unknown,
        connect: vi.fn(),
        start: vi.fn((when: number) => started.push(when)),
      })),
    };
    return { ctx, started };
  };

  it('resumes suspended context on start', async () => {
    const { ctx } = stubContext('suspended');
    const ticker = new ManualTicker();
    const m = new WebAudioMetronome({ context: ctx as unknown as AudioContextLike, ticker });
    await m.start(DEFAULT_SETTINGS);
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    m.stop();
  });

  it('schedules buffer sources on the context clock', async () => {
    const { ctx, started } = stubContext('running');
    const ticker = new ManualTicker();
    const m = new WebAudioMetronome({ context: ctx as unknown as AudioContextLike, ticker });
    await m.start(DEFAULT_SETTINGS);
    ticker.tick();
    expect(ctx.resume).not.toHaveBeenCalled();
    expect(started).toEqual([0.05]);
    m.stop();
  });

  it('reports events with the delay until they are heard', async () => {
    const { ctx } = stubContext('running');
    const ticker = new ManualTicker();
    const m = new WebAudioMetronome({ context: ctx as unknown as AudioContextLike, ticker });
    const delays: number[] = [];
    const off = m.onEvent((_e, delayMs) => delays.push(delayMs));
    await m.start(DEFAULT_SETTINGS);
    ticker.tick();
    expect(delays).toHaveLength(1);
    expect(delays[0]).toBeCloseTo(50, 6);
    off();
    m.stop();
  });
});
