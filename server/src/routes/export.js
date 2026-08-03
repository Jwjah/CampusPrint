const express = require('express');
const router = express.Router();
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const upload = multer({ limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB max

router.post('/pdf', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { annotations } = req.body;
    let parsedAnnos = {};
    try {
      parsedAnnos = JSON.parse(annotations || '{}');
    } catch (e) {
      return res.status(400).json({ error: 'Invalid annotations payload' });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    // Validate annotation values to prevent resource exhaustion
    for (const [, pageAnnos] of Object.entries(parsedAnnos)) {
      if (pageAnnos?.objects && Array.isArray(pageAnnos.objects)) {
        for (const obj of pageAnnos.objects) {
          if (obj.text && String(obj.text).length > 5000) {
            return res.status(400).json({ error: 'Annotation text too long' });
          }
          if (obj.fontSize && (obj.fontSize < 1 || obj.fontSize > 500)) {
            return res.status(400).json({ error: 'Invalid font size' });
          }
        }
      }
    }

    const pdfBytes = req.file.buffer;
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    for (let i = 0; i < pages.length; i++) {
      const pageAnnos = parsedAnnos[i + 1];
      if (!pageAnnos?.objects) continue;
      const page = pages[i];
      const { width, height } = page.getSize();

      // Note: Scale info would be needed here for perfect matching if client resolution differs
      // For now we assume a standard coordinate system passed from client
      for (const obj of pageAnnos.objects) {
        if (obj.type === 'textbox' || obj.type === 'text') {
          page.drawText(String(obj.text || ''), {
            x: Math.min(Math.max(obj.left || 0, 0), width),
            y: Math.min(Math.max(height - (obj.top || 0) - (obj.fontSize || 12), 0), height),
            size: Math.min(Math.max(obj.fontSize || 12, 1), 200),
            font,
            color: rgb(0, 0, 0)
          });
        } else if (obj.type === 'rect') {
          page.drawRectangle({
            x: Math.min(Math.max(obj.left || 0, 0), width),
            y: Math.min(Math.max(height - (obj.top || 0) - (obj.height || 0), 0), height),
            width: Math.min(Math.max(obj.width || 0, 0), width),
            height: Math.min(Math.max(obj.height || 0, 0), height),
            color: rgb(1, 1, 1)
          });
        }
      }
    }

    const modifiedBytes = await pdfDoc.save();
    res.contentType('application/pdf');
    res.send(Buffer.from(modifiedBytes));
  } catch (err) {
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

module.exports = router;
