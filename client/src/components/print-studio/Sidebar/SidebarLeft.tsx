import React from 'react';
import ThumbnailList from './ThumbnailList';

interface SidebarLeftProps {
  width: number;
}

export default function SidebarLeft({ width }: SidebarLeftProps) {
  return (
    <div 
      className="h-full bg-bg-card flex flex-col border-r border-border-light relative z-10 shrink-0 overflow-hidden"
      style={{ width }}
    >
      <div className="h-12 border-b border-border-light flex items-center justify-between px-4 shrink-0">
        <h3 className="font-semibold text-text-primary">Pages</h3>
      </div>
      
      <div className="flex-1 overflow-hidden relative">
        <ThumbnailList />
      </div>
    </div>
  );
}
