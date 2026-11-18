import type { AccentLevel } from '@tempodojo/core-metronome';

export type VoiceId = 'woodblock' | 'rim' | 'beep' | 'cowbell' | 'clave';
export type ClickLevel = Exclude<AccentLevel, 'mute'>;

export const VOICES: { id: VoiceId; label: string }[] = [
  { id: 'woodblock', label: 'Woodblock' },
  { id: 'rim', label: 'Rimshot' },
  { id: 'beep', label: 'Beep' },
  { id: 'cowbell', label: 'Cowbell' },
  { id: 'clave', label: 'Clave' },
];

const PEAK_BY_LEVEL: Record<ClickLevel, number> = {
  accent: 0.95,
  normal: 0.6,
  ghost: 0.18,
};

const TWO_PI = 2 * Math.PI;

/** Small deterministic xorshift32 PRNG returning values in [-1, 1]. */
function createPrng(seed: number): () => number {
  let state = seed | 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) / 0x80000000) - 1;
  };
}

function triangle(phase: number): number {
  const norm = (phase / TWO_PI) % 1;
  const wrapped = norm < 0 ? norm + 1 : norm;
  return 4 * Math.abs(wrapped - 0.5) - 1;
}

function envelope(t: number, attackSec: number, decayRate: number): number {
  const attack = attackSec > 0 ? Math.min(1, t / attackSec) : 1;
  return attack * Math.exp(-decayRate * t);
}

function normalizeToPeak(samples: Float32Array, targetPeak: number): Float32Array {
  let maxAbs = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > maxAbs) {
      maxAbs = abs;
    }
  }
  if (maxAbs > 0) {
    const scale = targetPeak / maxAbs;
    for (let i = 0; i < samples.length; i++) {
      samples[i] *= scale;
    }
  }
  return samples;
}

function synthesize(
  durationSec: number,
  sampleRate: number,
  targetPeak: number,
  sampleAt: (t: number) => number,
): Float32Array {
  const length = Math.max(1, Math.floor(durationSec * sampleRate));
  const buffer = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buffer[i] = sampleAt(i / sampleRate);
  }
  return normalizeToPeak(buffer, targetPeak);
}

function resolveVoiceId(voiceId: string): VoiceId {
  for (const voice of VOICES) {
    if (voice.id === voiceId) {
      return voice.id;
    }
  }
  return 'woodblock';
}

/**
 * Synthesizes a short, deterministic metronome click burst (<= 60 ms)
 * scaled to the target amplitude for the given accent level.
 */
export function renderClick(
  voiceId: string,
  level: ClickLevel,
  sampleRate: number,
): Float32Array {
  const resolved = resolveVoiceId(voiceId);
  const targetPeak = PEAK_BY_LEVEL[level];

  switch (resolved) {
    case 'woodblock':
      return synthesize(0.035, sampleRate, targetPeak, (t) => {
        const env = envelope(t, 0.0005, 160);
        const body = 0.7 * Math.sin(TWO_PI * 840 * t) + 0.3 * Math.sin(TWO_PI * 1950 * t);
        return env * body;
      });

    case 'rim': {
      const nextNoise = createPrng(0x52494d31);
      let prevNoise = 0;
      return synthesize(0.03, sampleRate, targetPeak, (t) => {
        const rawNoise = nextNoise();
        const highPassedNoise = rawNoise - 0.7 * prevNoise;
        prevNoise = rawNoise;
        const tone = 0.55 * Math.sin(TWO_PI * 460 * t) + 0.45 * triangle(TWO_PI * 1720 * t);
        const toneEnv = envelope(t, 0.0003, 190);
        const noiseEnv = envelope(t, 0.0002, 260);
        return toneEnv * tone * 0.65 + noiseEnv * highPassedNoise * 0.35;
      });
    }

    case 'beep': {
      const freq = level === 'accent' ? 1500 : 1000;
      return synthesize(0.04, sampleRate, targetPeak, (t) => {
        const env = envelope(t, 0.001, 110);
        return env * Math.sin(TWO_PI * freq * t);
      });
    }

    case 'cowbell':
      return synthesize(0.055, sampleRate, targetPeak, (t) => {
        const env = envelope(t, 0.0005, 95);
        const p1 = triangle(TWO_PI * 540 * t);
        const p2 = triangle(TWO_PI * 800 * t);
        return env * (0.55 * p1 + 0.45 * p2);
      });

    case 'clave':
      return synthesize(0.025, sampleRate, targetPeak, (t) => {
        const env = envelope(t, 0.0003, 210);
        const body = 0.75 * Math.sin(TWO_PI * 2450 * t) + 0.25 * Math.sin(TWO_PI * 3150 * t);
        return env * body;
      });
  }
}
