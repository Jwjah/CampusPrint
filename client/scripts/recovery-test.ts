import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { AutosaveEngine } from '../src/engines/AutosaveEngine';
import { generateMassiveDocument } from './benchmark';

async function runRecoveryTest() {
  console.log('--- STARTING CRASH RECOVERY TEST ---');
  
  // 1. Initialize AutosaveEngine
  await AutosaveEngine.initialize();
  
  // 2. Generate a Document Model
  const doc = generateMassiveDocument();
  doc.pages.length = 2; // Keep it smaller for IDB testing speed
  console.log(`Generated mock document with ID: ${doc.id}`);
  
  // 3. Save to IDB (simulate active editor saving state)
  const mockWorkspace = {
    zoom: 2,
    activeToolId: 'pencil',
    activePageId: doc.pages[0].id,
    scrollPosition: { x: 0, y: 0 },
    sidebarSizes: { left: 250, right: 300 },
    inspectorState: {},
    selectedObjectIds: [],
    rulersVisible: true,
    gridVisible: false,
    guides: [],
    theme: 'dark' as any,
    preferences: {
      snapToGrid: true,
      snapToObjects: true,
      snapTolerance: 10,
      showSmartGuides: true
    },
    isPreviewMode: false
  };
  
  await AutosaveEngine.persistState(doc, mockWorkspace);
  
  // Simulate writing a raw Uint8Array PDF
  const rawBytes = new Uint8Array([1, 2, 3, 4, 5]);
  await AutosaveEngine.saveOriginalPDF(doc.id, rawBytes);
  
  console.log('State saved successfully. Simulating crash and restart...');
  
  // 4. Dispose and recreate engine (Simulate Browser Restart)
  AutosaveEngine.dispose();
  
  // 5. Restore state
  await AutosaveEngine.initialize();
  
  const restoredState = await AutosaveEngine.loadState(doc.id);
  
  if (restoredState.document && restoredState.workspace && restoredState.bytes) {
    console.log('✅ RECOVERY SUCCESSFUL');
    console.log(`Restored Document ID: ${restoredState.document.id}`);
    console.log(`Restored Active Tool: ${restoredState.workspace.activeToolId}`);
    console.log(`Restored PDF Bytes Length: ${restoredState.bytes.length}`);
    
    if (restoredState.workspace.activeToolId !== 'pencil') {
      throw new Error("Workspace didn't match");
    }
  } else {
    console.error('❌ RECOVERY FAILED');
  }
  
  AutosaveEngine.dispose();
  console.log('--- CRASH RECOVERY TEST COMPLETE ---');
}

runRecoveryTest();
