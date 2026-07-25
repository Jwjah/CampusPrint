import React from 'react';
import { useSelection } from '@/hooks/useSelection';
import { useDocument } from '@/hooks/useDocument';
import { EventBus } from '@/engines/EventBus';

interface PropertiesPanelProps {
  width: number;
}

export default function PropertiesPanel({ width }: PropertiesPanelProps) {
  const selection = useSelection();
  const document = useDocument();

  // For MVP Properties panel, just get the first selected object from DocumentModel
  let selectedObject = null;
  if (selection.length === 1 && document) {
    const selectedId = selection[0];
    for (const page of document.pages) {
      for (const layer of page.layers) {
        const obj = layer.objects.find(o => o.id === selectedId);
        if (obj) {
          selectedObject = obj;
          break;
        }
      }
      if (selectedObject) break;
    }
  }

  const handleUpdate = (key: string, value: any) => {
    // We will hook this up in Milestone 2 to a ChangePropertyCommand
    console.log(`Update ${key} to ${value} on`, selectedObject);
  };

  return (
    <div className="h-1/2 bg-bg-card flex flex-col border-l border-border-light relative z-10 shrink-0 overflow-y-auto">
      <div className="h-12 border-b border-border-light flex items-center justify-between px-4 shrink-0">
        <h3 className="font-semibold text-text-primary">Properties</h3>
      </div>
      
      <div className="p-4 flex flex-col gap-6">
        {!selectedObject ? (
          <div className="text-sm text-text-secondary">
            <h4 className="font-medium text-white mb-2">Document Info</h4>
            {document ? (
              <ul className="space-y-1">
                <li><span className="text-text-tertiary">Name:</span> {document.metadata.filename}</li>
                <li><span className="text-text-tertiary">Pages:</span> {document.metadata.pageCount}</li>
                <li><span className="text-text-tertiary">DPI:</span> {document.metadata.dpi}</li>
              </ul>
            ) : (
              <p>No document loaded.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 text-sm">
            <h4 className="font-medium text-white capitalize">{selectedObject.type} Properties</h4>
            
            {/* Common Transform Properties */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-text-tertiary block mb-1">X Pos</label>
                <input type="number" className="input bg-bg-tertiary w-full" value={Math.round(selectedObject.left || 0)} readOnly />
              </div>
              <div>
                <label className="text-xs text-text-tertiary block mb-1">Y Pos</label>
                <input type="number" className="input bg-bg-tertiary w-full" value={Math.round(selectedObject.top || 0)} readOnly />
              </div>
            </div>

            {/* Shape Properties */}
            {['rect', 'circle', 'triangle', 'line', 'path'].includes(selectedObject.type) && (
              <>
                <div>
                  <label className="text-xs text-text-tertiary block mb-1">Fill Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-8 h-8 rounded cursor-pointer" value={selectedObject.fill || '#000000'} onChange={(e) => handleUpdate('fill', e.target.value)} />
                    <span className="text-text-secondary">{selectedObject.fill}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-text-tertiary block mb-1">Stroke Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-8 h-8 rounded cursor-pointer" value={selectedObject.stroke || '#000000'} onChange={(e) => handleUpdate('stroke', e.target.value)} />
                    <span className="text-text-secondary">{selectedObject.stroke}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-text-tertiary block mb-1">Stroke Width ({Math.round(selectedObject.strokeWidth || 0)}px)</label>
                  <input type="range" min="0" max="20" className="w-full" value={selectedObject.strokeWidth || 0} onChange={(e) => handleUpdate('strokeWidth', parseInt(e.target.value))} />
                </div>
              </>
            )}

            {/* Text Properties */}
            {selectedObject.type === 'i-text' && (
              <>
                <div>
                  <label className="text-xs text-text-tertiary block mb-1">Font Family</label>
                  <select className="input bg-bg-tertiary w-full" value={(selectedObject as any).fontFamily || 'Helvetica'} onChange={(e) => handleUpdate('fontFamily', e.target.value)}>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times-Roman">Times New Roman</option>
                    <option value="Courier">Courier</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-tertiary block mb-1">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-8 h-8 rounded cursor-pointer" value={selectedObject.fill || '#000000'} onChange={(e) => handleUpdate('fill', e.target.value)} />
                  </div>
                </div>
              </>
            )}
            
            {/* Opacity */}
            <div>
              <label className="text-xs text-text-tertiary block mb-1">Opacity ({Math.round((selectedObject.opacity || 1) * 100)}%)</label>
              <input type="range" min="0" max="1" step="0.1" className="w-full" value={selectedObject.opacity || 1} onChange={(e) => handleUpdate('opacity', parseFloat(e.target.value))} />
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
