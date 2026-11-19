import { useEffect, useId, useRef, type ReactNode } from 'react';
import './sheet.css';

export interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  doneLabel?: string;
}

/** Bottom sheet (side panel on wide screens): a labelled modal dialog that closes on Done, Escape or the backdrop. */
export function Sheet({ open, title, onClose, children, doneLabel = 'Done' }: SheetProps) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);

  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        ref={panel}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <header className="sheet-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="sheet-done" onClick={onClose}>
            {doneLabel}
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
