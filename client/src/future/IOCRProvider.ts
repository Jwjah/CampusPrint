export interface RecognizedText {
  text: string;
  confidence: number;
  boundingBox: { left: number; top: number; width: number; height: number };
}

export interface IOCRProvider {
  /**
   * Scans an image and returns recognized text with bounding boxes.
   */
  recognizeText(imageBytes: Uint8Array): Promise<RecognizedText[]>;

  /**
   * Translates a raster PDF page into a searchable PDF layer.
   */
  createSearchableLayer(pageId: string, imageBytes: Uint8Array): Promise<void>;
}
