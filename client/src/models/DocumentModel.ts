export interface PrintSettings {
  paperSize: 'A4' | 'Letter' | 'Legal' | 'A3';
  duplex: 'none' | 'short-edge' | 'long-edge';
  colorMode: 'color' | 'bw';
  copies: number;
  compression?: 'None' | 'Low' | 'Medium' | 'High';
}

export interface PreflightWarning {
  id: string;
  type: 'low-dpi' | 'margin' | 'bleed' | 'font' | 'unsupported';
  severity: 'error' | 'warning' | 'info';
  message: string;
  pageId?: string;
  objectId?: string;
}

export interface DocumentMetadata {
  filename: string;
  pageCount: number;
  orientation: 'portrait' | 'landscape' | 'mixed';
  creator: string;
  createdDate: string;
  modifiedDate: string;
  printSettings: PrintSettings;
  dpi: number;
  warnings: PreflightWarning[];
}

export interface ObjectModel {
  id: string; // Stable UUID
  type: 'rect' | 'circle' | 'line' | 'text' | 'image' | 'path' | string;
  left: number;
  top: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  
  // Text specific properties
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  textAlign?: string;
  
  // Path specific
  path?: any[];

  // Metadata
  version: number;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

export interface LayerModel {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  zIndex: number;
  objects: ObjectModel[];
}

export interface PageModel {
  id: string;
  pageNumber: number; // 1-indexed
  width: number;
  height: number;
  layers: LayerModel[];
}

export interface DocumentModel {
  id: string;
  metadata: DocumentMetadata;
  pages: PageModel[];
}
