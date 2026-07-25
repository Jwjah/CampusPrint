import { DocumentModel } from '../models/DocumentModel';

export interface CursorPosition {
  userId: string;
  userName: string;
  pageId: string;
  x: number;
  y: number;
}

export interface ICollaborationProvider {
  /**
   * Connects to a collaborative session.
   */
  connect(documentId: string, user: { id: string, name: string }): Promise<void>;

  /**
   * Disconnects from the collaborative session.
   */
  disconnect(): void;

  /**
   * Broadcasts a local mutation to peers.
   */
  broadcastMutation(mutation: any): void;

  /**
   * Emits a cursor location update to peers.
   */
  broadcastCursor(position: CursorPosition): void;
}
