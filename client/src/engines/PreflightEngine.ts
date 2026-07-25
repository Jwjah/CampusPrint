import { DocumentModel, PreflightWarning } from '../models/DocumentModel';
import { EventBus, CoreEvent } from './EventBus';
import { IEngine } from './IEngine';

class PreflightEngineClass implements IEngine {
  private unsubDoc: (() => void) | null = null;
  private currentTimeout: NodeJS.Timeout | null = null;
  private worker: Worker | null = null;
  
  public initialize() {
    if (typeof window !== 'undefined') {
      this.worker = new Worker(new URL('../workers/preflight.worker.ts', import.meta.url));
      this.worker.onmessage = (event: MessageEvent<PreflightWarning[]>) => {
        const warnings = event.data;
        console.log('[PreflightEngine] Received warnings from worker:', warnings.length);
        
        // Find current document and update it directly so the UI sees it.
        // We do this via DocumentEngine to ensure React rerenders.
        import('./DocumentEngine').then(({ DocumentEngine }) => {
          const currentDoc = DocumentEngine.getDocument();
          if (currentDoc) {
            currentDoc.metadata.warnings = warnings;
            // Emit specific event to avoid infinite loop
            EventBus.emit('PREFLIGHT_WARNINGS_UPDATED', warnings);
          }
        });
        
        EventBus.emit('PREFLIGHT_ANALYSIS_COMPLETE', warnings);
      };
    }

    this.unsubDoc = EventBus.on(CoreEvent.DOCUMENT_UPDATED, (doc: DocumentModel) => {
      this.scheduleAnalysis(doc);
    });
  }

  public dispose() {
    if (this.unsubDoc) this.unsubDoc();
    if (this.currentTimeout) clearTimeout(this.currentTimeout);
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  public reset() {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    // Note: Do not terminate worker on reset, just clear timeouts.
  }

  private scheduleAnalysis(doc: DocumentModel) {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
    }
    // Debounce analysis to prevent blocking during active editing
    this.currentTimeout = setTimeout(() => {
      this.analyzeDocument(doc);
    }, 1000);
  }

  private analyzeDocument(doc: DocumentModel) {
    console.log('[PreflightEngine] Dispatching document to worker for print readiness...');
    if (this.worker) {
      this.worker.postMessage(doc);
    }
  }
}

export const PreflightEngine = new PreflightEngineClass();
