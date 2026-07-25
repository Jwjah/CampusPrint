import { DocumentModel } from '../src/models/DocumentModel';
import { generateId } from '../src/utils/uuid';
import { EngineRegistry } from '../src/engines/EngineRegistry';
import { DocumentEngine } from '../src/engines/DocumentEngine';
import { HistoryEngine } from '../src/engines/HistoryEngine';
import { CompositeCommand } from '../src/commands/Command';

// Mock browser APIs for Node.js environment
if (typeof window === 'undefined') {
  (global as any).window = {
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

export function generateMassiveDocument(): DocumentModel {
  console.log('Generating 300-page document with 1000 objects per page...');
  
  const doc: DocumentModel = {
    id: generateId(),
    metadata: {
      filename: 'benchmark_test.pdf',
      pageCount: 300,
      orientation: 'portrait',
      creator: 'Benchmark',
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString(),
      printSettings: {
        paperSize: 'A4',
        duplex: 'none',
        colorMode: 'color',
        copies: 1
      } as any,
      dpi: 300,
      warnings: []
    },
    pages: []
  };

  for (let i = 0; i < 300; i++) {
    const layer = {
      id: generateId(),
      name: 'Layer 1',
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: 1,
      objects: [] as any[]
    };

    for (let j = 0; j < 1000; j++) {
      layer.objects.push({
        id: generateId(),
        type: 'rect',
        left: Math.random() * 800,
        top: Math.random() * 1000,
        width: 50,
        height: 50,
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
      });
    }

    doc.pages.push({
      id: generateId(),
      pageNumber: i + 1,
      width: 800,
      height: 1000,
      layers: [layer]
    });
  }

  return doc;
}

export function runBenchmark() {
  console.log('--- STARTING STRESS TEST ---');
  
  const startTime = Date.now();
  
  // 1. Initialize Engines
  EngineRegistry.initializeAll();
  console.log(`Engines initialized in ${Date.now() - startTime}ms`);

  // 2. Load massive document
  const loadStart = Date.now();
  const doc = generateMassiveDocument();
  DocumentEngine.setDocument(doc);
  console.log(`Massive document loaded into Engine in ${Date.now() - loadStart}ms`);

  // 3. Test Batched Transactions (Moving 10,000 objects across pages)
  const txStart = Date.now();
  HistoryEngine.beginTransaction('Massive Move');
  
  // A mock command that doesn't actually mutate to save test complexity,
  // but tests the Command history stack capacity.
  class MockMoveCommand {
    id = generateId();
    name = 'Move';
    execute() {}
    undo() {}
    redo() {}
  }

  for(let i=0; i<10000; i++) {
    HistoryEngine.executeCommand(new MockMoveCommand() as any);
  }
  
  HistoryEngine.commitTransaction();
  console.log(`Batched transaction of 10,000 commands committed in ${Date.now() - txStart}ms`);

  // 4. Test Engine Disposal
  const disposeStart = Date.now();
  EngineRegistry.disposeAll();
  console.log(`Engines disposed cleanly in ${Date.now() - disposeStart}ms`);
  
  console.log('--- BENCHMARK COMPLETE ---');
}

runBenchmark();
