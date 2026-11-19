import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { WebAudioMetronome } from '@tempodojo/audio-web';
import type { Exercise } from '@tempodojo/core-ladder';
import type { PresetRepository } from '@tempodojo/core-metronome';
import type { Song } from '@tempodojo/core-songlab';
import {
  createDexieRepositories,
  exportBackup,
  importBackup,
  readBackup,
  storageUsage,
  type BackupData,
  type EventRepository,
  type FileRepository,
  type SongRepository,
  type KvRepository,
  type PrefsRepository,
  type ProgressRepository,
} from '@tempodojo/storage';
import { ExerciseScreen } from '../ladder/ExerciseScreen';
import { LadderScreen } from '../ladder/LadderScreen';
import { useLadder } from '../ladder/useLadder';
import type { PracticeSource } from '@tempodojo/core-practice';
import { MetronomeScreen } from '../metronome/MetronomeScreen';
import type { MetronomeEngineLike } from '../metronome/useMetronome';
import { AppleSoundTip } from '../platform/AppleSoundTip';
import { UpdateBar } from '../platform/UpdateBar';
import { useUpdate, type RegisterSW } from '../platform/useUpdate';
import { usePracticeLog } from '../practice/usePracticeLog';
import { BackupSection } from '../settings/BackupSection';
import { StorageLine } from '../settings/StorageLine';
import { GpPlayerScreen } from '../songs/GpPlayerScreen';
import { PdfViewerScreen } from '../songs/PdfViewerScreen';
import { SongsScreen } from '../songs/SongsScreen';
import type { PlayerFactories } from '../songs/types';
import { useSongs } from '../songs/useSongs';
import { YoutubePlayerScreen } from '../songs/YoutubePlayerScreen';
import { TodayScreen } from '../today/TodayScreen';
import { TabBar } from './TabBar';
import { useLastTab } from './useLastTab';
import './app.css';

export interface BackupPort {
  exportBackup(): Promise<Uint8Array>;
  readBackup(zip: Uint8Array): Promise<BackupData>;
  importBackup(data: BackupData): Promise<void>;
}

export interface AppDeps {
  engine: MetronomeEngineLike;
  presets: PresetRepository;
  kv: KvRepository;
  events: EventRepository;
  progress: ProgressRepository;
  prefs: PrefsRepository;
  songs: SongRepository;
  files: FileRepository;
  /** Song players; when absent the real ones load on first use (alphaTab and pdf.js are large). */
  players?: PlayerFactories;
  backup?: BackupPort;
  usage?: () => Promise<{ usedBytes: number; quotaBytes: number } | null>;
  /** Service-worker registration; tests inject a fake. */
  registerSW?: RegisterSW;
}

const loadDefaultPlayers = () => import('../songs/default-players').then((m) => m.defaultPlayers);

let defaultDeps: AppDeps | null = null;
function getDefaultDeps(): AppDeps {
  if (!defaultDeps) {
    const r = createDexieRepositories();
    defaultDeps = {
      engine: new WebAudioMetronome(),
      presets: r.presets,
      kv: r.kv,
      events: r.events,
      progress: r.progress,
      prefs: r.prefs,
      songs: r.songs,
      files: r.files,
      usage: storageUsage,
      backup: {
        exportBackup: () => exportBackup(r),
        readBackup,
        importBackup: (data) => importBackup(r, data),
      },
    };
  }
  return defaultDeps;
}

export function App({ deps }: { deps?: AppDeps }) {
  const resolved = useMemo(() => deps ?? getDefaultDeps(), [deps]);
  const [tab, setTabState] = useLastTab(resolved.kv);
  const [open, setOpen] = useState<Exercise | null>(null);
  // Bumped after a backup import so every screen re-reads storage.
  const [generation, setGeneration] = useState(0);
  const { record: logTransport } = usePracticeLog(resolved.events);
  // Whatever is playing (metronome, exercise or song), from the last transport event; updates wait for Stop.
  const [playing, setPlaying] = useState(false);
  const record = useCallback(
    (type: 'play' | 'stop', source: PracticeSource) => {
      setPlaying(type === 'play');
      logTransport(type, source);
    },
    [logTransport],
  );
  const update = useUpdate(resolved.registerSW);
  const metronomeDeps = useMemo(
    () => ({ engine: resolved.engine, repo: resolved.presets }),
    [resolved.engine, resolved.presets],
  );
  const ladderRepos = useMemo(
    () => ({ progress: resolved.progress, prefs: resolved.prefs, generation }),
    [resolved.progress, resolved.prefs, generation],
  );
  const ladder = useLadder(ladderRepos);

  const [players, setPlayers] = useState<PlayerFactories | null>(resolved.players ?? null);
  const playersRef = useRef(players);
  playersRef.current = players;
  const songRepos = useMemo(
    () => ({ songs: resolved.songs, files: resolved.files, generation }),
    [resolved.songs, resolved.files, generation],
  );
  const probe = useCallback(
    async (bytes: Uint8Array) => (playersRef.current ?? (await loadDefaultPlayers())).probeScore(bytes),
    [],
  );
  const library = useSongs(songRepos, probe);
  const [openSong, setOpenSong] = useState<Song | null>(null);
  useEffect(() => {
    if (tab === 'songs' && !players) void loadDefaultPlayers().then(setPlayers);
  }, [tab, players]);

  const setTab = useCallback(
    (next: typeof tab) => {
      setOpen(null);
      setOpenSong(null);
      setTabState(next);
    },
    [setTabState],
  );

  const backup = resolved.backup;
  const settingsExtra: ReactNode = (
    <>
      {backup && (
        <BackupSection
          exportBackup={backup.exportBackup}
          readBackup={backup.readBackup}
          importBackup={backup.importBackup}
          onImported={() => setGeneration((g) => g + 1)}
        />
      )}
      {resolved.usage && <StorageLine usage={resolved.usage} />}
    </>
  );

  // A song section linked to an exercise opens it in the Ladder tab.
  const openExerciseFromSong = (ex: Exercise) => {
    setOpenSong(null);
    setTabState('ladder');
    setOpen(ex);
  };

  let screen: ReactNode = null;
  if (tab === 'songs') {
    if (!library.loaded || !players) {
      screen = null;
    } else if (!openSong) {
      screen = <SongsScreen library={library} onOpen={setOpenSong} />;
    } else {
      const common = {
        song: openSong,
        library,
        players,
        onBack: () => setOpenSong(null),
        onTransport: record,
      };
      if (openSong.kind === 'gp') {
        screen = <GpPlayerScreen key={openSong.id} {...common} exercises={ladder.catalogue} onOpenExercise={openExerciseFromSong} />;
      } else if (openSong.kind === 'youtube') {
        screen = (
          <YoutubePlayerScreen
            key={openSong.id}
            {...common}
            engine={resolved.engine}
            exercises={ladder.catalogue}
            onOpenExercise={openExerciseFromSong}
          />
        );
      } else {
        screen = <PdfViewerScreen key={openSong.id} {...common} kv={resolved.kv} />;
      }
    }
  } else if (tab === 'metro') {
    screen = <MetronomeScreen key={generation} deps={metronomeDeps} onTransport={record} tip={<AppleSoundTip kv={resolved.kv} />} />;
  } else if (!ladder.loaded) {
    screen = null;
  } else if (open) {
    screen = (
      <ExerciseScreen
        key={open.id}
        exercise={open}
        ladder={ladder}
        deps={metronomeDeps}
        onTransport={record}
        onBack={() => setOpen(null)}
      />
    );
  } else if (tab === 'today') {
    screen = (
      <TodayScreen
        key={generation}
        ladder={ladder}
        events={resolved.events}
        onOpen={setOpen}
        onOpenMetro={() => setTab('metro')}
        settingsExtra={settingsExtra}
      />
    );
  } else {
    screen = <LadderScreen ladder={ladder} onOpen={setOpen} />;
  }

  return (
    <div className="shell">
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="shell-panel">
        {screen}
      </div>
      <UpdateBar ready={update.ready} playing={playing} onUpdate={update.update} onLater={update.later} />
      <TabBar tab={tab} onChange={setTab} />
    </div>
  );
}

export default App;
