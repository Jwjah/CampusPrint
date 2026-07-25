import { DocumentModel } from '../models/DocumentModel';
import { generateId } from '../utils/uuid';

export interface ICommand {
  id: string;
  name: string;
  execute(document: DocumentModel): void;
  undo(document: DocumentModel): void;
  redo(document: DocumentModel): void;
}

export abstract class BaseCommand implements ICommand {
  public id: string = generateId();
  public name: string = 'BaseCommand';

  abstract execute(document: DocumentModel): void;
  abstract undo(document: DocumentModel): void;
  
  public redo(document: DocumentModel): void {
    // By default, redo is the same as execute
    this.execute(document);
  }
}

export class CompositeCommand implements ICommand {
  public id: string = generateId();
  private commands: ICommand[] = [];

  constructor(public name: string = 'CompositeCommand') {}

  public addCommand(command: ICommand) {
    this.commands.push(command);
  }

  public getCommandCount(): number {
    return this.commands.length;
  }

  execute(document: DocumentModel): void {
    for (const cmd of this.commands) {
      cmd.execute(document);
    }
  }

  undo(document: DocumentModel): void {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo(document);
    }
  }

  redo(document: DocumentModel): void {
    for (const cmd of this.commands) {
      cmd.redo(document);
    }
  }
}
