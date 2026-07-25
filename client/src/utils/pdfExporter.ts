import { PDFDocument, rgb } from 'pdf-lib';

/**
 * Takes the original PDF bytes and the serialized Fabric.js pageData state.
 * Draws the vector objects natively onto the PDF using pdf-lib.
 */
export async function exportPDFWithEdits(
  originalBytes: Uint8Array,
  pageData: Record<number, any>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalBytes);
  const pages = pdfDoc.getPages();

  for (const [pageIndexStr, fabricJson] of Object.entries(pageData)) {
    const pageIndex = parseInt(pageIndexStr) - 1; // 1-indexed to 0-indexed
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const pdfPage = pages[pageIndex];
    const { height: pdfHeight } = pdfPage.getSize();
    
    // Parse Fabric objects
    const objects = fabricJson.objects || [];
    
    for (const obj of objects) {
      // Convert colors from hex/rgb strings to pdf-lib rgb format
      const fill = parseColor(obj.fill);
      const stroke = parseColor(obj.stroke);
      
      // Fabric uses top-left origin. pdf-lib uses bottom-left origin.
      // We must translate the Y coordinate.
      const x = obj.left || 0;
      const top = obj.top || 0;
      const h = (obj.height || 0) * (obj.scaleY || 1);
      const w = (obj.width || 0) * (obj.scaleX || 1);
      
      const y = pdfHeight - top - h; // Translated to bottom-left

      if (obj.type === 'rect') {
        pdfPage.drawRectangle({
          x,
          y,
          width: w,
          height: h,
          color: fill,
          borderColor: stroke,
          borderWidth: obj.strokeWidth || 0,
        });
      } else if (obj.type === 'circle') {
        pdfPage.drawEllipse({
          x: x + w / 2, // pdf-lib center
          y: y + h / 2,
          xScale: w / 2,
          yScale: h / 2,
          color: fill,
          borderColor: stroke,
          borderWidth: obj.strokeWidth || 0,
        });
      } else if (obj.type === 'i-text' || obj.type === 'text') {
        // Fallback for text drawing (requires embedding fonts in a robust implementation)
        // For MVP, we draw text using standard font
        pdfPage.drawText(obj.text || '', {
          x,
          y: pdfHeight - top - (obj.fontSize || 16), // adjust for baseline
          size: obj.fontSize || 16,
          color: fill || rgb(0,0,0),
        });
      }
      // Note: In a complete implementation, we'd handle lines, paths, and images here
    }
  }

  return await pdfDoc.save();
}

function parseColor(colorStr: string | null) {
  if (!colorStr || colorStr === 'transparent') return undefined;
  // Extremely basic hex parser for MVP
  if (colorStr.startsWith('#')) {
    const r = parseInt(colorStr.slice(1, 3), 16) / 255;
    const g = parseInt(colorStr.slice(3, 5), 16) / 255;
    const b = parseInt(colorStr.slice(5, 7), 16) / 255;
    return rgb(r, g, b);
  }
  return rgb(0, 0, 0); // fallback
}
