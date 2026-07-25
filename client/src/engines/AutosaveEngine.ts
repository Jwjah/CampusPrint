import { openDB, IDBPDatabase } from 'idb';
import { DocumentModel } from '../models/DocumentModel';
import { WorkspaceModel } from '../models/WorkspaceModel';
import { EventBus, CoreEvent } from './EventBus';
import { IEngine } from './IEngine';

const DB_NAME = 'CampusPrintDB';
const DB_VERSION = 1;
const STORE_DOCUMENTS = 'documents';
const STORE_WORKSPACES = 'workspaces';
const STORE_ORIGINALS = 'original_pdfs';

class AutosaveEngineClass implements IEngine {
  private db: IDBPDatabase | null = null;
  private currentDocId: string | null = null;
  private unsubDocument: (() => void) | null = null;
  private unsubWorkspace: (() => void) | null = null;
  private isDirty = false;
  private autosaveInterval: NodeJS.Timeout | null = null;

  public async initialize() {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
          db.createObjectStore(STORE_DOCUMENTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_WORKSPACES)) {
          db.createObjectStore(STORE_WORKSPACES, { keyPath: 'documentId' });
        }
        if (!db.objectStoreNames.contains(STORE_ORIGINALS)) {
          db.createObjectStore(STORE_ORIGINALS, { keyPath: 'id' });
        }
      },
    });

    this.autosaveInterval = setInterval(() => this.processAutosave(), 3000);

    this.unsubDocument = EventBus.on(CoreEvent.DOCUMENT_UPDATED, (doc: DocumentModel) => {
      // In a real scenario, we might want to get the latest workspace as well.
      // For now, we'll let processAutosave handle it or just rely on persistState later.
      this.markDirty();
    });

    this.unsubWorkspace = EventBus.on(CoreEvent.WORKSPACE_UPDATED, (workspace: WorkspaceModel) => {
      this.markDirty();
    });
  }

  public dispose() {
    if (this.unsubDocument) this.unsubDocument();
    if (this.unsubWorkspace) this.unsubWorkspace();
    if (this.autosaveInterval) clearInterval(this.autosaveInterval);
    this.db?.close();
  }

  public reset() {
    this.currentDocId = null;
  }

  public setCurrentDocument(docId: string) {
    this.currentDocId = docId;
  }

  private markDirty() {
    this.isDirty = true;
  }

  private async processAutosave() {
    if (!this.isDirty || !this.currentDocId || !this.db) return;
    this.isDirty = false;
    
    // In a fully integrated system, we would query the active DocumentModel and WorkspaceModel
    // from a StateSynchronizer or Central State Registry. 
    // EventBus.emit('REQUEST_STATE_FOR_AUTOSAVE', (state) => this.persistState(state));
    console.log(`[AutosaveEngine] Autosaved triggered for ${this.currentDocId}`);
  }

  public async persistState(document: DocumentModel, workspace: WorkspaceModel) {
    if (!this.db) return;
    try {
      const tx = this.db.transaction([STORE_DOCUMENTS, STORE_WORKSPACES], 'readwrite');
      await tx.objectStore(STORE_DOCUMENTS).put(document);
      await tx.objectStore(STORE_WORKSPACES).put({ ...workspace, documentId: document.id });
      await tx.done;
      console.log(`[AutosaveEngine] Persisted state successfully for ${document.id}`);
    } catch (err) {
      console.error('[AutosaveEngine] Failed to persist state:', err);
      // If quota exceeded or other error, fallback handling can be done here
    }
  }

  public async saveOriginalPDF(docId: string, bytes: Uint8Array) {
    if (!this.db) return;
    await this.db.put(STORE_ORIGINALS, { id: docId, bytes });
  }

  public async loadState(docId: string): Promise<{ document?: DocumentModel, workspace?: WorkspaceModel, bytes?: Uint8Array }> {
    if (!this.db) return {};
    
    const document = await this.db.get(STORE_DOCUMENTS, docId);
    const workspace = await this.db.get(STORE_WORKSPACES, docId);
    const original = await this.db.get(STORE_ORIGINALS, docId);

    return {
      document,
      workspace,
      bytes: original?.bytes
    };
  }

  public async clearState(docId: string) {
    if (!this.db) return;
    const tx = this.db.transaction([STORE_DOCUMENTS, STORE_WORKSPACES, STORE_ORIGINALS], 'readwrite');
    await tx.objectStore(STORE_DOCUMENTS).delete(docId);
    await tx.objectStore(STORE_WORKSPACES).delete(docId);
    await tx.objectStore(STORE_ORIGINALS).delete(docId);
    await tx.done;
  }
}

export const AutosaveEngine = new AutosaveEngineClass();
