import React, { useRef, useState, useEffect } from 'react';
import { Page } from 'react-pdf';
import { useWorkspace } from '@/hooks/useWorkspace';
import { WorkspaceEngine } from '@/engines/WorkspaceEngine';
import { ViewportEngine } from '@/engines/ViewportEngine';
import { useDocument } from '@/hooks/useDocument';
import FabricOverlay from './FabricOverlay';

interface PageContainerProps {
  pageId: string;
  pageNumber: number;
}

export default function PageContainer({ pageId, pageNumber }: PageContainerProps) {
  const workspace = useWorkspace();
  const doc = useDocument();
  const [pageDimensions, setPageDimensions] = useState<{ width: number, height: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { zoom, activePageId } = workspace;

  useEffect(() => {
    if (containerRef.current) {
      // Register with ViewportEngine for lazy loading
      ViewportEngine.observe(containerRef.current);
    }
    return () => {
      if (containerRef.current) ViewportEngine.unobserve(containerRef.current);
    };
  }, []);

  // Set active page when clicked
  const handlePageClick = () => {
    if (activePageId !== pageId) {
      WorkspaceEngine.setActivePage(pageId);
    }
  };

  return (
    <div 
      ref={containerRef}
      data-page-id={pageId}
      className={`relative shadow-lg transition-shadow bg-white ${
        activePageId === pageId ? 'ring-2 ring-primary shadow-xl' : ''
      }`}
      style={{
        width: pageDimensions ? pageDimensions.width * zoom : 'auto',
        height: pageDimensions ? pageDimensions.height * zoom : 'auto',
      }}
      onClick={handlePageClick}
    >
      <Page
        pageNumber={pageNumber}
        scale={zoom}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        onLoadSuccess={(page) => {
          setPageDimensions({ width: page.originalWidth, height: page.originalHeight });
        }}
        loading={<div className="bg-bg-tertiary animate-pulse w-full h-full min-h-[800px] min-w-[600px]" />}
      />

      {pageDimensions && (
        <div className="absolute inset-0 pointer-events-auto"
             style={{ 
               filter: (workspace.isPreviewMode && doc?.metadata.printSettings?.colorMode === 'bw') ? 'grayscale(100%)' : 'none',
             }}>
          <FabricOverlay 
            pageId={pageId}
            width={pageDimensions.width * zoom} 
            height={pageDimensions.height * zoom} 
            zoom={zoom}
          />
        </div>
      )}

      {/* Print Preview Overlays */}
      {workspace.isPreviewMode && pageDimensions && (
        <div className="absolute inset-0 pointer-events-none z-50">
          {/* Printable Area Margin (Example: 0.25 inches ~ 18 points) */}
          <div className="absolute border border-dashed border-red-500 opacity-50"
               style={{ 
                 top: 18 * zoom, bottom: 18 * zoom, left: 18 * zoom, right: 18 * zoom 
               }} 
          />
          
          {/* Binding Margin Simulation */}
          {doc?.metadata?.printSettings?.duplex !== 'none' && (
            <div className="absolute bg-blue-500 opacity-20"
                 style={{
                   top: 0, bottom: 0,
                   // Assuming short-edge or long-edge binding dictates left vs right margin based on even/odd page
                   ...(doc?.metadata?.printSettings?.duplex === 'long-edge' && pageNumber % 2 === 0 
                       ? { right: 0, width: 36 * zoom } 
                       : { left: 0, width: 36 * zoom })
                 }}
            />
          )}
        </div>
      )}
    </div>
  );
}
