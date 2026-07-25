import { useState, useEffect } from 'react';
import { WorkspaceEngine } from '../engines/WorkspaceEngine';
import { WorkspaceModel } from '../models/WorkspaceModel';
import { EventBus, CoreEvent } from '../engines/EventBus';

export function useWorkspace(): WorkspaceModel {
  const [workspace, setWorkspace] = useState<WorkspaceModel>(WorkspaceEngine.getWorkspace());

  useEffect(() => {
    const unsubscribe = EventBus.on(CoreEvent.WORKSPACE_UPDATED, (newWorkspace: WorkspaceModel) => {
      setWorkspace(newWorkspace);
    });
    
    // Listen to granular events to trigger full update just in case
    const unZoom = EventBus.on(CoreEvent.ZOOM_CHANGED, () => setWorkspace(WorkspaceEngine.getWorkspace()));
    const unPage = EventBus.on(CoreEvent.PAGE_CHANGED, () => setWorkspace(WorkspaceEngine.getWorkspace()));

    return () => {
      unsubscribe();
      unZoom();
      unPage();
    };
  }, []);

  return workspace;
}
