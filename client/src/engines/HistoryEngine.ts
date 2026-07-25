import { ICommand, CompositeCommand } from '../commands/Command';
import { DocumentEngine } from './DocumentEngine';
import { EventBus, CoreEvent } from './EventBus';
import { IEngine } from './IEngine';

const MAX_HISTORY_LENGTH = 100;

class HistoryEngineClass implements IEngine {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  private activeTransaction: CompositeCommand | null = null;
  private unsubUndo: (() => void) | null = null;
  private unsubRedo: (() => void) | null = null;

  public initialize() {
    this.unsubUndo = EventBus.on(CoreEvent.ACTION_UNDO, () => this.undo());
    this.unsubRedo = EventBus.on(CoreEvent.ACTION_REDO, () => this.redo());
  }

  public dispose() {
    if (this.unsubUndo) this.unsubUndo();
    if (this.unsubRedo) this.unsubRedo();
  }

  public reset() {
    this.undoStack = [];
    this.redoStack = [];
    this.activeTransaction = null;
  }

  public beginTransaction(name: string = 'Transaction') {
    if (this.activeTransaction) {
      console.warn('Transaction already active!');
      return;
    }
    this.activeTransaction = new CompositeCommand(name);
  }

  public commitTransaction() {
    if (!this.activeTransaction) return;
    if (this.activeTransaction.getCommandCount() > 0) {
      this.pushCommand(this.activeTransaction);
    }
    this.activeTransaction = null;
  }

  public cancelTransaction() {
    this.activeTransaction = null;
  }

  /**
   * Executes a command and adds it to the undo stack or active transaction.
   */
  public executeCommand(command: ICommand) {
    const doc = DocumentEngine.getDocument();
    if (!doc) return;

    DocumentEngine.mutate((document) => {
      command.execute(document);
    });

    if (this.activeTransaction) {
      this.activeTransaction.addCommand(command);
    } else {
      this.pushCommand(command);
    }
  }

  private pushCommand(command: ICommand) {
    this.undoStack.push(command);
    if (this.undoStack.length > MAX_HISTORY_LENGTH) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  public undo() {
    if (this.undoStack.length === 0) return;
    
    const doc = DocumentEngine.getDocument();
    if (!doc) return;

    const command = this.undoStack.pop()!;
    DocumentEngine.mutate((document) => {
      command.undo(document);
    });
    
    this.redoStack.push(command);
  }

  public redo() {
    if (this.redoStack.length === 0) return;
    
    const doc = DocumentEngine.getDocument();
    if (!doc) return;

    const command = this.redoStack.pop()!;
    DocumentEngine.mutate((document) => {
      command.redo(document);
    });
    
    this.undoStack.push(command);
  }


}

export const HistoryEngine = new HistoryEngineClass();
