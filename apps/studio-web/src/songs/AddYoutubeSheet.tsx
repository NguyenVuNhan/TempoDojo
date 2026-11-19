import { useState, type FormEvent } from 'react';
import { Sheet } from '@tempodojo/ui-kit';
import { IMPORT_MESSAGES, SongImportError } from './types';

export interface AddYoutubeSheetProps {
  open: boolean;
  onClose: () => void;
  onAdd: (input: { url: string; title: string; bpm: number | null }) => Promise<void>;
}

/** Modal sheet for adding a YouTube song link with optional title and BPM. */
export function AddYoutubeSheet({ open, onClose, onAdd }: AddYoutubeSheetProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [bpmInput, setBpmInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setUrl('');
    setTitle('');
    setBpmInput('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedBpm = bpmInput.trim();
    const parsedBpm = trimmedBpm === '' ? null : Number(trimmedBpm);
    try {
      await onAdd({
        url,
        title,
        bpm: parsedBpm !== null && Number.isFinite(parsedBpm) ? parsedBpm : null,
      });
      reset();
      onClose();
    } catch (err) {
      if (err instanceof SongImportError) {
        setError(IMPORT_MESSAGES[err.code]);
      } else {
        throw err;
      }
    }
  };

  return (
    <Sheet open={open} title="Add a YouTube video" onClose={handleClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="num">
            <span>Link</span>
            <input
              type="text"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
        </div>

        <div className="field">
          <label className="num">
            <span>Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
        </div>

        <div className="field">
          <label className="num">
            <span>Song BPM (optional)</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={bpmInput}
              onChange={(e) => setBpmInput(e.target.value)}
            />
          </label>
          <p className="songs-hint">Only needed for a count-in before each loop.</p>
        </div>

        {error && (
          <p role="alert" className="songs-error">
            {error}
          </p>
        )}

        <button type="submit" className="songs-sheet-primary">
          Add video
        </button>
      </form>
    </Sheet>
  );
}
