import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Exercise, Progress } from '@tempodojo/core-ladder';
import type { Prefs } from '@tempodojo/storage';
import { LadderScreen } from './LadderScreen';
import { memoryLadderRepos, progressRow } from './test-utils';
import { useLadder } from './useLadder';
import type { LadderRepos } from './types';

function Harness({ repos, onOpen }: { repos: LadderRepos; onOpen: (ex: Exercise) => void }) {
  const ladder = useLadder(repos);
  return ladder.loaded ? <LadderScreen ladder={ladder} onOpen={onOpen} /> : null;
}

const setup = async (rows: Progress[] = [], prefs: Partial<Prefs> = {}) => {
  const m = memoryLadderRepos(rows, prefs);
  const onOpen = vi.fn();
  render(<Harness repos={m.repos} onOpen={onOpen} />);
  await screen.findByRole('heading', { name: 'Tier 1' });
  return { ...m, onOpen };
};

const row = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}(?![-\w])`) });

describe('LadderScreen', () => {
  it('lists the 40 hands rudiments in 4 tiers by default', async () => {
    await setup();
    expect(screen.getByRole('radio', { name: 'Hands' })).toHaveProperty('checked', true);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4']);
    expect(screen.getAllByRole('listitem')).toHaveLength(40);
  });

  it('shows not started, the next target, and opens an unlocked row', async () => {
    const { onOpen } = await setup();
    const para = row('Single Paradiddle');
    expect(para.textContent).toContain('Not started');
    expect(para.textContent).toContain('Next: Bronze 65');
    fireEvent.click(para);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'pas-16' }));
  });

  it('shows rank and best clean tempo with its note value', async () => {
    await setup([progressRow('pas-16', { rank: 'silver', bestCleanBpm: 96 })]);
    const para = row('Single Paradiddle');
    expect(para.textContent).toContain('Silver');
    expect(para.textContent).toContain('Best 96 · 16ths');
    expect(para.textContent).toContain('Next: Gold 125');
  });

  it('tier 2 is locked on fresh progress and cannot be opened', async () => {
    const { onOpen } = await setup();
    const tier2 = screen.getByRole('heading', { name: 'Tier 2' }).closest('section')!;
    expect(within(tier2).getByText('Locked — reach Bronze on every tier 1 exercise')).toBeTruthy();
    const locked = within(tier2).getByRole('button', { name: /^Double Paradiddle/ });
    expect(locked.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(locked);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('switches tracks', async () => {
    await setup();
    fireEvent.click(screen.getByRole('radio', { name: 'Coordination' }));
    expect(row('8th-Note Rock Foundation')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Single Paradiddle(?!-)/ })).toBeNull();
  });

  it('feet: the double pedal checkbox reveals tiers 5 and 6 and saves the pref', async () => {
    const { prefs } = await setup();
    fireEvent.click(screen.getByRole('radio', { name: 'Feet' }));
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4);
    fireEvent.click(screen.getByRole('checkbox', { name: 'I have a double pedal' }));
    await waitFor(() => expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(6));
    expect(prefs.save).toHaveBeenCalledWith(expect.objectContaining({ hasDoublePedal: true }));
    expect(screen.queryByRole('checkbox', { name: 'I have a double pedal' })).not.toBeNull();
  });
});
