import React, { useState } from 'react';
import { WorkspaceEngine } from '@/engines/WorkspaceEngine';
import { EventBus, CoreEvent } from '@/engines/EventBus';
import { PluginManager } from '@/engines/PluginManager';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useDocument } from '@/hooks/useDocument';
import { 
  HiOutlineCursorClick, HiOutlineHand, HiOutlinePencil, 
  HiOutlinePhotograph, HiOutlineMinus, 
  HiOutlineUpload, HiOutlineSave, HiOutlineZoomIn, HiOutlineZoomOut
} from 'react-icons/hi';
import { BiText, BiSquare, BiCircle, BiArrowBack, BiHighlight } from 'react-icons/bi';
import { FaSignature } from 'react-icons/fa';
import { MdUndo, MdRedo } from 'react-icons/md';

const ToolButton = ({ 
  tool, icon, label, currentTool, onClick 
}: { 
  tool?: string, icon: React.ReactNode, label: string, currentTool?: string, onClick?: () => void 
}) => {
  const isActive = currentTool === tool;
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-2 rounded-md flex items-center justify-center transition-colors ${
        isActive ? 'bg-primary text-white' : 'text-text-secondary hover:bg-bg-tertiary hover:text-white'
      }`}
    >
      {icon}
    </button>
  );
};

export default function Toolbar() {
  const workspace = useWorkspace();
  const document = useDocument();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    if (!document) return;
    setIsSaving(true);
    // Trigger Export Intent. In a full app we'd load the originalBytes from AutosaveEngine first.
    // For this blueprint, ExportEngine handles fetching it or we pass it if we keep it in memory.
    EventBus.emit(CoreEvent.ACTION_SAVE);
    
    // We can simulate saving finish or listen to EXPORT_COMPLETE
    setTimeout(() => setIsSaving(false), 2000);
  };

  const setTool = (toolId: string) => {
    PluginManager.activateTool(toolId);
    WorkspaceEngine.updateWorkspace({ activeToolId: toolId });
  };

  const { activeToolId, zoom } = workspace;

  return (
    <div className="h-14 bg-bg-card border-b border-border-light flex items-center justify-between px-4 z-20 shrink-0">
      <div className="flex items-center gap-4">
        <div className="font-bold text-lg text-primary mr-4 tracking-tight">PrintStudio</div>
        
        {/* History */}
        <div className="flex items-center gap-1 border-r border-border-light pr-4">
          <ToolButton icon={<MdUndo size={20} />} label="Undo (Ctrl+Z)" onClick={() => EventBus.emit(CoreEvent.ACTION_UNDO)} />
          <ToolButton icon={<MdRedo size={20} />} label="Redo (Ctrl+Y)" onClick={() => EventBus.emit(CoreEvent.ACTION_REDO)} />
        </div>

        {/* Tools */}
        <div className="flex items-center gap-1">
          <ToolButton tool="select" currentTool={activeToolId} icon={<HiOutlineCursorClick size={20} />} label="Select" onClick={() => setTool('select')} />
          <ToolButton tool="hand" currentTool={activeToolId} icon={<HiOutlineHand size={20} />} label="Pan" onClick={() => setTool('hand')} />
          <div className="w-px h-6 bg-border mx-2" />
          <ToolButton tool="text" currentTool={activeToolId} icon={<BiText size={20} />} label="Add Text" onClick={() => setTool('text')} />
          <ToolButton tool="image" currentTool={activeToolId} icon={<HiOutlinePhotograph size={20} />} label="Add Image" onClick={() => setTool('image')} />
          <div className="w-px h-6 bg-border mx-2" />
          <ToolButton tool="rect" currentTool={activeToolId} icon={<BiSquare size={20} />} label="Rectangle" onClick={() => setTool('rect')} />
          <ToolButton tool="circle" currentTool={activeToolId} icon={<BiCircle size={20} />} label="Circle" onClick={() => setTool('circle')} />
          <ToolButton tool="arrow" currentTool={activeToolId} icon={<BiArrowBack size={20} className="transform rotate-135" />} label="Arrow" onClick={() => setTool('arrow')} />
          <ToolButton tool="line" currentTool={activeToolId} icon={<HiOutlineMinus size={20} />} label="Line" onClick={() => setTool('line')} />
          <div className="w-px h-6 bg-border mx-2" />
          <ToolButton tool="highlight" currentTool={activeToolId} icon={<BiHighlight size={20} />} label="Highlight" onClick={() => setTool('highlight')} />
          <ToolButton tool="pencil" currentTool={activeToolId} icon={<HiOutlinePencil size={20} />} label="Freehand" onClick={() => setTool('pencil')} />
          <ToolButton tool="signature" currentTool={activeToolId} icon={<FaSignature size={20} />} label="Signature" onClick={() => setTool('signature')} />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Zoom */}
        <div className="flex items-center gap-2 bg-bg-tertiary rounded-md px-2 py-1">
          <button className="p-1 text-text-secondary hover:text-white" onClick={() => WorkspaceEngine.setZoom(zoom - 0.1)}><HiOutlineZoomOut size={16} /></button>
          <span className="text-xs font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button className="p-1 text-text-secondary hover:text-white" onClick={() => WorkspaceEngine.setZoom(zoom + 0.1)}><HiOutlineZoomIn size={16} /></button>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={() => alert('Preview not implemented')}>
          Preview
        </button>
        <button 
          className="btn btn-primary btn-sm flex items-center gap-2 disabled:opacity-50" 
          onClick={handleSave}
          disabled={!document || isSaving}
        >
          <HiOutlineSave size={16} /> {isSaving ? 'Saving...' : 'Save PDF'}
        </button>
      </div>
    </div>
  );
}
