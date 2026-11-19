import { render } from '@testing-library/react';
import { exerciseById } from '@tempodojo/core-ladder';
import { PatternView } from './PatternView';

const view = (id: string) => render(<PatternView exercise={exerciseById(id)!} />).container;

describe('PatternView', () => {
  it('pas-16 shows 8 strokes with 2 accents in 2 beats', () => {
    const c = view('pas-16');
    expect(c.querySelectorAll('.pattern-line')).toHaveLength(1);
    expect(c.querySelectorAll('.beat')).toHaveLength(2);
    const slots = [...c.querySelectorAll('.slot')];
    expect(slots).toHaveLength(8);
    expect(slots.map((s) => s.querySelector('.stroke')?.textContent).join('')).toBe('RLRRLRLL');
    expect(c.querySelectorAll('.slot[data-accent="true"]')).toHaveLength(2);
    expect(c.querySelector('.pattern-label')?.textContent).toBe('Hands');
  });

  it('draws graces, ghosts and rests', () => {
    const flam = view('pas-20');
    expect(flam.querySelector('.slot .grace')?.textContent).toBe('l');
    const drag = view('pas-31');
    expect(drag.querySelector('.slot .grace')?.textContent).toBe('ll');
    const rests = view('pas-07');
    expect([...rests.querySelectorAll('.slot[data-rest="true"]')].map((s) => s.textContent)).toEqual(['·', '·', '·']);
  });

  it('a coordination groove shows hands, kick and hi-hat foot lines', () => {
    const c = view('coord-1-1');
    expect([...c.querySelectorAll('.pattern-label')].map((l) => l.textContent)).toEqual(['Hands', 'Kick', 'Hi-hat foot']);
    expect(c.querySelectorAll('.pattern-line')[1].querySelectorAll('.slot:not([data-rest="true"])')).toHaveLength(2);
  });

  it('labels the whole pattern for screen readers', () => {
    const c = view('pas-16');
    expect(c.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Hands: accent R, L, R, R, accent L, R, L, L');
  });
});
