import { useState, type ChangeEvent } from 'react';
import type { Song, SongKind } from '@tempodojo/core-songlab';
import { AddYoutubeSheet } from './AddYoutubeSheet';
import { IMPORT_MESSAGES, SongImportError, type SongLibrary } from './types';
import './songs.css';

const KIND_LABEL: Record<SongKind, string> = {
  gp: 'Guitar Pro',
  youtube: 'YouTube',
  pdf: 'PDF',
};

function formatMeta(song: Song): string {
  const parts = [KIND_LABEL[song.kind]];
  if (song.sections.length > 0) {
    parts.push(song.sections.length === 1 ? '1 section' : `${song.sections.length} sections`);
  }
  if (song.kind === 'gp' || song.kind === 'youtube') {
    parts.push(`Last ${song.lastPercent} %`);
  }
  return parts.join(' · ');
}

export interface SongsScreenProps {
  library: SongLibrary;
  onOpen: (s: Song) => void;
  confirm?: (m: string) => boolean;
}

/** Library screen for listing, importing, and removing practice songs. */
export function SongsScreen({ library, onOpen, confirm = window.confirm }: SongsScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [ytOpen, setYtOpen] = useState(false);

  const count = library.songs.length;
  const countText = count === 1 ? '1 song' : `${count} songs`;

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      await library.importFile(file);
    } catch (err) {
      if (err instanceof SongImportError) {
        setError(IMPORT_MESSAGES[err.code]);
      } else {
        throw err;
      }
    }
  };

  const handleRemove = (song: Song) => {
    setError(null);
    if (!confirm(`Remove ${song.title} and its file from this device?`)) return;
    void library.remove(song.id);
  };

  return (
    <main className="songs">
      <header className="running-head">
        <span>Songs</span>
        <span>{countText}</span>
      </header>

      <h1>Songs</h1>

      <div className="songs-add">
        <label className="songs-add-btn">
          <input
            type="file"
            accept=".gp,.gp3,.gp4,.gp5,.gpx,.gp7,.xml,.musicxml,.mxl"
            onChange={handleFileChange}
          />
          <span>Add Guitar Pro or MusicXML</span>
        </label>

        <label className="songs-add-btn">
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
          />
          <span>Add PDF</span>
        </label>

        <button
          type="button"
          className="songs-add-btn"
          onClick={() => {
            setError(null);
            setYtOpen(true);
          }}
        >
          Add YouTube link
        </button>
      </div>

      {error && (
        <p role="alert" className="songs-error">
          {error}
        </p>
      )}

      {count === 0 ? (
        <p className="empty-note">
          Add a Guitar Pro file, a PDF or a YouTube link to practise along with a song.
        </p>
      ) : (
        <ul className="song-list" aria-label="Songs">
          {library.songs.map((song) => (
            <li key={song.id}>
              <button type="button" className="song-row" onClick={() => onOpen(song)}>
                <span className="song-title">{song.title}</span>
                <span className="song-meta">{formatMeta(song)}</span>
              </button>
              <button
                type="button"
                className="text-button songs-remove"
                aria-label={`Remove ${song.title}`}
                onClick={() => handleRemove(song)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <AddYoutubeSheet
        open={ytOpen}
        onClose={() => setYtOpen(false)}
        onAdd={async (input) => {
          await library.addYoutube(input);
        }}
      />
    </main>
  );
}
