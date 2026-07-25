import { DocumentModel } from '../models/DocumentModel';

export interface IAIProvider {
  /**
   * Enhances a specific page or image object to improve print quality
   * by removing noise, artifacts, and increasing contrast.
   */
  enhanceScan(targetId: string, imageBytes: Uint8Array): Promise<Uint8Array>;

  /**
   * Automatically detects and corrects document rotation/skewing.
   */
  deskew(targetId: string, imageBytes: Uint8Array): Promise<Uint8Array>;

  /**
   * Analyzes document to suggest margin corrections.
   */
  suggestMarginCorrections(doc: DocumentModel): Promise<Array<{ pageId: string, suggestedMargin: number }>>;
}
