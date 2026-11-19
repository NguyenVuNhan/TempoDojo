import { DEFAULT_SETTINGS } from '@tempodojo/core-metronome';
import type { AudioContextLike, AudioState } from './web-audio-metronome';
import { WebAudioMetronome } from './web-audio-metronome';

class StubContext {
  state: string = 'running';
  currentTime = 0;
  sampleRate = 48000;
  destination = {};
  resumeTo: string = 'running';
  private listeners = new Set<() => void>();
  resume = vi.fn(async () => {
    this.setState(this.resumeTo);
  });
  createBuffer = vi.fn(() => ({ copyToChannel: vi.fn() }));
  createBufferSource = vi.fn(() => ({ buffer: null as unknown, connect: vi.fn(), start: vi.fn() }));
  addEventListener = vi.fn((type: string, cb: () => void) => {
    if (type === 'statechange') this.listeners.add(cb);
  });
  removeEventListener = vi.fn((type: string, cb: () => void) => {
    if (type === 'statechange') this.listeners.delete(cb);
  });
  setState(s: string) {
    this.state = s;
    this.listeners.forEach((cb) => cb());
  }
}

const ticker = { start: vi.fn(), stop: vi.fn() };

describe('audio state', () => {
  it('relays context state changes, including iOS interruptions', async () => {
    const ctx = new StubContext();
    const m = new WebAudioMetronome({ context: ctx as unknown as AudioContextLike, ticker });
    const seen: AudioState[] = [];
    const off = m.onAudioState((s) => seen.push(s));
    await m.start(DEFAULT_SETTINGS);
    ctx.setState('interrupted');
    ctx.setState('running');
    off();
    ctx.setState('suspended');
    expect(seen).toEqual(['interrupted', 'running']);
    m.stop();
  });

  it('resumeAudio reports whether the sound is back', async () => {
    const ctx = new StubContext();
    const m = new WebAudioMetronome({ context: ctx as unknown as AudioContextLike, ticker });
    await m.start(DEFAULT_SETTINGS);
    ctx.setState('interrupted');
    ctx.resumeTo = 'interrupted';
    expect(await m.resumeAudio()).toBe(false);
    ctx.resumeTo = 'running';
    expect(await m.resumeAudio()).toBe(true);
    m.stop();
  });

  it('resumeAudio before any start is a harmless false', async () => {
    const m = new WebAudioMetronome({ ticker });
    expect(await m.resumeAudio()).toBe(false);
  });
});
