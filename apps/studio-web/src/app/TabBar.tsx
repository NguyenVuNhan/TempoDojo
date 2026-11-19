import { useRef, type KeyboardEvent } from 'react';
import type { Tab } from './useLastTab';

const ITEMS: readonly { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'ladder', label: 'Ladder' },
  { id: 'songs', label: 'Songs' },
  { id: 'metro', label: 'Metro' },
];

export interface TabBarProps {
  tab: Tab;
  onChange: (tab: Tab) => void;
}

/** Bottom navigation bar switching between Today, Ladder, Songs and Metro. */
export function TabBar({ tab, onChange }: TabBarProps) {
  const refs = useRef<Record<Tab, HTMLButtonElement | null>>({
    today: null,
    ladder: null,
    songs: null,
    metro: null,
  });

  const handleKeyDown = (index: number) => (e: KeyboardEvent<HTMLButtonElement>) => {
    let nextIndex: number | null = null;
    if (e.key === 'ArrowRight') nextIndex = (index + 1) % ITEMS.length;
    else if (e.key === 'ArrowLeft') nextIndex = (index - 1 + ITEMS.length) % ITEMS.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = ITEMS.length - 1;

    if (nextIndex === null) return;
    e.preventDefault();
    const next = ITEMS[nextIndex].id;
    onChange(next);
    refs.current[next]?.focus();
  };

  return (
    <nav className="tabbar">
      <div role="tablist" aria-label="Sections">
        {ITEMS.map((item, index) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              ref={(el) => {
                refs.current[item.id] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-controls={`panel-${item.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.id)}
              onKeyDown={handleKeyDown(index)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
