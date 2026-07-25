'use client';

import React, { useState, useEffect } from 'react';
import Toolbar from './Toolbar/Toolbar';
import SidebarLeft from './Sidebar/SidebarLeft';
import PDFWorkspace from './Canvas/PDFWorkspace';
import PropertiesPanel from './PropertiesPanel/PropertiesPanel';
import PreflightPanel from './PreflightPanel/PreflightPanel';
import StatusBar from './StatusBar/StatusBar';
import { motion, AnimatePresence } from 'framer-motion';

// Hooks & Engines
import { useEngines } from '@/hooks/useEngines';
import { useDocument } from '@/hooks/useDocument';
import { DocumentEngine } from '@/engines/DocumentEngine';
import { AutosaveEngine } from '@/engines/AutosaveEngine';
import { WorkspaceEngine } from '@/engines/WorkspaceEngine';
import { generateId } from '@/utils/uuid';
import { createDocumentFromFile } from '@/utils/documentHelper';
import { pdfjs } from 'react-pdf';

// Configure PDF.js worker centrally here for Print Studio
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;


export default function PrintStudio() {
  const initialized = useEngines();
  const document = useDocument();
  
  // Responsive / Layout States
  const [isMobile, setIsMobile] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(250);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(300);
  
  // Loading and Error State
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setLeftSidebarOpen(false);
        setRightSidebarOpen(false);
      } else {
        setLeftSidebarOpen(true);
        setRightSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const loadDocument = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        let targetDocId = params.get('docId');

        if (targetDocId) {
          // Clear it from URL
          window.history.replaceState({}, '', window.location.pathname);
          localStorage.setItem('campus_print_last_doc_id', targetDocId);
        } else {
          targetDocId = localStorage.getItem('campus_print_last_doc_id');
        }

        if (targetDocId) {
          const state = await AutosaveEngine.loadState(targetDocId);
          if (state.document && state.bytes) {
            DocumentEngine.setDocument(state.document);
            if (state.workspace) {
              WorkspaceEngine.setActivePage(state.workspace.activePageId);
            } else if (state.document.pages.length > 0) {
              WorkspaceEngine.setActivePage(state.document.pages[0].id);
            }
            AutosaveEngine.setCurrentDocument(targetDocId);
          } else {
            // Invalid or expired document
            localStorage.removeItem('campus_print_last_doc_id');
            setErrorMsg('The document could not be found or has expired. Please upload it again.');
          }
        }
      } catch (err: any) {
        console.error('Failed to load document:', err);
        setErrorMsg('Failed to load document: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [initialized]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      try {
        setIsLoading(true);
        setErrorMsg(null);
        
        const docId = await createDocumentFromFile(file);
        localStorage.setItem('campus_print_last_doc_id', docId);
        
        const state = await AutosaveEngine.loadState(docId);
        if (state.document) {
          DocumentEngine.setDocument(state.document);
          AutosaveEngine.setCurrentDocument(docId);
          if (state.document.pages.length > 0) {
            WorkspaceEngine.setActivePage(state.document.pages[0].id);
          }
        }
      } catch (err: any) {
        console.error("Failed to parse PDF", err);
        setErrorMsg("Failed to load PDF: " + (err.message || String(err)));
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!initialized || isLoading) {
    return <div className="flex h-full w-full items-center justify-center bg-bg-root">Initializing Editor...</div>;
  }

  if (errorMsg) {
    return (
      <div className="flex h-full w-full items-center justify-center flex-col gap-6 bg-bg-root p-6">
        <motion.div className="glass-card p-12 flex flex-col items-center gap-4 border border-dashed border-error">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-2xl font-bold text-error">Loading Failed</h2>
          <p className="text-text-secondary text-center max-w-md">{errorMsg}</p>
          <div className="flex gap-4 mt-4">
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>Retry</button>
            <label className="btn btn-primary cursor-pointer">
              Upload Different PDF
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex h-full w-full items-center justify-center flex-col gap-6 bg-bg-root p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card p-12 flex flex-col items-center gap-4 border border-dashed border-primary"
        >
          <div className="text-4xl">📄</div>
          <h2 className="text-2xl font-bold">Print Studio (Phase 2)</h2>
          <p className="text-text-secondary">Upload a PDF to start editing.</p>
          <label className="btn btn-primary mt-4 cursor-pointer">
            Select PDF
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
          </label>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-bg-root">
      {/* Top Toolbar (Desktop) or hidden/scrollable on Mobile */}
      <div className="z-20 w-full overflow-x-auto overflow-y-hidden shrink-0">
        <Toolbar />
      </div>
      
      <div className="flex flex-1 overflow-hidden relative w-full">
        {/* Mobile drawer backdrop for left sidebar */}
        <AnimatePresence>
          {isMobile && leftSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 z-30"
              onClick={() => setLeftSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Left Sidebar */}
        <motion.div 
          className={`${isMobile ? 'absolute inset-y-0 left-0 z-40 bg-bg-card shadow-2xl h-full' : 'relative h-full'}`}
          initial={isMobile ? { x: -300 } : { x: 0 }}
          animate={{ x: isMobile ? (leftSidebarOpen ? 0 : -300) : 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{ width: isMobile ? 280 : leftSidebarWidth }}
        >
          <SidebarLeft width={isMobile ? 280 : leftSidebarWidth} />
          {isMobile && (
            <button className="absolute top-4 right-4 p-2 bg-bg-tertiary rounded-full" onClick={() => setLeftSidebarOpen(false)}>✕</button>
          )}
        </motion.div>
        
        {/* Resizer Left (Desktop only) */}
        {!isMobile && (
          <div 
            className="w-1 cursor-col-resize bg-border-light hover:bg-primary transition-colors z-10 shrink-0"
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startWidth = leftSidebarWidth;
              const onMouseMove = (e: MouseEvent) => {
                setLeftSidebarWidth(Math.max(150, Math.min(400, startWidth + (e.clientX - startX))));
              };
              const onMouseUp = () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
              };
              window.addEventListener('mousemove', onMouseMove);
              window.addEventListener('mouseup', onMouseUp);
            }}
          />
        )}

        <div className="flex-1 relative bg-bg-secondary overflow-hidden w-full h-full">
          {/* Mobile toggle buttons for sidebars (visible only when closed and on mobile) */}
          {isMobile && (
            <div className="absolute top-4 left-4 z-10 pointer-events-auto">
              <button className="btn btn-ghost bg-bg-card shadow-lg btn-icon" onClick={() => setLeftSidebarOpen(true)}>
                📄
              </button>
            </div>
          )}
          {isMobile && (
            <div className="absolute top-4 right-4 z-10 pointer-events-auto">
              <button className="btn btn-ghost bg-bg-card shadow-lg btn-icon" onClick={() => setRightSidebarOpen(true)}>
                ⚙️
              </button>
            </div>
          )}
          
          <PDFWorkspace isMobile={isMobile} />
        </div>

        {/* Mobile drawer backdrop for right sidebar */}
        <AnimatePresence>
          {isMobile && rightSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 z-30"
              onClick={() => setRightSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Resizer Right (Desktop only) */}
        {!isMobile && (
          <div 
            className="w-1 cursor-col-resize bg-border-light hover:bg-primary transition-colors z-10 shrink-0"
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startWidth = rightSidebarWidth;
              const onMouseMove = (e: MouseEvent) => {
                setRightSidebarWidth(Math.max(200, Math.min(500, startWidth - (e.clientX - startX))));
              };
              const onMouseUp = () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
              };
              window.addEventListener('mousemove', onMouseMove);
              window.addEventListener('mouseup', onMouseUp);
            }}
          />
        )}

        {/* Right Sidebar (Properties + Preflight) */}
        <motion.div 
          className={`flex flex-col h-full shrink-0 ${isMobile ? 'absolute inset-y-0 right-0 z-40 bg-bg-card shadow-2xl' : ''}`}
          initial={isMobile ? { x: 350 } : { x: 0 }}
          animate={{ x: isMobile ? (rightSidebarOpen ? 0 : 350) : 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{ width: isMobile ? 320 : rightSidebarWidth }}
        >
          {isMobile && (
            <div className="flex justify-between items-center p-4 border-b border-border-light">
              <h3 className="font-bold">Settings & Preflight</h3>
              <button className="p-2 bg-bg-tertiary rounded-full" onClick={() => setRightSidebarOpen(false)}>✕</button>
            </div>
          )}
          <PropertiesPanel width={isMobile ? 320 : rightSidebarWidth} />
          <PreflightPanel />
        </motion.div>
      </div>

      <StatusBar />
    </div>
  );
}
