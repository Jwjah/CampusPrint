import { useEffect, useRef } from 'react';
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

export function useEngines() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
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
      initialized.current = true;
      
      return () => {
        EngineRegistry.disposeAll();
      };
    }
  }, []);

  return initialized.current;
}
