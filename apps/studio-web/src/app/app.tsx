import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { WebAudioMetronome } from '@tempodojo/audio-web';
import type { Exercise } from '@tempodojo/core-ladder';
import type { PresetRepository } from '@tempodojo/core-metronome';
import {
  createDexieRepositories,
  exportBackup,
  importBackup,
  readBackup,
  type BackupData,
  type EventRepository,
  type KvRepository,
  type PrefsRepository,
  type ProgressRepository,
} from '@tempodojo/storage';
import { ExerciseScreen } from '../ladder/ExerciseScreen';
import { LadderScreen } from '../ladder/LadderScreen';
import { useLadder } from '../ladder/useLadder';
import { MetronomeScreen } from '../metronome/MetronomeScreen';
import type { MetronomeEngineLike } from '../metronome/useMetronome';
import { usePracticeLog } from '../practice/usePracticeLog';
import { BackupSection } from '../settings/BackupSection';
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
  backup?: BackupPort;
}

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
  const { record } = usePracticeLog(resolved.events);
  const metronomeDeps = useMemo(
    () => ({ engine: resolved.engine, repo: resolved.presets }),
    [resolved.engine, resolved.presets],
  );
  const ladderRepos = useMemo(
    () => ({ progress: resolved.progress, prefs: resolved.prefs, generation }),
    [resolved.progress, resolved.prefs, generation],
  );
  const ladder = useLadder(ladderRepos);

  const setTab = useCallback(
    (next: typeof tab) => {
      setOpen(null);
      setTabState(next);
    },
    [setTabState],
  );

  const backup = resolved.backup;
  const settingsExtra: ReactNode = backup ? (
    <BackupSection
      exportBackup={backup.exportBackup}
      readBackup={backup.readBackup}
      importBackup={backup.importBackup}
      onImported={() => setGeneration((g) => g + 1)}
    />
  ) : null;

  let screen: ReactNode = null;
  if (tab === 'metro') {
    screen = <MetronomeScreen key={generation} deps={metronomeDeps} onTransport={record} />;
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
      <TabBar tab={tab} onChange={setTab} />
    </div>
  );
}

export default App;
