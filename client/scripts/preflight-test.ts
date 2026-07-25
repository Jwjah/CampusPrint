import { DocumentModel } from '../src/models/DocumentModel';
import { generateId } from '../src/utils/uuid';
import { EventBus, CoreEvent } from '../src/engines/EventBus';
import { PreflightEngine } from '../src/engines/PreflightEngine';
import { CostingEngine } from '../src/engines/CostingEngine';

// Node mock
if (typeof window === 'undefined') {
  (global as any).window = {
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

async function runTests() {
  console.log('--- STARTING PREFLIGHT & COSTING TESTS ---');
  
  PreflightEngine.initialize();
  CostingEngine.initialize();

  const mockDoc: DocumentModel = {
    id: generateId(),
    metadata: {
      filename: 'test.pdf',
      pageCount: 10,
      orientation: 'portrait',
      creator: 'Test',
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString(),
      dpi: 150, // Should trigger low-dpi warning
      warnings: [],
      printSettings: {
        paperSize: 'A4',
        duplex: 'none',
        colorMode: 'color',
        copies: 2
      }
    },
    pages: [
      {
        id: generateId(),
        pageNumber: 1,
        width: 800,
        height: 1000,
        layers: [
          {
            id: generateId(),
            name: 'Layer 1',
            visible: true,
            locked: false,
            opacity: 1,
            zIndex: 1,
            objects: [
              {
                // This object is out of bounds (margin warning)
                id: generateId(),
                type: 'rect',
                left: 2, // < 10
                top: 50,
                width: 100,
                height: 100,
                scaleX: 1,
                scaleY: 1,
                angle: 0,
                fill: '#ff0000',
                stroke: null,
                strokeWidth: 0,
                opacity: 1,
                visible: true,
                locked: false,
                version: 1,
                createdAt: Date.now(),
                updatedAt: Date.now()
              },
              {
                // This text uses a non-standard font (font warning)
                id: generateId(),
                type: 'i-text',
                left: 100,
                top: 100,
                width: 100,
                height: 20,
                scaleX: 1,
                scaleY: 1,
                angle: 0,
                fill: '#000000',
                stroke: null,
                strokeWidth: 0,
                opacity: 1,
                visible: true,
                locked: false,
                version: 1,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                fontFamily: 'Comic Sans MS' // Non-standard
              } as any
            ]
          }
        ]
      }
    ]
  };

  // Test Preflight
  const preflightPromise = new Promise<void>((resolve) => {
    EventBus.on('PREFLIGHT_ANALYSIS_COMPLETE', (warnings: any[]) => {
      console.log(`Preflight Analysis Complete. Warnings: ${warnings.length}`);
      
      const hasDpi = warnings.some(w => w.type === 'low-dpi');
      const hasMargin = warnings.some(w => w.type === 'margin');
      const hasFont = warnings.some(w => w.type === 'font');
      
      if (hasDpi && hasMargin && hasFont) {
        console.log('✅ PREFLIGHT ENGINE TEST PASSED');
      } else {
        console.error('❌ PREFLIGHT ENGINE TEST FAILED', warnings);
      }
      resolve();
    });
  });

  // Test Costing
  const costingPromise = new Promise<void>((resolve) => {
    EventBus.on('COST_UPDATED', (cost: any) => {
      // 10 pages * $0.50 (color) * 2 copies = $10.00
      if (cost.totalCost === 10) {
        console.log('✅ COSTING ENGINE TEST PASSED');
      } else {
        console.error(`❌ COSTING ENGINE TEST FAILED. Expected $10, got $${cost.totalCost}`);
      }
      resolve();
    });
  });

  // Trigger analysis by emitting Document Updated event
  EventBus.emit(CoreEvent.DOCUMENT_UPDATED, mockDoc);

  await Promise.all([preflightPromise, costingPromise]);
  
  PreflightEngine.dispose();
  CostingEngine.dispose();

  console.log('--- TESTS COMPLETE ---');
}

runTests();
