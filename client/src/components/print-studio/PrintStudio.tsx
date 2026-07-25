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
import { PDFDocument } from 'pdf-lib';

export default function PrintStudio() {
  const initialized = useEngines();
  const document = useDocument();
  
  // Resizable sidebar states
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(250);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(300);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const bytes = new Uint8Array(ev.target?.result as ArrayBuffer);
          
          // Parse PDF to get metadata
          const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
          const pages = pdfDoc.getPages();
          
          const docId = generateId();
          
          // Create abstract Document Model
          const newDoc = {
            id: docId,
            metadata: {
              filename: file.name,
              pageCount: pages.length,
              orientation: 'portrait' as any,
              creator: 'CampusPrint',
              createdDate: new Date().toISOString(),
              modifiedDate: new Date().toISOString(),
              printSettings: {
                paperSize: 'A4',
                duplex: 'none',
                colorMode: 'color',
                copies: 1
              } as any,
              dpi: 72,
              warnings: []
            },
            pages: pages.map((p, index) => ({
              id: generateId(),
              pageNumber: index + 1,
              width: p.getSize().width,
              height: p.getSize().height,
              layers: [
                {
                  id: generateId(),
                  name: 'Base Layer',
                  visible: true,
                  locked: false,
                  opacity: 1,
                  zIndex: 0,
                  objects: []
                }
              ]
            }))
          };

          // Save bytes and model
          await AutosaveEngine.saveOriginalPDF(docId, bytes);
          DocumentEngine.setDocument(newDoc);
          AutosaveEngine.setCurrentDocument(docId);
          if (newDoc.pages.length > 0) {
            WorkspaceEngine.setActivePage(newDoc.pages[0].id);
          }

        } catch (err) {
          console.error("Failed to parse PDF", err);
          alert("Failed to load PDF.");
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  if (!initialized) {
    return <div className="flex h-full w-full items-center justify-center bg-bg-root">Initializing Editor...</div>;
  }

  if (!document) {
    return (
      <div className="flex h-full w-full items-center justify-center flex-col gap-6 bg-bg-root">
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
      <Toolbar />
      
      <div className="flex flex-1 overflow-hidden relative">
        <SidebarLeft width={leftSidebarWidth} />
        
        {/* Resizer Left */}
        <div 
          className="w-1 cursor-col-resize bg-border-light hover:bg-primary transition-colors z-10"
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

        <div className="flex-1 relative bg-bg-secondary overflow-hidden">
          <PDFWorkspace />
        </div>

        {/* Resizer Right */}
        <div 
          className="w-1 cursor-col-resize bg-border-light hover:bg-primary transition-colors z-10"
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

        <div className="flex flex-col h-full shrink-0" style={{ width: rightSidebarWidth }}>
          <PropertiesPanel width={rightSidebarWidth} />
          <PreflightPanel />
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
