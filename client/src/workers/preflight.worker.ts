import { DocumentModel, PreflightWarning } from '../models/DocumentModel';

self.addEventListener('message', (event: MessageEvent<DocumentModel>) => {
  const doc = event.data;
  const warnings: PreflightWarning[] = [];

  // 1. DPI Analysis
  if (doc.metadata.dpi < 300) {
    warnings.push({
      id: `warn-dpi-${Date.now()}`,
      type: 'low-dpi',
      severity: 'warning',
      message: `Document DPI (${doc.metadata.dpi}) is below the recommended 300 DPI for high-quality print.`
    });
  }

  // 2. Margin & Bleed Analysis
  const MARGIN_TOLERANCE = 10; // Pixels
  
  for (const page of doc.pages) {
    for (const layer of page.layers) {
      for (const obj of layer.objects) {
        if (
          obj.left < MARGIN_TOLERANCE || 
          obj.top < MARGIN_TOLERANCE || 
          (obj.left + (obj.width * obj.scaleX)) > (page.width - MARGIN_TOLERANCE) ||
          (obj.top + (obj.height * obj.scaleY)) > (page.height - MARGIN_TOLERANCE)
        ) {
          warnings.push({
            id: `warn-margin-${obj.id}`,
            type: 'margin',
            severity: 'error',
            message: `Object is outside the safe printable margin on Page ${page.pageNumber}.`,
            pageId: page.id,
            objectId: obj.id
          });
        }

        // 3. Font Analysis
        if (obj.type === 'i-text' && (obj as any).fontFamily && !['Helvetica', 'Courier', 'Times-Roman'].includes((obj as any).fontFamily)) {
          warnings.push({
            id: `warn-font-${obj.id}`,
            type: 'font',
            severity: 'warning',
            message: `Non-standard font '${(obj as any).fontFamily}' used on Page ${page.pageNumber}. Make sure it is embedded.`,
            pageId: page.id,
            objectId: obj.id
          });
        }
      }
    }
  }

  // Send warnings back
  self.postMessage(warnings);
});
