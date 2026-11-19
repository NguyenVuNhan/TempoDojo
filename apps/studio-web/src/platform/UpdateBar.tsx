import './update.css';

export function UpdateBar({
  ready,
  playing,
  onUpdate,
  onLater,
}: {
  ready: boolean;
  playing: boolean;
  onUpdate: () => void;
  onLater: () => void;
}) {
  if (!ready || playing) {
    return null;
  }

  return (
    <div role="status" className="update-bar">
      <p>A new version of TempoDojo is ready.</p>
      <div>
        <button type="button" onClick={onUpdate}>
          Update
        </button>
        <button type="button" onClick={onLater}>
          Later
        </button>
      </div>
    </div>
  );
}
