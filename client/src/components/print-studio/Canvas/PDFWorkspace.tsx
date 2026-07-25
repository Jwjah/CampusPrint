import React, { useState, useEffect, useRef } from 'react';
import { Document, pdfjs } from 'react-pdf';
import PageContainer from './PageContainer';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useDocument } from '@/hooks/useDocument';
import { AutosaveEngine } from '@/engines/AutosaveEngine';

interface PDFWorkspaceProps {
  isMobile?: boolean;
}

export default function PDFWorkspace({ isMobile = false }: PDFWorkspaceProps) {
  const workspace = useWorkspace();
  const document = useDocument();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    setLoadingError(null);

    if (document) {
      AutosaveEngine.loadState(document.id).then(state => {
        if (state.bytes) {
          const blob = new Blob([state.bytes as any], { type: 'application/pdf' });
          objectUrl = URL.createObjectURL(blob);
          setFileUrl(objectUrl);
        } else {
          setLoadingError('PDF file data not found in local storage.');
        }
      }).catch(err => {
        setLoadingError('Failed to load PDF state: ' + err.message);
      });
      return () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    }
  }, [document?.id]);

  if (loadingError) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-bg-secondary p-8">
        <div className="text-error bg-error/10 p-4 rounded-lg border border-error">
          <h3 className="font-bold mb-2">Error rendering PDF</h3>
          <p>{loadingError}</p>
        </div>
      </div>
    );
  }

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
          <div className="flex flex-col h-64 w-full items-center justify-center gap-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <div className="text-primary font-medium animate-pulse">Loading Document...</div>
          </div>
        }
        onLoadError={(error) => {
          console.error('react-pdf onLoadError:', error);
          setLoadingError(error.message);
        }}
      >
        <PageList pages={document.pages} isMobile={isMobile} />
      </Document>
    </div>
  );
}

// Separate component to map pages efficiently
function PageList({ pages, isMobile }: { pages: any[], isMobile: boolean }) {
  return (
    <>
      {pages.map((p) => (
        <PageContainer 
          key={p.id} 
          pageId={p.id}
          pageNumber={p.pageNumber} 
          isMobile={isMobile}
        />
      ))}
    </>
  );
}
