import type { Subdivision } from '@tempodojo/core-metronome';
import type { Rank, Track, Voice } from '@tempodojo/core-ladder';

export const NOTE_VALUE: Record<Subdivision, string> = {
  1: 'quarters',
  2: '8ths',
  3: 'triplets',
  4: '16ths',
  5: 'quintuplets',
  6: 'sextuplets',
};

export const RANK_LABEL: Record<Rank, string> = {
  unranked: 'Unranked',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  master: 'Master',
};

export const TRACK_LABEL: Record<Track, string> = {
  hands: 'Hands',
  coordination: 'Coordination',
  feet: 'Feet',
};

export const VOICE_LABEL: Record<Voice, string> = {
  hands: 'Hands',
  kick: 'Kick',
  hihat: 'Hi-hat foot',
};

/** "95 BPM · 16ths" — BPM always travels with its note value. */
export const tempoLabel = (bpm: number, sub: Subdivision) => `${Math.round(bpm)} BPM · ${NOTE_VALUE[sub]}`;
