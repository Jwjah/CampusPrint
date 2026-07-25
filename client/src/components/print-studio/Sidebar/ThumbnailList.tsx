import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useDocument } from '@/hooks/useDocument';
import { WorkspaceEngine } from '@/engines/WorkspaceEngine';
import { AutosaveEngine } from '@/engines/AutosaveEngine';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Using local worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function ThumbnailList() {
  const workspace = useWorkspace();
  const document = useDocument();
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (document) {
      AutosaveEngine.loadState(document.id).then(state => {
        if (state.bytes) {
          const blob = new Blob([state.bytes as any], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setFileUrl(url);
        }
      });
      return () => {
        if (fileUrl) URL.revokeObjectURL(fileUrl);
      };
    }
  }, [document?.id]);

  if (!fileUrl || !document) return null;

  return (
    <div className="h-full overflow-y-auto p-4 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
      <Document
        file={fileUrl}
        loading={<div className="text-center text-sm text-text-tertiary">Loading pages...</div>}
        error={<div className="text-error text-sm text-center">Failed to load thumbnails</div>}
      >
        {document.pages.map((p) => {
          const isActive = workspace.activePageId === p.id;
          return (
            <div
              key={`thumb_${p.id}`}
              className={`flex flex-col items-center gap-2 cursor-pointer group`}
              onClick={() => WorkspaceEngine.setActivePage(p.id)}
            >
              <div className={`
                border-2 rounded-sm overflow-hidden transition-all shadow-sm
                ${isActive ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-border-light group-hover:shadow-md'}
              `}>
                <Page
                  pageNumber={p.pageNumber}
                  width={120} // Thumbnail width
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={<div className="w-[120px] h-[160px] bg-bg-tertiary animate-pulse" />}
                />
              </div>
              <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-text-secondary'}`}>
                {p.pageNumber}
              </span>
            </div>
          );
        })}
      </Document>
    </div>
  );
}
