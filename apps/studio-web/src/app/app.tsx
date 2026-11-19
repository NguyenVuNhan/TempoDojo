import { useMemo } from 'react';
import { WebAudioMetronome } from '@tempodojo/audio-web';
import type { PresetRepository } from '@tempodojo/core-metronome';
import { createDexieRepositories, type KvRepository } from '@tempodojo/storage';
import { MetronomeScreen } from '../metronome/MetronomeScreen';
import type { MetronomeEngineLike } from '../metronome/useMetronome';
import { usePracticeLog, type EventSink } from '../practice/usePracticeLog';
import { PlaceholderScreen } from './PlaceholderScreen';
import { TabBar } from './TabBar';
import { useLastTab } from './useLastTab';
import './app.css';

export interface AppDeps {
  engine: MetronomeEngineLike;
  presets: PresetRepository;
  kv: KvRepository;
  events: EventSink;
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
    };
  }
  return defaultDeps;
}

export function App({ deps }: { deps?: AppDeps }) {
  const resolved = useMemo(() => deps ?? getDefaultDeps(), [deps]);
  const [tab, setTab] = useLastTab(resolved.kv);
  const { record } = usePracticeLog(resolved.events);
  const metronomeDeps = useMemo(
    () => ({ engine: resolved.engine, repo: resolved.presets }),
    [resolved.engine, resolved.presets],
  );

  return (
    <div className="shell">
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="shell-panel">
        {tab === 'today' && (
          <PlaceholderScreen title="Today" note="Next up and your practice week arrive here." />
        )}
        {tab === 'ladder' && (
          <PlaceholderScreen title="Ladder" note="The hands, coordination and feet ladder arrives here." />
        )}
        {tab === 'metro' && <MetronomeScreen deps={metronomeDeps} onTransport={record} />}
      </div>
      <TabBar tab={tab} onChange={setTab} />
    </div>
  );
}

export default App;
