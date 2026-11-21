import { render } from '@testing-library/react';
import { CATALOGUE, exerciseById } from '@tempodojo/core-ladder';
import { StaffView, type PatternLive } from './StaffView';

const view = (id: string, p: { live?: PatternLive; showCounts?: boolean } = {}) =>
  render(<StaffView exercise={exerciseById(id)!} {...p} />).container;

const texts = (c: Element, sel: string) => [...c.querySelectorAll(sel)].map((t) => t.textContent);

describe('StaffView', () => {
  it('pas-16: 8 slots, sticking RLRRLRLL, 2 accents, no counts by default', () => {
    const c = view('pas-16');
    expect(c.querySelectorAll('[data-slot]')).toHaveLength(8);
    expect(texts(c, '[data-stick]').join('')).toBe('RLRRLRLL');
    expect(c.querySelectorAll('[data-accent]')).toHaveLength(2);
    expect(c.querySelectorAll('[data-count]')).toHaveLength(0);
  });

  it('shows counts when asked', () => {
    expect(texts(view('coord-1-1', { showCounts: true }), '[data-count]')).toEqual(['1', '&', '2', '&', '3', '&', '4', '&']);
  });

  it('stacks two sticking letters on the backbeat', () => {
    const slot = view('coord-1-1').querySelector('[data-slot="2"]')!;
    expect(texts(slot, '[data-stick]')).toEqual(['R', 'L']);
  });

  it('ghost notes get parentheses', () => {
    expect(view('coord-3-1').querySelectorAll('[data-paren]')).toHaveLength(2 * 8);
  });

  it('flams show their grace letter in the sticking', () => {
    expect(texts(view('pas-20'), '[data-grace]')[0]).toBe('l');
  });

  it('feet-only exercise: no hand sticking, foot letters, ring still shows', () => {
    const ex = CATALOGUE.find(
      (e) => e.pattern.every((l) => l.voice !== 'hands') && e.pattern.some((l) => /[RL]/.test(l.steps)),
    )!;
    const c = render(<StaffView exercise={ex} live={{ bar: 0, pulse: 1 }} />).container;
    expect(c.querySelectorAll('[data-stick]')).toHaveLength(0);
    expect(c.querySelectorAll('[data-foot]').length).toBeGreaterThan(0);
    expect(c.querySelector('.pencil-ring')).not.toBeNull();
  });

  it('marks the live beat once', () => {
    expect(view('pas-16', { live: { bar: 0, pulse: 1 } }).querySelectorAll('.pencil-ring')).toHaveLength(1);
    expect(view('pas-16').querySelectorAll('.pencil-ring')).toHaveLength(0);
  });

  it('labels the staff for screen readers', () => {
    expect(view('pas-16').querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
      'Snare: accent R, L, R, R, accent L, R, L, L',
    );
  });
});
