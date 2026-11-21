import type { HandDrum, PatternLine, Step } from './types';

const TOKEN_RE = /^(>)?(\()?(f|d|z)?(R|L|K|H)(\))?$/;

const GRACE_MAP: Record<'f' | 'd' | 'z', NonNullable<Step['grace']>> = {
  f: 'flam',
  d: 'drag',
  z: 'buzz',
};

function parseToken(token: string): Step {
  if (token === '-') {
    return {
      rest: true,
      hand: null,
      accent: false,
      ghost: false,
      grace: null,
    };
  }

  const match = TOKEN_RE.exec(token);
  if (!match) {
    throw new Error(`Bad token "${token}"`);
  }

  const [, accentMark, openParen, graceChar, handChar, closeParen] = match;
  const hasOpen = Boolean(openParen);
  const hasClose = Boolean(closeParen);

  if (hasOpen !== hasClose) {
    throw new Error(`Bad token "${token}"`);
  }

  const accent = Boolean(accentMark);
  const ghost = hasOpen;

  if (accent && ghost) {
    throw new Error(`Bad token "${token}"`);
  }

  const hand = handChar as NonNullable<Step['hand']>;

  if (graceChar && hand !== 'R' && hand !== 'L') {
    throw new Error(`Bad token "${token}"`);
  }

  const grace = graceChar ? GRACE_MAP[graceChar as 'f' | 'd' | 'z'] : null;

  return {
    rest: false,
    hand,
    accent,
    ghost,
    grace,
  };
}

/**
 * Parses a space-separated exercise pattern string into an array of Steps.
 */
export function parseSteps(steps: string): Step[] {
  if (steps === '') {
    throw new Error('Empty pattern');
  }

  return steps.split(' ').map(parseToken);
}

/** The drum a hands line is played on; snare when the line doesn't say. */
export function handDrumOf(line: PatternLine): HandDrum {
  return line.drum ?? 'snare';
}
