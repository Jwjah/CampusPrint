import { EventBus, CoreEvent } from './EventBus';

export interface EngineContext {
  eventBus: typeof EventBus;
  // Can pass refs to DocumentEngine, HistoryEngine, etc.
}

export interface IPlugin {
  id: string; // Stable UUID or constant
  name: string;
  init(context: EngineContext): void;
  destroy(): void;
}

export interface IToolPlugin extends IPlugin {
  activate(): void;
  deactivate(): void;
  onPointerDown(event: any): void; // Type as needed (fabric.IEvent or native PointerEvent)
  onPointerMove(event: any): void;
  onPointerUp(event: any): void;
}

import { IEngine } from './IEngine';

class PluginManagerClass implements IEngine {
  private plugins: Map<string, IPlugin> = new Map();
  private tools: Map<string, IToolPlugin> = new Map();
  private activeToolId: string | null = null;
  private context: EngineContext = { eventBus: EventBus };

  public initialize() {}

  public dispose() {
    this.plugins.forEach(p => p.destroy());
    this.plugins.clear();
    this.tools.clear();
    this.activeToolId = null;
  }

  public reset() {
    if (this.activeToolId) {
      const activeTool = this.tools.get(this.activeToolId);
      if (activeTool) activeTool.deactivate();
      this.activeToolId = null;
    }
  }

  public registerPlugin(plugin: IPlugin) {
    this.plugins.set(plugin.id, plugin);
    plugin.init(this.context);
    EventBus.emit(CoreEvent.PLUGIN_REGISTERED, plugin.id);
  }

  public registerTool(tool: IToolPlugin) {
    this.registerPlugin(tool);
    this.tools.set(tool.id, tool);
  }

  public activateTool(toolId: string) {
    if (this.activeToolId === toolId) return;

    if (this.activeToolId) {
      const activeTool = this.tools.get(this.activeToolId);
      if (activeTool) activeTool.deactivate();
    }

    const newTool = this.tools.get(toolId);
    if (newTool) {
      newTool.activate();
      this.activeToolId = toolId;
      EventBus.emit(CoreEvent.TOOL_ACTIVATED, toolId);
    }
  }

  public getActiveTool(): IToolPlugin | null {
    if (!this.activeToolId) return null;
    return this.tools.get(this.activeToolId) || null;
  }
}

export const PluginManager = new PluginManagerClass();
