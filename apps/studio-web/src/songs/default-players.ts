import { createAlphaTabPlayer, probeScore } from '@tempodojo/notation';
import { openPdf } from '@tempodojo/pdf';
import { createYouTubePlayer } from '@tempodojo/youtube';
import type { PlayerFactories } from './types';

/** The real players. Loaded on demand (alphaTab and pdf.js are large), see App. */
export const defaultPlayers: PlayerFactories = {
  notation: createAlphaTabPlayer,
  video: createYouTubePlayer,
  pdf: openPdf,
  probeScore,
};
