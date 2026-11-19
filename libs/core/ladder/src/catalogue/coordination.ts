import type { Meter } from '@tempodojo/core-metronome';
import type { Exercise, Targets } from '../types';

const M_4_4: Meter = { beatsPerBar: 4, denominator: 4, beatUnit: 'quarter' };

const T_COORD_1: Targets = { bronze: 60, silver: 70, gold: 80, master: 95 };
const T_COORD_2: Targets = { bronze: 70, silver: 80, gold: 90, master: 105 };
const T_COORD_3: Targets = { bronze: 70, silver: 80, gold: 95, master: 110 };
const T_COORD_4: Targets = { bronze: 60, silver: 75, gold: 90, master: 105 };
const T_COORD_5: Targets = { bronze: 70, silver: 85, gold: 100, master: 120 };
const T_COORD_6: Targets = { bronze: 65, silver: 75, gold: 85, master: 100 };

export const COORDINATION: Exercise[] = [
  // =========================================================================
  // TIER 1 — Pulse & Limb Pairing
  // =========================================================================
  {
    id: 'coord-1-1',
    track: 'coordination',
    tier: 1,
    name: '8th-Note Rock Foundation',
    focus: 'Bury the click with every kick and snare hit. Keep the left-foot hi-hat chick steady on beats 2 and 4.',
    meter: M_4_4,
    subdivision: 2,
    pattern: [
      { voice: 'hands', steps: 'R R >L R R R >L R' },
      { voice: 'kick', steps: 'K - - - K - - -' },
      { voice: 'hihat', steps: '- - H - - - H -' },
    ],
    targets: T_COORD_1,
    transferTip: 'Play right hand on closed hi-hat, left hand on snare backbeats 2 and 4, and add a crash on beat 1 every 4 bars.',
  },
  {
    id: 'coord-1-2',
    track: 'coordination',
    tier: 1,
    name: 'Stick Control Singles Over Feet',
    focus: 'Alternate R-L eighth notes evenly on the snare without letting the quarter-note kick flinch.',
    meter: M_4_4,
    subdivision: 2,
    pattern: [
      { voice: 'hands', steps: 'R L R L R L R L' },
      { voice: 'kick', steps: 'K - K - K - K -' },
      { voice: 'hihat', steps: '- - H - - - H -' },
    ],
    targets: T_COORD_1,
    transferTip: 'Move the right hand to the ride cymbal and left hand to snare, then flip to left-hand lead.',
  },
  {
    id: 'coord-1-3',
    track: 'coordination',
    tier: 1,
    name: 'Double-Stroke Hands Over Downbeat Feet',
    focus: 'Keep both strokes of each hand double equal in volume while locking both feet to the pulse.',
    meter: M_4_4,
    subdivision: 2,
    pattern: [
      { voice: 'hands', steps: 'R R L L R R L L' },
      { voice: 'kick', steps: 'K - - - K - - -' },
      { voice: 'hihat', steps: 'H - H - H - H -' },
    ],
    targets: T_COORD_1,
    transferTip: 'Play the right-hand doubles on the ride bell/bow and the left-hand doubles as soft snare textures.',
  },

  // =========================================================================
  // TIER 2 — Ostinato Anchor & 16th Kick
  // =========================================================================
  {
    id: 'coord-2-1',
    track: 'coordination',
    tier: 2,
    name: 'Syncopated 8th Kick Over 2 & 4 Hat',
    focus: 'Land the "&" of beat 2 on the kick without disturbing the steady eighth-note hands or 2 & 4 hi-hat.',
    meter: M_4_4,
    subdivision: 2,
    pattern: [
      { voice: 'hands', steps: 'R R >L R R R >L R' },
      { voice: 'kick', steps: 'K - - K K - - -' },
      { voice: 'hihat', steps: '- - H - - - H -' },
    ],
    targets: T_COORD_2,
    transferTip: 'Use this classic pop/rock kick placement under ride-cymbal choruses; try practicing with the click on 2 and 4.',
  },
  {
    id: 'coord-2-2',
    track: 'coordination',
    tier: 2,
    name: '16th-Note Kick Placement',
    focus: 'Place the "a" of beat 1 cleanly between the hi-hat eighths without rushing beat 2.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [
      { voice: 'hands', steps: 'R - R - >L - R - R - R - >L - R -' },
      { voice: 'kick', steps: 'K - - K - - - - K - K - - - - -' },
      { voice: 'hihat', steps: '- - - - H - - - - - - - H - - -' },
    ],
    targets: T_COORD_2,
    transferTip: 'Tighten the 16th-note kick against a closed hi-hat for funk and modern R&B grooves.',
  },
  {
    id: 'coord-2-3',
    track: 'coordination',
    tier: 2,
    name: '16th-Note Alternating Hands Over Feet',
    focus: 'Keep the 16th-note hand stream smooth and relaxed while the left foot chicks cleanly on 2 and 4.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [
      { voice: 'hands', steps: 'R L R L >R L R L R L R L >R L R L' },
      { voice: 'kick', steps: 'K - - - - - - - K - - K - - - -' },
      { voice: 'hihat', steps: '- - - - H - - - - - - - H - - -' },
    ],
    targets: T_COORD_2,
    transferTip: 'Keep the right hand on a tight hi-hat and drop the accented strokes onto the snare or rack tom.',
  },

  // =========================================================================
  // TIER 3 — Ghost Notes & Song-Form Transfer
  // =========================================================================
  {
    id: 'coord-3-1',
    track: 'coordination',
    tier: 3,
    name: '16th-Note Funk Ghost Groove',
    focus: 'Keep snare ghost notes at 1 inch off the head so the 12-inch backbeat on 2 and 4 pops with wide contrast.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [
      { voice: 'hands', steps: 'R (L) R (L) >L (L) R (L) R (L) R (L) >L (L) R (L)' },
      { voice: 'kick', steps: 'K - - - - - - K - - K - - - - -' },
      { voice: 'hihat', steps: '- - - - H - - - - - - - H - - -' },
    ],
    targets: T_COORD_3,
    transferTip: 'Play right hand on closed hi-hat and left hand on snare; audit with headphones off to verify ghost-note quietness.',
  },
  {
    id: 'coord-3-2',
    track: 'coordination',
    tier: 3,
    name: 'Ghosted Backbeat With 8th-Note Hi-Hat Foot',
    focus: 'Maintain an even eighth-note left-foot pulse while weaving syncopated kick and ghosted snare strokes.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [
      { voice: 'hands', steps: 'R - R (L) >L - (L) R R (L) R - >L - R (L)' },
      { voice: 'kick', steps: 'K - - K - - - - - - K - - - K -' },
      { voice: 'hihat', steps: 'H - H - H - H - H - H - H - H -' },
    ],
    targets: T_COORD_3,
    transferTip: 'Move the right hand to the ride cymbal so the left-foot eighth-note chick provides a crisp pocket.',
  },
  {
    id: 'coord-3-3',
    track: 'coordination',
    tier: 3,
    name: '3+1 Song-Form Fill Anchor',
    focus: 'Play 3 bars of groove then this 1-bar fill without dropping the feet; land beat 1 of the return dead-on the click.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [
      { voice: 'hands', steps: '>R L R L >R L R L >R L R L >R L R L' },
      { voice: 'kick', steps: 'K - - - - - - - K - - - - - - -' },
      { voice: 'hihat', steps: '- - - - H - - - - - - - H - - -' },
    ],
    targets: T_COORD_3,
    transferTip: 'Practice 3 bars of groove + 1 bar of this fill around the toms with a muted-bar gap click on bar 4.',
  },

  // =========================================================================
  // TIER 4 — Rudiments Over Feet & Kit Splits
  // =========================================================================
  {
    id: 'coord-4-1',
    track: 'coordination',
    tier: 4,
    name: 'Paradiddle Split (Hat/Snare) Over Feet',
    focus: 'Keep the right-hand accents crisp and left-hand taps low while locking kick on 1 & 3 and hi-hat on 2 & 4.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [
      { voice: 'hands', steps: '>R (L) R R >L R L L >R (L) R R >L R L L' },
      { voice: 'kick', steps: 'K - - - - - - - K - - - - - - -' },
      { voice: 'hihat', steps: '- - - - H - - - - - - - H - - -' },
    ],
    targets: T_COORD_4,
    transferTip: 'Keep the right hand on the ride or closed hi-hat and all left-hand strokes on the snare for an instant linear funk beat.',
  },
  {
    id: 'coord-4-2',
    track: 'coordination',
    tier: 4,
    name: 'Inverted Paradiddle Groove',
    focus: 'Shift the accent to beat 2 and 4 on the left hand while keeping the inner doubles light and relaxed.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [
      { voice: 'hands', steps: 'R L L R >L R R L R L L R >L R R L' },
      { voice: 'kick', steps: 'K - - - - - K - K - - - - - - -' },
      { voice: 'hihat', steps: '- - - - H - - - - - - - H - - -' },
    ],
    targets: T_COORD_4,
    transferTip: 'Place right hand on hi-hat and left hand on snare; the inverted sticking naturally puts a snare backbeat on 2 and 4.',
  },
  {
    id: 'coord-4-3',
    track: 'coordination',
    tier: 4,
    name: 'Syncopation Reading Over 4-on-the-Floor',
    focus: 'Sing the syncopated hand melody aloud while keeping four-on-the-floor kick and 2 & 4 hi-hat rock solid.',
    meter: M_4_4,
    subdivision: 2,
    pattern: [
      { voice: 'hands', steps: 'R - L R - L R -' },
      { voice: 'kick', steps: 'K - K - K - K -' },
      { voice: 'hihat', steps: '- - H - - - H -' },
    ],
    targets: T_COORD_4,
    transferTip: 'Play the hand rhythm on snare against a jazz ride pattern or orchestrate each hit across rack and floor toms.',
  },

  // =========================================================================
  // TIER 5 — Latin Ostinatos & Linear Flow
  // =========================================================================
  {
    id: 'coord-5-1',
    track: 'coordination',
    tier: 5,
    name: 'Paradiddles Over Baião Feet',
    focus: 'Automate the syncopated Baião kick ostinato for 60 seconds first, then layer even paradiddles on top.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [
      { voice: 'hands', steps: '>R L R R >L R L L >R L R R >L R L L' },
      { voice: 'kick', steps: 'K - - K - - K - K - - K - - K -' },
      { voice: 'hihat', steps: '- - - - H - - - - - - - H - - -' },
    ],
    targets: T_COORD_5,
    transferTip: 'Move the right hand to the ride bell or cowbell and left hand on snare with cross-stick or rimshot accents.',
  },
  {
    id: 'coord-5-2',
    track: 'coordination',
    tier: 5,
    name: 'Linear 16ths Over Samba Feet',
    focus: 'Keep the two-beat Samba surdo kick pattern on autopilot without flinching during the hand gaps.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [
      { voice: 'hands', steps: 'R L - R >L R L - R L - R >L R L -' },
      { voice: 'kick', steps: 'K - - K K - - K K - - K K - - K' },
      { voice: 'hihat', steps: '- - - - H - - - - - - - H - - -' },
    ],
    targets: T_COORD_5,
    transferTip: 'Play the right hand on ride or hi-hat and left hand on snare/toms for a driving Brazilian-funk hybrid.',
  },
  {
    id: 'coord-5-3',
    track: 'coordination',
    tier: 5,
    name: 'Ghosted Groove Over Baião Feet',
    focus: 'Keep ghost notes whisper-quiet and eighth-note hi-hat chicks crisp over the syncopated Baião kick.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [
      { voice: 'hands', steps: 'R (L) R (L) >L (L) R (L) R (L) R (L) >L (L) R (L)' },
      { voice: 'kick', steps: 'K - - K - - K - K - - K - - K -' },
      { voice: 'hihat', steps: '- - H - - - H - - - H - - - H -' },
    ],
    targets: T_COORD_5,
    transferTip: 'Use this for upbeat Latin-pop and fusion grooves, moving the right hand between hi-hat and ride bell.',
  },

  // =========================================================================
  // TIER 6 — 4-Way Interdependence
  // =========================================================================
  {
    id: 'coord-6-1',
    track: 'coordination',
    tier: 6,
    name: 'New Breed 3+1 System',
    focus: 'Vocalize the quarter-note pulse aloud while reading the off-kilter 3-sixteenth hand phrasing over independent feet.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [
      { voice: 'hands', steps: 'R - R L R - R L R - R L R - R L' },
      { voice: 'kick', steps: 'K - - K - - K - - K - - K - - -' },
      { voice: 'hihat', steps: '- - H - - - H - - - H - - - H -' },
    ],
    targets: T_COORD_6,
    transferTip: 'Rotate which limb plays the reading line: try moving the 3-note grouping to the kick while hands hold a ride groove.',
  },
  {
    id: 'coord-6-2',
    track: 'coordination',
    tier: 6,
    name: 'Linear 4-Way Interdependence',
    focus: 'Every limb occupies its own 16th-note slot; keep dynamic balance even across hands, kick, and hi-hat.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [
      { voice: 'hands', steps: 'R L - - >L - R L - R - L >R - L -' },
      { voice: 'kick', steps: '- - K - - K - - K - - - - K - -' },
      { voice: 'hihat', steps: '- - - H - - - - - - H - - - - H' },
    ],
    targets: T_COORD_6,
    transferTip: 'Orchestrate the hands across toms and cymbals while letting the kick and hi-hat chicks weave seamlessly underneath.',
  },
  {
    id: 'coord-6-3',
    track: 'coordination',
    tier: 6,
    name: 'Displaced Accents Over Samba Feet',
    focus: 'Shift hand accents across 3- and 5-note groupings without letting the Samba foot ostinato waver.',
    meter: M_4_4,
    subdivision: 4,
    pattern: [
      { voice: 'hands', steps: '>R L R R L >R L L R R >L R L R >L L' },
      { voice: 'kick', steps: 'K - - K K - - K K - - K K - - K' },
      { voice: 'hihat', steps: '- - - - H - - - - - - - H - - -' },
    ],
    targets: T_COORD_6,
    transferTip: 'Play the accented strokes on toms and crash/ride bells while keeping unaccented notes low on the snare.',
  },
];
