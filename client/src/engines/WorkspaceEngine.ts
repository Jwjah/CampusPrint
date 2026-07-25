import { WorkspaceModel, defaultWorkspaceModel } from '../models/WorkspaceModel';
import { EventBus, CoreEvent } from './EventBus';
import { IEngine } from './IEngine';

class WorkspaceEngineClass implements IEngine {
  private workspace: WorkspaceModel = { ...defaultWorkspaceModel };

  public initialize() {}

  public dispose() {}

  public reset() {
    this.workspace = { ...defaultWorkspaceModel };
    EventBus.emit(CoreEvent.WORKSPACE_UPDATED, this.workspace);
  }

  public getWorkspace(): WorkspaceModel {
    return this.workspace;
  }

  public togglePreviewMode(isPreviewMode?: boolean) {
    this.workspace.isPreviewMode = isPreviewMode !== undefined ? isPreviewMode : !this.workspace.isPreviewMode;
    EventBus.emit(CoreEvent.WORKSPACE_UPDATED, this.workspace);
  }

  public setWorkspace(workspace: WorkspaceModel) {
    this.workspace = { ...workspace };
    EventBus.emit(CoreEvent.WORKSPACE_UPDATED, this.workspace);
  }

  public updateWorkspace(updates: Partial<WorkspaceModel>) {
    this.workspace = { ...this.workspace, ...updates };
    EventBus.emit(CoreEvent.WORKSPACE_UPDATED, this.workspace);
  }

  public setZoom(zoom: number) {
    // Clamp zoom between 10% and 500%
    const clampedZoom = Math.min(Math.max(zoom, 0.1), 5.0);
    this.updateWorkspace({ zoom: clampedZoom });
    EventBus.emit(CoreEvent.ZOOM_CHANGED, clampedZoom);
  }

  public setActivePage(pageId: string) {
    this.updateWorkspace({ activePageId: pageId });
    EventBus.emit(CoreEvent.PAGE_CHANGED, pageId);
  }
}

export const WorkspaceEngine = new WorkspaceEngineClass();
