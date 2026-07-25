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
      className={`min-w-[44px] min-h-[44px] p-2 rounded-md flex items-center justify-center transition-colors ${
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
    EventBus.emit(CoreEvent.ACTION_SAVE);
    setTimeout(() => setIsSaving(false), 2000);
  };

  const setTool = (toolId: string) => {
    PluginManager.activateTool(toolId);
    WorkspaceEngine.updateWorkspace({ activeToolId: toolId });
  };

  const { activeToolId, zoom } = workspace;

  return (
    <div className="w-full bg-bg-card border-b border-border-light flex flex-col md:flex-row md:h-14 items-center justify-between px-2 md:px-4 z-20 shrink-0 gap-2 md:gap-0 overflow-x-auto no-scrollbar pb-2 md:pb-0">
      <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto mt-2 md:mt-0">
        <div className="hidden md:block font-bold text-lg text-primary mr-2 tracking-tight">PrintStudio</div>
        
        {/* History */}
        <div className="flex items-center gap-1 border-r border-border-light pr-2 md:pr-4">
          <ToolButton icon={<MdUndo size={22} />} label="Undo" onClick={() => EventBus.emit(CoreEvent.ACTION_UNDO)} />
          <ToolButton icon={<MdRedo size={22} />} label="Redo" onClick={() => EventBus.emit(CoreEvent.ACTION_REDO)} />
        </div>

        {/* Tools (Scrollable on mobile) */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-nowrap">
          <ToolButton tool="select" currentTool={activeToolId} icon={<HiOutlineCursorClick size={22} />} label="Select" onClick={() => setTool('select')} />
          <ToolButton tool="hand" currentTool={activeToolId} icon={<HiOutlineHand size={22} />} label="Pan" onClick={() => setTool('hand')} />
          <div className="w-px h-8 bg-border shrink-0 mx-1" />
          <ToolButton tool="text" currentTool={activeToolId} icon={<BiText size={22} />} label="Add Text" onClick={() => setTool('text')} />
          <ToolButton tool="image" currentTool={activeToolId} icon={<HiOutlinePhotograph size={22} />} label="Add Image" onClick={() => setTool('image')} />
          <div className="w-px h-8 bg-border shrink-0 mx-1" />
          <ToolButton tool="rect" currentTool={activeToolId} icon={<BiSquare size={22} />} label="Rectangle" onClick={() => setTool('rect')} />
          <ToolButton tool="circle" currentTool={activeToolId} icon={<BiCircle size={22} />} label="Circle" onClick={() => setTool('circle')} />
          <ToolButton tool="arrow" currentTool={activeToolId} icon={<BiArrowBack size={22} className="transform rotate-135" />} label="Arrow" onClick={() => setTool('arrow')} />
          <ToolButton tool="line" currentTool={activeToolId} icon={<HiOutlineMinus size={22} />} label="Line" onClick={() => setTool('line')} />
          <div className="w-px h-8 bg-border shrink-0 mx-1" />
          <ToolButton tool="highlight" currentTool={activeToolId} icon={<BiHighlight size={22} />} label="Highlight" onClick={() => setTool('highlight')} />
          <ToolButton tool="pencil" currentTool={activeToolId} icon={<HiOutlinePencil size={22} />} label="Freehand" onClick={() => setTool('pencil')} />
          <ToolButton tool="signature" currentTool={activeToolId} icon={<FaSignature size={22} />} label="Signature" onClick={() => setTool('signature')} />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0 px-2 md:px-0">
        {/* Zoom */}
        <div className="hidden md:flex items-center gap-2 bg-bg-tertiary rounded-md px-2 py-1 min-h-[44px]">
          <button className="p-2 text-text-secondary hover:text-white" onClick={() => WorkspaceEngine.setZoom(zoom - 0.1)}><HiOutlineZoomOut size={18} /></button>
          <span className="text-sm font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button className="p-2 text-text-secondary hover:text-white" onClick={() => WorkspaceEngine.setZoom(zoom + 0.1)}><HiOutlineZoomIn size={18} /></button>
        </div>

        <button className="btn btn-secondary min-h-[44px]" onClick={() => alert('Preview not implemented')}>
          Preview
        </button>
        <button 
          className="btn btn-primary min-h-[44px] flex items-center gap-2 disabled:opacity-50" 
          onClick={handleSave}
          disabled={!document || isSaving}
        >
          <HiOutlineSave size={20} /> {isSaving ? 'Saving...' : 'Save PDF'}
        </button>
      </div>
    </div>
  );
}
