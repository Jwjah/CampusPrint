import { EventBus, CoreEvent } from './EventBus';
import { SelectionEngine } from './SelectionEngine';
import { IEngine } from './IEngine';

class ShortcutEngineClass implements IEngine {
  private boundHandler: (e: KeyboardEvent) => void;

  constructor() {
    this.boundHandler = this.handleKeyDown.bind(this);
  }

  public initialize() {
    window.addEventListener('keydown', this.boundHandler);
  }

  public dispose() {
    window.removeEventListener('keydown', this.boundHandler);
  }

  public reset() {}

  private handleKeyDown(e: KeyboardEvent) {
    // Ignore if typing in an input or textarea
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

    if (ctrlOrCmd && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        EventBus.emit(CoreEvent.ACTION_REDO);
      } else {
        EventBus.emit(CoreEvent.ACTION_UNDO);
      }
      return;
    }

    if (ctrlOrCmd && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      EventBus.emit(CoreEvent.ACTION_REDO);
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      const selected = SelectionEngine.getSelectedIds();
      if (selected.length > 0) {
        e.preventDefault();
        // Fire intent to delete selected objects
        // EventBus.emit(CoreEvent.ACTION_DELETE_OBJECTS, selected);
      }
      return;
    }

    if (ctrlOrCmd && e.key.toLowerCase() === 's') {
      e.preventDefault();
      EventBus.emit(CoreEvent.ACTION_SAVE);
      return;
    }
    
    // Pass other unhandled keystrokes down to active tool if needed
    // const activeTool = PluginManager.getActiveTool();
    // activeTool?.onKeyDown(e);
  }
}

export const ShortcutEngine = new ShortcutEngineClass();
