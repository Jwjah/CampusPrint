import { DocumentModel } from '../models/DocumentModel';
import { EventBus, CoreEvent } from './EventBus';
import { ICommand } from '../commands/Command';
import { IEngine } from './IEngine';

class DocumentEngineClass implements IEngine {
  private document: DocumentModel | null = null;

  public initialize() {}
  public dispose() {}
  public reset() { this.document = null; }

  public getDocument(): DocumentModel | null {
    return this.document;
  }

  public setDocument(doc: DocumentModel) {
    this.document = doc;
    EventBus.emit(CoreEvent.DOCUMENT_LOADED, this.document);
  }

  /**
   * Applies a mutation directly to the document. Should only be called by CommandEngine/HistoryEngine.
   */
  public mutate(mutationFn: (doc: DocumentModel) => void) {
    if (!this.document) return;
    try {
      mutationFn(this.document);
      // Emit event that document structure changed so Renderers update
      EventBus.emit(CoreEvent.DOCUMENT_UPDATED, this.document);
    } catch (e) {
      console.error('[DocumentEngine] Mutation failed:', e);
    }
  }
}

export const DocumentEngine = new DocumentEngineClass();
