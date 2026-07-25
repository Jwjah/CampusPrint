import { DocumentModel } from '../models/DocumentModel';
import { EventBus, CoreEvent } from './EventBus';
import { PDFDocument, rgb } from 'pdf-lib';
import { IEngine } from './IEngine';

class ExportEngineClass implements IEngine {
  private unsubExport: (() => void) | null = null;
  public initialize() {
    this.unsubExport = EventBus.on(CoreEvent.ACTION_EXPORT, async (payload: { doc: DocumentModel, originalBytes: Uint8Array }) => {
      try {
        const exportedBytes = await this.exportPDF(payload.doc, payload.originalBytes);
        // Trigger download or save back to backend
        EventBus.emit('EXPORT_COMPLETE', exportedBytes);
      } catch (err) {
        EventBus.emit('EXPORT_FAILED', err);
      }
    });
  }

  public dispose() {
    if (this.unsubExport) this.unsubExport();
  }

  public reset() {}

  public async exportPDF(doc: DocumentModel, originalBytes: Uint8Array): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(originalBytes);
    const pages = pdfDoc.getPages();

    for (const pageModel of doc.pages) {
      const pageIndex = pageModel.pageNumber - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) continue;

      const pdfPage = pages[pageIndex];
      const { height: pdfHeight } = pdfPage.getSize();

      for (const layer of pageModel.layers) {
        if (!layer.visible) continue;

        for (const obj of layer.objects) {
          if (!obj.visible) continue;

          // Same drawing logic as MVP, but now strictly reads from DocumentModel ObjectModel
          const fill = this.parseColor(obj.fill);
          const stroke = this.parseColor(obj.stroke);
          const y = pdfHeight - obj.top - (obj.height * obj.scaleY); 

          if (obj.type === 'rect') {
            pdfPage.drawRectangle({
              x: obj.left,
              y,
              width: obj.width * obj.scaleX,
              height: obj.height * obj.scaleY,
              color: fill,
              borderColor: stroke,
              borderWidth: obj.strokeWidth,
            });
          }
          // handle text, circle, path etc...
        }
      }
    }

    // Compression configuration
    const exportConfig = doc.metadata.printSettings.compression || 'Medium';
    const useObjectStreams = exportConfig !== 'None';
    
    // Additional compressions can be implemented here (like image downsampling if we used a PDF library that supports it)
    // pdf-lib's useObjectStreams provides lossless structural compression
    
    return await pdfDoc.save({ useObjectStreams });
  }

  private parseColor(colorStr: string | null) {
    if (!colorStr || colorStr === 'transparent') return undefined;
    if (colorStr.startsWith('#')) {
      const r = parseInt(colorStr.slice(1, 3), 16) / 255;
      const g = parseInt(colorStr.slice(3, 5), 16) / 255;
      const b = parseInt(colorStr.slice(5, 7), 16) / 255;
      return rgb(r, g, b);
    }
    return undefined;
  }
}

export const ExportEngine = new ExportEngineClass();
