import { EventBus, CoreEvent } from './EventBus';
import { IEngine } from './IEngine';

class SelectionEngineClass implements IEngine {
  // A set of selected Object IDs (across any page/layer)
  private selectedObjectIds: Set<string> = new Set();

  private unsubCreated: (() => void) | null = null;
  private unsubCleared: (() => void) | null = null;

  public initialize() {
    this.unsubCreated = EventBus.on('FABRIC_SELECTION_CREATED', (payload) => this.handleSelection(payload));
    this.unsubCleared = EventBus.on('FABRIC_SELECTION_CLEARED', () => this.clearSelection());
  }

  public dispose() {
    if (this.unsubCreated) this.unsubCreated();
    if (this.unsubCleared) this.unsubCleared();
  }

  public reset() {
    this.clearSelection();
  }

  public getSelectedIds(): string[] {
    return Array.from(this.selectedObjectIds);
  }

  public select(objectIds: string[], append: boolean = false) {
    if (!append) {
      this.selectedObjectIds.clear();
    }
    objectIds.forEach(id => this.selectedObjectIds.add(id));
    this.broadcastSelection();
  }

  public deselect(objectId: string) {
    if (this.selectedObjectIds.has(objectId)) {
      this.selectedObjectIds.delete(objectId);
      this.broadcastSelection();
    }
  }

  public clearSelection() {
    if (this.selectedObjectIds.size > 0) {
      this.selectedObjectIds.clear();
      this.broadcastSelection();
    }
  }

  private handleSelection(payload: any) {
    // payload would contain fabric objects which map back to DocumentModel IDs
    // Extract IDs, and call this.select()
    // For this blueprint:
    if (payload.objectIds) {
      this.select(payload.objectIds, payload.isShiftPressed);
    }
  }

  private broadcastSelection() {
    EventBus.emit(CoreEvent.SELECTION_CHANGED, this.getSelectedIds());
  }
}

export const SelectionEngine = new SelectionEngineClass();
