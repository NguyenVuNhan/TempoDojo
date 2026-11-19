export interface PlaceholderScreenProps {
  title: string;
  note: string;
}

/** Temporary placeholder column for unbuilt shell tabs. */
export function PlaceholderScreen({ title, note }: PlaceholderScreenProps) {
  return (
    <main className="placeholder">
      <header className="running-head">
        <span>{title}</span>
      </header>
      <h1 className="placeholder-title">{title}</h1>
      <p className="placeholder-note">{note}</p>
    </main>
  );
}
