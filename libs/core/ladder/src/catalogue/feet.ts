import type { Meter } from '@tempodojo/core-metronome';
import type { Exercise, Targets } from '../types';

const M_4_4: Meter = { beatsPerBar: 4, denominator: 4, beatUnit: 'quarter' };

const T_FEET_1: Targets = { bronze: 60, silver: 80, gold: 100, master: 120 };
const T_FEET_2: Targets = { bronze: 70, silver: 90, gold: 110, master: 130 };
const T_FEET_3: Targets = { bronze: 60, silver: 75, gold: 90, master: 110 };
const T_FEET_4: Targets = { bronze: 70, silver: 90, gold: 110, master: 130 };
const T_FEET_5: Targets = { bronze: 60, silver: 90, gold: 120, master: 150 };
const T_FEET_6: Targets = { bronze: 55, silver: 75, gold: 95, master: 115 };

export const FEET: Exercise[] = [
  // =========================================================================
  // TIER 1 — Heel-Down Control (Single Pedal)
  // =========================================================================
  {
    id: 'feet-1-1',
    track: 'feet',
    tier: 1,
    name: 'Quarter-Note Heel-Down Pulse',
    focus: 'Keep your heel planted and lift only the toes; bury the click on every beat without tensing the shin.',
    meter: M_4_4,
    subdivision: 2,
    pattern: [{ voice: 'kick', steps: 'K - K - K - K -' }],
    targets: T_FEET_1,
    transferTip: 'Feather quiet quarter notes on the bass drum under jazz ride time or four-on-the-floor disco grooves.',
  },
  {
    id: 'feet-1-2',
    track: 'feet',
    tier: 1,
    name: 'Eighth-Note Heel-Down Control',
    focus: 'Let the beater rebound off the head between strokes so consecutive eighth notes sound smooth and even.',
    meter: M_4_4,
    subdivision: 2,
    pattern: [{ voice: 'kick', steps: 'K K K K K K K K' }],
    targets: T_FEET_1,
    transferTip: 'Add steady eighth-note kick pulses under driving punk or indie-rock choruses.',
  },
  {
    id: 'feet-1-3',
    track: 'feet',
    tier: 1,
    name: 'Quarter Kick & 2 & 4 Hi-Hat',
    focus: 'Balance volume between right-foot kick quarters and left-foot hi-hat chicks on beats 2 and 4.',
    meter: M_4_4,
    subdivision: 2,
    pattern: [
      { voice: 'kick', steps: 'K - K - K - K -' },
      { voice: 'hihat', steps: '- - H - - - H -' },
    ],
    targets: T_FEET_1,
    transferTip: 'Use this two-foot foundation as your autopilot base before layering ride patterns and snare comping.',
  },

  // =========================================================================
  // TIER 2 — Heel-Up 8ths & 16th Bursts (Single Pedal)
  // =========================================================================
  {
    id: 'feet-2-1',
    track: 'feet',
    tier: 2,
    name: 'Heel-Up Eighth-Note Drive',
    focus: 'Drop the weight of the whole leg from the hip and let the ankle stay springy for consistent punch.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [{ voice: 'kick', steps: 'K - K - K - K - K - K - K - K -' }],
    targets: T_FEET_2,
    transferTip: 'Lock heel-up eighth notes with the bass guitar in rock and pop-punk verses.',
  },
  {
    id: 'feet-2-2',
    track: 'feet',
    tier: 2,
    name: '16th-Note Kick Bursts',
    focus: 'Keep the three-note 16th-note burst relaxed and even without rushing into the following downbeat.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [{ voice: 'kick', steps: 'K - - - K K K - K - - - K K K -' }],
    targets: T_FEET_2,
    transferTip: 'Drop quick 16th-note kick bursts before snare backbeats to add energy to funk and hip-hop grooves.',
  },
  {
    id: 'feet-2-3',
    track: 'feet',
    tier: 2,
    name: 'Syncopated Heel-Up Kick & Hat',
    focus: 'Anchor the left-foot chick on 2 and 4 while placing anticipated 16th-note kicks cleanly around the bar.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [
      { voice: 'kick', steps: 'K - - K - - K - K - - K - - - -' },
      { voice: 'hihat', steps: '- - - - H - - - - - - - H - - -' },
    ],
    targets: T_FEET_2,
    transferTip: 'Layer a simple 8th-note hi-hat and backbeat snare over this pattern for an instant modern pop groove.',
  },

  // =========================================================================
  // TIER 3 — Single-Foot Doubles & 16ths (Single Pedal)
  // =========================================================================
  {
    id: 'feet-3-1',
    track: 'feet',
    tier: 3,
    name: 'Slide / Heel-Toe Doubles',
    focus: 'Use one smooth forward slide or heel-toe motion per pair so both 16th strokes match in volume.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [{ voice: 'kick', steps: 'K K - - K K - - K K - - K K - -' }],
    targets: T_FEET_3,
    transferTip: 'Insert quick double kicks on the "1 e" or "3 e" of rock and gospel grooves without needing a second pedal.',
  },
  {
    id: 'feet-3-2',
    track: 'feet',
    tier: 3,
    name: 'Off-Beat Kick Doubles',
    focus: 'Initiate the double cleanly on the "&" of the beat without dragging the second stroke.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [{ voice: 'kick', steps: '- - K K - - - - - - K K - - K K' }],
    targets: T_FEET_3,
    transferTip: 'Pair off-beat kick doubles with a snare backbeat on 2 and 4 for classic funk and Motown turnaround feels.',
  },
  {
    id: 'feet-3-3',
    track: 'feet',
    tier: 3,
    name: 'Continuous Single-Foot 16ths',
    focus: 'Stay centered on the throne and switch smoothly to ankle motion as tempo climbs.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [{ voice: 'kick', steps: 'K K K K K K K K K K K K K K K K' }],
    targets: T_FEET_3,
    transferTip: 'Use sustained single-foot 16ths for short tension builds or linear hand-foot fills.',
  },

  // =========================================================================
  // TIER 4 — Hi-Hat Foot Independence (Single Pedal)
  // =========================================================================
  {
    id: 'feet-4-1',
    track: 'feet',
    tier: 4,
    name: 'Hi-Hat Quarter Chick vs Syncopated Kick',
    focus: 'Keep all four left-foot quarter notes identical in volume while the right foot plays syncopated 16ths.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [
      { voice: 'kick', steps: 'K - - K - - K - K - - K - - - -' },
      { voice: 'hihat', steps: 'H - - - H - - - H - - - H - - -' },
    ],
    targets: T_FEET_4,
    transferTip: 'Play ride cymbal and snare comping over these feet for upbeat Latin-jazz and fusion grooves.',
  },
  {
    id: 'feet-4-2',
    track: 'feet',
    tier: 4,
    name: 'Hi-Hat 2 & 4 Chick vs Samba Kick',
    focus: 'Let the Samba surdo kick flow effortlessly around the crisp left-foot chick on beats 2 and 4.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [
      { voice: 'kick', steps: 'K - - K K - - K K - - K K - - K' },
      { voice: 'hihat', steps: '- - - - H - - - - - - - H - - -' },
    ],
    targets: T_FEET_4,
    transferTip: 'Once automated, add a ride cymbal Samba pattern and cross-stick clave on the snare.',
  },
  {
    id: 'feet-4-3',
    track: 'feet',
    tier: 4,
    name: 'Hi-Hat Eighth-Note Pulse vs Off-Beat Kick',
    focus: 'Maintain a steady eighth-note hi-hat ostinato without flinching when the kick lands between beats.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [
      { voice: 'kick', steps: 'K - - - - - K - - - K - - - - -' },
      { voice: 'hihat', steps: 'H - H - H - H - H - H - H - H -' },
    ],
    targets: T_FEET_4,
    transferTip: 'Use eighth-note left-foot chicks to keep time audible during quiet ride-cymbal or tom-groove sections.',
  },

  // =========================================================================
  // TIER 5 — Double-Kick Singles (Double Pedal)
  // =========================================================================
  {
    id: 'feet-5-1',
    track: 'feet',
    tier: 5,
    requiresDoublePedal: true,
    name: 'Double-Kick Single-Stroke 16ths',
    focus: 'Match left-foot beater height and attack to the right foot; keep both ankles relaxed and balanced.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [{ voice: 'kick', steps: 'R L R L R L R L R L R L R L R L' }],
    targets: T_FEET_5,
    transferTip: 'Lock continuous double-kick 16ths under half-time ride and snare backbeats on beat 3.',
  },
  {
    id: 'feet-5-2',
    track: 'feet',
    tier: 5,
    requiresDoublePedal: true,
    name: 'Double-Kick Gallop Bursts',
    focus: 'Keep the three-note R-L-R bursts tight and identical before returning to continuous 16ths.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [{ voice: 'kick', steps: 'R L R - R L R - R L R L R L R -' }],
    targets: T_FEET_5,
    transferTip: 'Use R-L-R bursts under power-chord accents in metal and progressive rock riffs.',
  },

  // =========================================================================
  // TIER 6 — Double-Kick Doubles & Paradiddles (Double Pedal)
  // =========================================================================
  {
    id: 'feet-6-1',
    track: 'feet',
    tier: 6,
    requiresDoublePedal: true,
    name: 'Double-Kick Open Doubles',
    focus: 'Control the second stroke of each foot double so R-R and L-L sound indistinguishable from singles.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [{ voice: 'kick', steps: 'R R L L R R L L R R L L R R L L' }],
    targets: T_FEET_6,
    transferTip: 'Use double-stroke feet for sustained high-tempo passages or split R-R-L-L between hands and feet.',
  },
  {
    id: 'feet-6-2',
    track: 'feet',
    tier: 6,
    requiresDoublePedal: true,
    name: 'Foot Paradiddle',
    focus: 'Accent the downbeat foot stroke cleanly while keeping the following three strokes relaxed and even.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [{ voice: 'kick', steps: '>R L R R >L R L L >R L R R >L R L L' }],
    targets: T_FEET_6,
    transferTip: 'Play paradiddles in unison between hands and feet, or mirror hands against feet for dense linear fills.',
  },
];
