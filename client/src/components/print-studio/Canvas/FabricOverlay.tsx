import React, { useEffect, useRef, useState } from 'react';
import { RenderingEngine } from '@/engines/RenderingEngine';
import { EventBus } from '@/engines/EventBus';

interface FabricOverlayProps {
  pageId: string;
  width: number;
  height: number;
  zoom: number;
}

export default function FabricOverlay({ pageId, width, height, zoom }: FabricOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // We rely on ViewportEngine to only mount this component when visible/nearby.
  // When it mounts, we register it with RenderingEngine.
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Register the canvas with the Rendering Engine. 
    // The engine takes over the fabric instantiation and synchronization.
    const fabricCanvas = RenderingEngine.registerCanvas(pageId, canvasRef.current, width, height);
    
    setIsMounted(true);

    return () => {
      // Clean up when unmounted (scrolled out of view)
      RenderingEngine.unregisterCanvas(pageId);
      setIsMounted(false);
    };
  }, [pageId]); // Re-register only if pageId changes

  // Handle Dimension/Zoom updates
  useEffect(() => {
    if (isMounted) {
      RenderingEngine.setCanvasDimensions(pageId, width, height, zoom);
    }
  }, [width, height, zoom, isMounted, pageId]);

  return (
    <canvas ref={canvasRef} />
  );
}
