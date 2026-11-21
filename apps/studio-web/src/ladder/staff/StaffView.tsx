import { useEffect, useRef, useState, type CSSProperties, Fragment } from 'react';
import type { Exercise } from '@tempodojo/core-ladder';
import { pulsesPerBar } from '@tempodojo/core-metronome';
import { PencilRing } from '../../metronome/PencilRing';
import { beatsPerLineFor, describeStaff, layoutStaff, STAFF_STEP } from './layout';
import './staff.css';

export interface PatternLive {
  bar: number;
  pulse: number;
}

const SLOT_WIDTH = 44;
const MARGIN_LEFT = 24;
const MARGIN_RIGHT = 16;
/** Largest on-screen scale of the staff drawing (CSS px per viewBox unit), so wide screens don't blow it up. */
const MAX_SCALE = 1.5;
const COUNT_BAND = 26;
/** One sticking row (letter height). */
const STICK_ROW = 20;
const LINE_GAP = 12;
const HALF_SPACE = LINE_GAP / 2;

export function StaffView({
  exercise,
  live = null,
  showCounts = false,
}: {
  exercise: Exercise;
  live?: PatternLive | null;
  showCounts?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const el = rootRef.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const beatsPerLine = beatsPerLineFor(width, exercise);
  const systems = layoutStaff(exercise, beatsPerLine);

  // Vertical bands, top to bottom: counts, sticking rows, beams, staff, feet.
  const C = showCounts ? COUNT_BAND : 0;
  const stickRows = Math.max(0, ...systems.flatMap((sys) => sys.slots.map((sl) => sl.sticking.length)));
  const stickTop = C + 4;
  const beamY = stickTop + stickRows * STICK_ROW + 10;
  const L0 = beamY + 40;
  const hasFootLetters = systems.some((sys) => sys.slots.some((sl) => sl.foot));
  const footY = L0 + 106;
  const viewBoxHeight = L0 + 84 + (hasFootLetters ? 32 : 0);
  // Every line shares one scale: a full line's width. A short last line stays the same size, left-aligned.
  const fullLineWidth = Math.min(beatsPerLine, pulsesPerBar(exercise.meter)) * exercise.subdivision * SLOT_WIDTH + MARGIN_LEFT + MARGIN_RIGHT;

  return (
    <div className="staff" role="img" aria-label={describeStaff(exercise)} ref={rootRef}>
      <div className="staff-lines" style={{ maxWidth: `${fullLineWidth * MAX_SCALE}px` }}>
      {systems.map((system, sysIdx) => {
        const slotCount = system.slots.length;
        const viewBoxWidth = slotCount * SLOT_WIDTH + MARGIN_LEFT + MARGIN_RIGHT;

        const staffLeft = 12;
        const staffRight = viewBoxWidth - 12;

        const hasLiveRing = live !== null && system.beats.includes(live.pulse);
        let liveSlotXPercent = 50;
        let liveSlotYPercent = 50;

        if (hasLiveRing) {
          const liveSlotIndex = system.slots.findIndex((s) => s.beat === live.pulse);
          const targetSlotIdx = liveSlotIndex >= 0 ? liveSlotIndex : 0;
          const targetSlotX = MARGIN_LEFT + (targetSlotIdx + 0.5) * SLOT_WIDTH;
          liveSlotXPercent = (targetSlotX / viewBoxWidth) * 100;
          liveSlotYPercent = ((L0 + 24) / viewBoxHeight) * 100;
        }

        return (
          <div
            className="staff-system"
            key={sysIdx}
            style={
              {
                position: 'relative',
                width: `${(viewBoxWidth / fullLineWidth) * 100}%`,
                ...(hasLiveRing
                  ? {
                      '--ring-left': `${liveSlotXPercent}%`,
                      '--ring-top': `${liveSlotYPercent}%`,
                    }
                  : {}),
              } as CSSProperties
            }
          >
            {hasLiveRing && (
              <PencilRing downbeat={live.pulse === 0} key={`${live.bar}-${live.pulse}`} />
            )}
            <svg
              data-system
              viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
              width="100%"
              height="auto"
            >
              {/* Staff lines */}
              {[0, 1, 2, 3, 4].map((k) => (
                <line
                  key={k}
                  className="staff-line"
                  x1={staffLeft}
                  y1={L0 + k * LINE_GAP}
                  x2={staffRight}
                  y2={L0 + k * LINE_GAP}
                />
              ))}

              {/* Barlines at both ends */}
              <line
                className="staff-barline"
                x1={staffLeft}
                y1={L0}
                x2={staffLeft}
                y2={L0 + 4 * LINE_GAP}
              />
              <line
                className="staff-barline"
                x1={staffRight}
                y1={L0}
                x2={staffRight}
                y2={L0 + 4 * LINE_GAP}
              />

              {/* Beams per beat */}
              {system.beats.map((beat) => {
                const beatSlots = system.slots.filter((s) => s.beat === beat);
                const upStemSlots = beatSlots.filter((s) =>
                  s.notes.some((n) => n.stem === 'up'),
                );

                if (upStemSlots.length === 0 || exercise.subdivision === 1) {
                  return null;
                }

                const firstSlot = upStemSlots[0];
                const lastSlot = upStemSlots[upStemSlots.length - 1];
                const firstIndex = system.slots.indexOf(firstSlot);
                const lastIndex = system.slots.indexOf(lastSlot);

                const stemX1 = MARGIN_LEFT + (firstIndex + 0.5) * SLOT_WIDTH + 6;
                const rawStemX2 = MARGIN_LEFT + (lastIndex + 0.5) * SLOT_WIDTH + 6;
                const stemX2 = firstIndex === lastIndex ? stemX1 + 10 : rawStemX2;

                const beamX1 = stemX1 - 0.8;
                const beamWidth = stemX2 - stemX1 + 1.6;

                const showTuplet =
                  exercise.subdivision === 3 || exercise.subdivision === 6;

                return (
                  <Fragment key={`beam-${beat}`}>
                    <rect
                      className="staff-beam"
                      x={beamX1}
                      y={beamY}
                      width={beamWidth}
                      height={4.5}
                    />
                    {exercise.subdivision >= 4 && (
                      <rect
                        className="staff-beam"
                        x={beamX1}
                        y={beamY + 8}
                        width={beamWidth}
                        height={4.5}
                      />
                    )}
                    {showTuplet && (
                      <text
                        className="staff-tuplet"
                        x={(stemX1 + stemX2) / 2}
                        y={beamY - 4}
                      >
                        {exercise.subdivision}
                      </text>
                    )}
                  </Fragment>
                );
              })}

              {/* Slots */}
              {system.slots.map((slot, slotIndex) => {
                const cx = MARGIN_LEFT + (slotIndex + 0.5) * SLOT_WIDTH;

                const upNotes = slot.notes.filter((n) => n.stem === 'up');
                const downNotes = slot.notes.filter((n) => n.stem === 'down');

                const lowestUpNote =
                  upNotes.length > 0
                    ? upNotes.reduce((a, b) => (a.step > b.step ? a : b))
                    : null;
                const lowestUpY = lowestUpNote ? L0 + lowestUpNote.step * HALF_SPACE : null;

                const highestDownNote =
                  downNotes.length > 0
                    ? downNotes.reduce((a, b) => (a.step < b.step ? a : b))
                    : null;
                const lowestDownNote =
                  downNotes.length > 0
                    ? downNotes.reduce((a, b) => (a.step > b.step ? a : b))
                    : null;

                const highestDownY = highestDownNote
                  ? L0 + highestDownNote.step * HALF_SPACE
                  : null;
                const lowestDownY = lowestDownNote
                  ? L0 + lowestDownNote.step * HALF_SPACE
                  : null;

                const hasCrash = slot.notes.some((n) => n.step <= -2);

                return (
                  <g data-slot={slot.slot} key={slot.slot}>
                    {/* Ledger line for step <= -2 (crash) */}
                    {hasCrash && (
                      <line
                        className="staff-ledger"
                        x1={cx - 11}
                        y1={L0 + STAFF_STEP.crash * HALF_SPACE}
                        x2={cx + 11}
                        y2={L0 + STAFF_STEP.crash * HALF_SPACE}
                      />
                    )}

                    {/* Up stem */}
                    {lowestUpY !== null && (
                      <line
                        className="staff-stem"
                        x1={cx + 6}
                        y1={lowestUpY}
                        x2={cx + 6}
                        y2={beamY}
                      />
                    )}

                    {/* Down stem */}
                    {highestDownY !== null && lowestDownY !== null && (
                      <line
                        className="staff-stem"
                        x1={cx - 6}
                        y1={highestDownY}
                        x2={cx - 6}
                        y2={Math.max(lowestDownY + 24, L0 + 78)}
                      />
                    )}

                    {/* Noteheads */}
                    {slot.notes.map((note, noteIdx) => {
                      const noteY = L0 + note.step * HALF_SPACE;

                      return (
                        <Fragment key={noteIdx}>
                          {note.head === 'x' ? (
                            <path
                              className="staff-note-x"
                              data-ghost={note.ghost || undefined}
                              d={`M ${cx - 5} ${noteY - 5} L ${cx + 5} ${noteY + 5} M ${cx - 5} ${noteY + 5} L ${cx + 5} ${noteY - 5}`}
                            />
                          ) : (
                            <ellipse
                              className="staff-note-normal"
                              data-ghost={note.ghost || undefined}
                              cx={cx}
                              cy={noteY}
                              rx={6.5}
                              ry={4.6}
                              transform={`rotate(-20 ${cx} ${noteY})`}
                            />
                          )}

                          {note.ghost && (
                            <>
                              <text
                                data-paren
                                className="staff-paren"
                                x={cx - 12}
                                y={noteY + 5}
                              >
                                (
                              </text>
                              <text
                                data-paren
                                className="staff-paren"
                                x={cx + 12}
                                y={noteY + 5}
                              >
                                )
                              </text>
                            </>
                          )}

                          {note.grace === 'flam' && (
                            <g className="staff-grace-group">
                              {note.head === 'x' ? (
                                <path
                                  className="staff-note-x"
                                  d={`M ${cx - 17 - 3.5} ${noteY - 3.5} L ${cx - 17 + 3.5} ${noteY + 3.5} M ${cx - 17 - 3.5} ${noteY + 3.5} L ${cx - 17 + 3.5} ${noteY - 3.5}`}
                                  strokeWidth={1.5}
                                />
                              ) : (
                                <ellipse
                                  className="staff-grace-head"
                                  cx={cx - 17}
                                  cy={noteY}
                                  rx={4.5}
                                  ry={3.2}
                                  transform={`rotate(-20 ${cx - 17} ${noteY})`}
                                />
                              )}
                              <line
                                className="staff-grace-stem"
                                x1={cx - 17 + 4}
                                y1={noteY}
                                x2={cx - 17 + 4}
                                y2={noteY - 13}
                              />
                              <line
                                className="staff-grace-slash"
                                x1={cx - 17 + 1}
                                y1={noteY - 5}
                                x2={cx - 17 + 7}
                                y2={noteY - 9}
                              />
                            </g>
                          )}

                          {note.grace === 'drag' && (
                            <g className="staff-grace-group">
                              {[-24, -16].map((dx, i) => (
                                <Fragment key={i}>
                                  {note.head === 'x' ? (
                                    <path
                                      className="staff-note-x"
                                      d={`M ${cx + dx - 3.5} ${noteY - 3.5} L ${cx + dx + 3.5} ${noteY + 3.5} M ${cx + dx - 3.5} ${noteY + 3.5} L ${cx + dx + 3.5} ${noteY - 3.5}`}
                                      strokeWidth={1.5}
                                    />
                                  ) : (
                                    <ellipse
                                      className="staff-grace-head"
                                      cx={cx + dx}
                                      cy={noteY}
                                      rx={4.5}
                                      ry={3.2}
                                      transform={`rotate(-20 ${cx + dx} ${noteY})`}
                                    />
                                  )}
                                  <line
                                    className="staff-grace-stem"
                                    x1={cx + dx + 4}
                                    y1={noteY}
                                    x2={cx + dx + 4}
                                    y2={noteY - 13}
                                  />
                                </Fragment>
                              ))}
                              <line
                                className="staff-grace-slash"
                                x1={cx - 23}
                                y1={noteY - 5}
                                x2={cx - 13}
                                y2={noteY - 9}
                              />
                            </g>
                          )}

                          {note.grace === 'buzz' && (
                            <text
                              className="staff-buzz"
                              x={cx + 6}
                              y={(noteY + beamY) / 2 + 4}
                            >
                              z
                            </text>
                          )}
                        </Fragment>
                      );
                    })}

                    {/* Counts at the very top */}
                    {showCounts && (
                      <text
                        data-count
                        data-downbeat={slot.slot % exercise.subdivision === 0 || undefined}
                        className="staff-count"
                        x={cx}
                        y={18}
                      >
                        {slot.count}
                      </text>
                    )}

                    {/* Sticking letters row */}
                    {slot.sticking.map((letter, letterIdx) => {
                      const rowTop = stickTop + letterIdx * STICK_ROW;
                      const letY = rowTop + 17;
                      const graceY = letY - 1;
                      const graceX = cx - (letter.ghost ? 6 : 7);

                      return (
                        <Fragment key={letterIdx}>
                          {letter.grace && (
                            <text
                              data-grace
                              className="staff-grace"
                              x={graceX}
                              y={graceY}
                            >
                              {letter.grace}
                            </text>
                          )}
                          <text
                            data-stick
                            data-ghost={letter.ghost || undefined}
                            className="staff-stick"
                            x={cx}
                            y={letY}
                          >
                            {letter.text}
                          </text>
                        </Fragment>
                      );
                    })}

                    {/* Foot sticking letter */}
                    {slot.foot && (
                      <text
                        data-foot
                        data-ghost={slot.foot.ghost || undefined}
                        className="staff-foot"
                        x={cx}
                        y={footY}
                      >
                        {slot.foot.text}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        );
      })}
      </div>
    </div>
  );
}
