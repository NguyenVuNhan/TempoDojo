import type { ScoreInfo, Song } from '@tempodojo/core-songlab';
import type { NotationOptions, NotationPlayer } from '@tempodojo/notation';
import type { PdfDoc } from '@tempodojo/pdf';
import type { FileRepository, SongRepository, StoredFile } from '@tempodojo/storage';
import type { VideoPlayer } from '@tempodojo/youtube';

/** Platform players behind interfaces, so song screens are tested with fakes. */
export interface PlayerFactories {
  notation(el: HTMLElement, opts: NotationOptions): NotationPlayer;
  video(el: HTMLElement, videoId: string): VideoPlayer;
  pdf(bytes: Uint8Array): Promise<PdfDoc>;
  /** Reads a GP/MusicXML file far enough for its title, bars and markers; rejects NotationError. */
  probeScore(bytes: Uint8Array): Promise<ScoreInfo>;
}

export interface SongRepos {
  songs: SongRepository;
  files: FileRepository;
}

export type SongImportErrorCode = 'unsupported' | 'unreadable-score' | 'unreadable-pdf' | 'bad-youtube-link';

export class SongImportError extends Error {
  constructor(public readonly code: SongImportErrorCode) {
    super(code);
    this.name = 'SongImportError';
  }
}

/** What the drummer reads for each import problem. */
export const IMPORT_MESSAGES: Record<SongImportErrorCode, string> = {
  unsupported: 'TempoDojo opens Guitar Pro, MusicXML and PDF files.',
  'unreadable-score': 'This file could not be opened as a Guitar Pro or MusicXML score.',
  'unreadable-pdf': 'This file is not a readable PDF.',
  'bad-youtube-link': 'That is not a YouTube link.',
};

/** The song library: what useSongs returns and the Songs screen and players use. */
export interface SongLibrary {
  loaded: boolean;
  /** Last opened first, then newest added. */
  songs: Song[];
  /** By extension: .gp .gp3 .gp4 .gp5 .gpx .gp7 .xml .musicxml .mxl → score; .pdf → PDF. Rejects SongImportError. */
  importFile(file: File): Promise<Song>;
  /** Rejects SongImportError('bad-youtube-link'). Title falls back to "YouTube video". */
  addYoutube(input: { url: string; title: string; bpm: number | null }): Promise<Song>;
  update(song: Song): Promise<void>;
  remove(id: string): Promise<void>;
  /** Marks the song as just opened. */
  touch(id: string): Promise<void>;
  file(id: string): Promise<StoredFile | undefined>;
}
