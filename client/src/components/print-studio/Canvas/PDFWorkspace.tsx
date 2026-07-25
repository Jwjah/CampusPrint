import React, { useState, useEffect, useRef } from 'react';
import { Document, pdfjs } from 'react-pdf';
import PageContainer from './PageContainer';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useDocument } from '@/hooks/useDocument';
import { AutosaveEngine } from '@/engines/AutosaveEngine';

export default function PDFWorkspace() {
  const workspace = useWorkspace();
  const document = useDocument();
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (document) {
      // Get the original PDF bytes for react-pdf from AutosaveEngine
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
    <div 
      className={`h-full w-full overflow-auto bg-bg-secondary p-8 flex flex-col items-center gap-12 ${
        workspace.activeToolId === 'hand' ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <Document
        file={fileUrl}
        loading={
          <div className="flex h-64 w-full items-center justify-center">
            <div className="text-primary font-medium animate-pulse">Loading Document...</div>
          </div>
        }
      >
        <PageList pages={document.pages} />
      </Document>
    </div>
  );
}

// Separate component to map pages efficiently
function PageList({ pages }: { pages: any[] }) {
  return (
    <>
      {pages.map((p) => (
        <PageContainer 
          key={p.id} 
          pageId={p.id}
          pageNumber={p.pageNumber} 
        />
      ))}
    </>
  );
}
