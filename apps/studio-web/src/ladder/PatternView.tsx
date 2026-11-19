import { parseSteps, type Exercise, type Step } from '@tempodojo/core-ladder';
import { pulsesPerBar } from '@tempodojo/core-metronome';
import { VOICE_LABEL } from './labels';
import './pattern.css';

const OTHER_HAND_LOWER: Record<NonNullable<Step['hand']>, string> = {
  R: 'l',
  L: 'r',
  K: 'k',
  H: 'h',
};

function graceText(step: Step): string | null {
  if (!step.hand) return null;
  if (step.grace === 'flam') return OTHER_HAND_LOWER[step.hand];
  if (step.grace === 'drag') return OTHER_HAND_LOWER[step.hand].repeat(2);
  return null;
}

function describeStep(step: Step): string {
  if (step.rest) return 'rest';
  const parts: string[] = [];
  if (step.accent) parts.push('accent');
  if (step.ghost) parts.push('ghost');
  if (step.grace) parts.push(step.grace);
  if (step.hand) parts.push(step.hand);
  return parts.join(' ');
}

export function PatternView({ exercise }: { exercise: Exercise }) {
  const beatCount = pulsesPerBar(exercise.meter);
  const sub = exercise.subdivision;

  const parsedLines = exercise.pattern.map((line) => ({
    voice: line.voice,
    steps: parseSteps(line.steps),
  }));

  const ariaLabel = parsedLines
    .map((line) => `${VOICE_LABEL[line.voice]}: ${line.steps.map(describeStep).join(', ')}`)
    .join('; ');

  return (
    <div className="pattern" role="img" aria-label={ariaLabel}>
      {parsedLines.map((line, lineIdx) => (
        <div className="pattern-line" key={`${line.voice}-${lineIdx}`}>
          <span className="pattern-label">{VOICE_LABEL[line.voice]}</span>
          <div className="pattern-beats">
            {Array.from({ length: beatCount }, (_, beatIdx) => {
              const beatSteps = line.steps.slice(beatIdx * sub, (beatIdx + 1) * sub);
              return (
                <span className="beat" key={beatIdx}>
                  {beatSteps.map((step, slotIdx) => {
                    if (step.rest) {
                      return (
                        <span className="slot" key={slotIdx} data-accent={false} data-rest={true}>
                          ·
                        </span>
                      );
                    }
                    const grace = graceText(step);
                    return (
                      <span
                        className="slot"
                        key={slotIdx}
                        data-accent={step.accent}
                        data-rest={false}
                        data-ghost={step.ghost || undefined}
                      >
                        {step.accent && (
                          <svg className="accent" viewBox="12 5 38 21" aria-hidden="true">
                            <path
                              d="M14 7 L48 15.5 L14 24 L14 19.6 L35.5 15.5 L14 11.4 Z"
                              fill="currentColor"
                            />
                          </svg>
                        )}
                        <span className="glyph-row">
                          {grace && <span className="grace">{grace}</span>}
                          {step.ghost && <span className="paren">(</span>}
                          <span className="stroke">{step.hand}</span>
                          {step.ghost && <span className="paren">)</span>}
                          {step.grace === 'buzz' && <span className="buzz">z</span>}
                        </span>
                      </span>
                    );
                  })}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
