export interface GuideModel {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: number;
}

export interface UserPreferences {
  snapToGrid: boolean;
  snapToObjects: boolean;
  snapTolerance: number;
  showSmartGuides: boolean;
}

export interface WorkspaceModel {
  activeToolId: string;
  zoom: number;
  activePageId: string | null;
  scrollPosition: { x: number; y: number };
  sidebarSizes: { left: number; right: number };
  inspectorState: any; // Dynamic state based on selection
  
  // Preview Mode
  isPreviewMode: boolean;
  
  // Selection
  selectedObjectIds: string[];
  
  // Rulers & Grid
  rulersVisible: boolean;
  gridVisible: boolean;
  guides: GuideModel[];
  
  theme: 'light' | 'dark' | 'system';
  preferences: UserPreferences;
}

export const defaultWorkspaceModel: WorkspaceModel = {
  activeToolId: 'select',
  zoom: 1.0,
  activePageId: null,
  scrollPosition: { x: 0, y: 0 },
  sidebarSizes: { left: 250, right: 300 },
  inspectorState: {},
  isPreviewMode: false,
  selectedObjectIds: [],
  rulersVisible: false,
  gridVisible: false,
  guides: [],
  theme: 'dark',
  preferences: {
    snapToGrid: false,
    snapToObjects: true,
    snapTolerance: 10,
    showSmartGuides: true
  }
};
