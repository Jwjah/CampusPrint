import { PDFDocument } from 'pdf-lib';
import { generateId } from './uuid';
import { DocumentModel } from '../models/DocumentModel';
import { WorkspaceModel } from '../models/WorkspaceModel';
import { AutosaveEngine } from '../engines/AutosaveEngine';
import { DocumentEngine } from '../engines/DocumentEngine';
import { WorkspaceEngine } from '../engines/WorkspaceEngine';

export async function createDocumentFromFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // Parse PDF to get metadata
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  
  const docId = generateId();
  
  // Create abstract Document Model
  const newDoc: DocumentModel = {
    id: docId,
    metadata: {
      filename: file.name,
      pageCount: pages.length,
      orientation: 'portrait',
      creator: 'CampusPrint',
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString(),
      printSettings: {
        paperSize: 'A4',
        duplex: 'none',
        colorMode: 'color',
        copies: 1,
        compression: 'Medium'
      },
      dpi: 72,
      warnings: []
    },
    pages: pages.map((p, index) => ({
      id: generateId(),
      pageNumber: index + 1,
      width: p.getSize().width,
      height: p.getSize().height,
      layers: [
        {
          id: generateId(),
          name: 'Base Layer',
          visible: true,
          locked: false,
          opacity: 1,
          zIndex: 0,
          objects: []
        }
      ]
    }))
  };

  const initialWorkspace: WorkspaceModel = {
    activePageId: newDoc.pages.length > 0 ? newDoc.pages[0].id : '',
    zoom: 1,
    activeToolId: 'select',
    sidebarOpen: true,
    propertiesOpen: true,
    isPreviewMode: false
  };

  // Save to IDB via AutosaveEngine
  // Initialize if not already initialized
  await AutosaveEngine.initialize();
  
  await AutosaveEngine.saveOriginalPDF(docId, bytes);
  await AutosaveEngine.persistState(newDoc, initialWorkspace);

  // Return the generated ID so the caller can navigate to it
  return docId;
}
