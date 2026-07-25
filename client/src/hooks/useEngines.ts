import { useEffect, useState } from 'react';
import { EngineRegistry } from '../engines/EngineRegistry';
import { EventBus } from '../engines/EventBus';
import { AutosaveEngine } from '../engines/AutosaveEngine';
import { HistoryEngine } from '../engines/HistoryEngine';
import { RenderingEngine } from '../engines/RenderingEngine';
import { ViewportEngine } from '../engines/ViewportEngine';
import { ExportEngine } from '../engines/ExportEngine';
import { SelectionEngine } from '../engines/SelectionEngine';
import { ShortcutEngine } from '../engines/ShortcutEngine';
import { PreflightEngine } from '../engines/PreflightEngine';
import { CostingEngine } from '../engines/CostingEngine';

let enginesInitializedGlobal = false;

export function useEngines() {
  const [initialized, setInitialized] = useState(enginesInitializedGlobal);

  useEffect(() => {
    if (!enginesInitializedGlobal) {
      console.log('[PrintStudio] Registering Core Engines...');
      
      EngineRegistry.register('EventBus', EventBus);
      EngineRegistry.register('AutosaveEngine', AutosaveEngine);
      EngineRegistry.register('HistoryEngine', HistoryEngine);
      EngineRegistry.register('RenderingEngine', RenderingEngine);
      EngineRegistry.register('ViewportEngine', ViewportEngine);
      EngineRegistry.register('ExportEngine', ExportEngine);
      EngineRegistry.register('SelectionEngine', SelectionEngine);
      EngineRegistry.register('ShortcutEngine', ShortcutEngine);
      EngineRegistry.register('PreflightEngine', PreflightEngine);
      EngineRegistry.register('CostingEngine', CostingEngine);
      
      EngineRegistry.initializeAll();
      enginesInitializedGlobal = true;
      setInitialized(true);
      
      return () => {
        EngineRegistry.disposeAll();
        enginesInitializedGlobal = false;
      };
    }
  }, []);

  return initialized;
}
