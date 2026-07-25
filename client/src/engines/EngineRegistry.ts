import { IEngine } from './IEngine';

class EngineRegistryClass {
  private engines: Map<string, IEngine> = new Map();
  private isInitialized = false;

  public register(name: string, engine: IEngine) {
    if (this.engines.has(name)) {
      console.warn(`[EngineRegistry] Engine ${name} is already registered.`);
      return;
    }
    this.engines.set(name, engine);
    
    // If the registry is already initialized, initialize the late-added engine immediately
    if (this.isInitialized) {
      engine.initialize();
    }
  }

  public get(name: string): IEngine | undefined {
    return this.engines.get(name);
  }

  public initializeAll() {
    if (this.isInitialized) return;
    console.log('[EngineRegistry] Initializing all engines...');
    this.engines.forEach((engine, name) => {
      try {
        engine.initialize();
      } catch (err) {
        console.error(`[EngineRegistry] Failed to initialize engine ${name}:`, err);
      }
    });
    this.isInitialized = true;
  }

  public resetAll() {
    console.log('[EngineRegistry] Resetting all engines...');
    this.engines.forEach((engine, name) => {
      try {
        engine.reset();
      } catch (err) {
        console.error(`[EngineRegistry] Failed to reset engine ${name}:`, err);
      }
    });
  }

  public disposeAll() {
    console.log('[EngineRegistry] Disposing all engines...');
    this.engines.forEach((engine, name) => {
      try {
        engine.dispose();
      } catch (err) {
        console.error(`[EngineRegistry] Failed to dispose engine ${name}:`, err);
      }
    });
    this.engines.clear();
    this.isInitialized = false;
  }
}

export const EngineRegistry = new EngineRegistryClass();
