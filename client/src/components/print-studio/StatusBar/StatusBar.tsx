import React from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useDocument } from '@/hooks/useDocument';
import { useSelection } from '@/hooks/useSelection';

export default function StatusBar() {
  const workspace = useWorkspace();
  const document = useDocument();
  const selection = useSelection();

  // Find active page number
  const activePageNum = document?.pages.find(p => p.id === workspace.activePageId)?.pageNumber || 1;

  return (
    <div className="h-8 bg-bg-card border-t border-border-light flex items-center justify-between px-4 text-xs text-text-tertiary z-20 shrink-0">
      <div className="flex items-center gap-4">
        {document && (
          <>
            <span>{document.metadata.filename}</span>
            <span>|</span>
            <span>{document.metadata.pageCount} Pages</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {selection.length > 0 ? (
          <span className="text-info">{selection.length} Object(s) Selected</span>
        ) : (
          <span>Ready</span>
        )}
        <span>|</span>
        <span>Page {activePageNum} of {document?.metadata.pageCount || 1}</span>
        <span>|</span>
        <span>Zoom: {Math.round(workspace.zoom * 100)}%</span>
      </div>
    </div>
  );
}
