import './sound.css';

export function SoundBanner({ blocked, onResume }: { blocked: boolean; onResume: () => void }) {
  if (!blocked) return null;
  return (
    <div role="alert" className="sound-banner">
      <button type="button" onClick={onResume}>
        The iPad paused the sound. Tap to resume.
      </button>
    </div>
  );
}
