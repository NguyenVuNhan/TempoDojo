import { useEffect, useId, useRef, useState } from 'react';
import {
  RANKS,
  RANK_TEST_BARS,
  checklistFor,
  type Exercise,
  type Progress,
  type Rank,
} from '@tempodojo/core-ladder';
import { Sheet } from '@tempodojo/ui-kit';
import type { LivePosition } from '../metronome/useMetronome';
import { RANK_LABEL, tempoLabel } from './labels';
import './rank-test.css';

type TestableRank = Exclude<Rank, 'unranked'>;
type Step = 'setup' | 'running' | 'check';

export interface RankTestSheetProps {
  open: boolean;
  exercise: Exercise;
  progress: Progress;
  position: LivePosition | null;
  onStart: (bpm: number) => void;
  onStop: () => void;
  onClaim: (bpm: number) => void;
  onClose: () => void;
}

/** Self-judged 8-bar rank test sheet: target selection, live bar readout, and honesty checklist. */
export function RankTestSheet({
  open,
  exercise,
  progress,
  position,
  onStart,
  onStop,
  onClaim,
  onClose,
}: RankTestSheetProps) {
  const radioGroupName = useId();
  const availableRanks = RANKS.slice(RANKS.indexOf(progress.rank) + 1) as TestableRank[];
  const [step, setStep] = useState<Step>('setup');
  const [selectedRank, setSelectedRank] = useState<TestableRank | null>(availableRanks[0] ?? null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const stoppedRef = useRef(false);

  const activeRank =
    selectedRank && availableRanks.includes(selectedRank)
      ? selectedRank
      : (availableRanks[0] ?? null);

  useEffect(() => {
    if (!open) return;
    setStep('setup');
    setSelectedRank(null);
    setCheckedIds(new Set());
    stoppedRef.current = false;
  }, [open]);

  useEffect(() => {
    if (step !== 'running') return;
    if (!position || position.countIn) return;
    if (position.bar >= RANK_TEST_BARS && !stoppedRef.current) {
      stoppedRef.current = true;
      onStop();
      setCheckedIds(new Set());
      setStep('check');
    }
  }, [position, step, onStop]);

  if (!activeRank) {
    return (
      <Sheet open={open} title="Rank test" onClose={onClose}>
        <section className="field">
          <p className="empty-note">Master reached. Nothing left to test here.</p>
        </section>
      </Sheet>
    );
  }

  const targetBpm = exercise.targets[activeRank];
  const targetLine = `${RANK_LABEL[activeRank]} · ${tempoLabel(targetBpm, exercise.subdivision)}`;
  const checklist = checklistFor(exercise);
  const allChecked = checklist.length > 0 && checklist.every((item) => checkedIds.has(item.id));

  const handleStart = () => {
    stoppedRef.current = false;
    setStep('running');
    onStart(targetBpm);
  };

  const handleStop = () => {
    stoppedRef.current = true;
    onStop();
    setStep('setup');
  };

  const toggleItem = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const readout =
    !position || position.countIn ? 'Count-in' : `Bar ${position.bar + 1} of ${RANK_TEST_BARS}`;

  return (
    <Sheet open={open} title="Rank test" onClose={onClose}>
      {step === 'setup' && (
        <>
          <section className="field">
            <h3 className="field-label">Target</h3>
            <div className="segmented" role="radiogroup" aria-label="Target">
              {availableRanks.map((rank) => (
                <label key={rank}>
                  <input
                    type="radio"
                    name={radioGroupName}
                    value={rank}
                    checked={activeRank === rank}
                    onChange={() => setSelectedRank(rank)}
                  />
                  <span>{RANK_LABEL[rank]}</span>
                </label>
              ))}
            </div>
            <p className="rank-test-target-line">{targetLine}</p>
            <p className="rank-test-note">
              One count-in bar, then 8 bars: 2 with the click, 2 silent. Come back in on beat 1 every time.
            </p>
          </section>
          <section className="field">
            <div className="rank-test-actions">
              <button type="button" className="rank-test-primary" onClick={handleStart}>
                Start test
              </button>
            </div>
          </section>
        </>
      )}

      {step === 'running' && (
        <>
          <section className="field">
            <p className="rank-test-target-line">{targetLine}</p>
            <p className="rank-test-readout">{readout}</p>
            {position && !position.countIn && (
              <p className="rank-test-click" data-muted={position.muted}>
                {position.muted ? 'Silent' : 'Click'}
              </p>
            )}
          </section>
          <section className="field">
            <div className="rank-test-actions">
              <button type="button" className="rank-test-stop" onClick={handleStop}>
                Stop test
              </button>
            </div>
          </section>
        </>
      )}

      {step === 'check' && (
        <>
          <section className="field">
            <p className="rank-test-check-heading">Be honest. Tick only what was true.</p>
            {checklist.map((item) => (
              <label key={item.id} className="check">
                <input
                  type="checkbox"
                  checked={checkedIds.has(item.id)}
                  onChange={() => toggleItem(item.id)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </section>
          <section className="field">
            <div className="rank-test-actions">
              <button
                type="button"
                className="rank-test-primary"
                disabled={!allChecked}
                onClick={() => onClaim(targetBpm)}
              >
                {`Claim ${RANK_LABEL[activeRank]}`}
              </button>
              <button type="button" className="text-button" onClick={onClose}>
                Not yet
              </button>
            </div>
          </section>
        </>
      )}
    </Sheet>
  );
}
