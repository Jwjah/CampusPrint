import { fabric } from 'fabric';
import { DocumentModel, PageModel, ObjectModel } from '../models/DocumentModel';
import { EventBus, CoreEvent } from './EventBus';
import { DocumentEngine } from './DocumentEngine';
import { IEngine } from './IEngine';

class RenderingEngineClass implements IEngine {
  // Map of pageId to Fabric Canvas instances
  private canvases: Map<string, fabric.Canvas> = new Map();
  private unsubDoc: (() => void) | null = null;

  public initialize() {
    // When document updates, re-render visible canvases
    this.unsubDoc = EventBus.on(CoreEvent.DOCUMENT_UPDATED, (doc: DocumentModel) => {
      this.renderDocument(doc);
    });
  }

  public dispose() {
    if (this.unsubDoc) this.unsubDoc();
    this.canvases.forEach(c => c.dispose());
    this.canvases.clear();
  }

  public reset() {
    this.canvases.forEach(c => {
      c.clear();
      c.requestRenderAll();
    });
  }

  public registerCanvas(pageId: string, htmlElement: HTMLCanvasElement, width: number, height: number) {
    const canvas = new fabric.Canvas(htmlElement, {
      width,
      height,
      preserveObjectStacking: true,
      selection: true
    });
    
    // In strict one-way flow, Fabric user interactions trigger events, NOT state changes directly.
    canvas.on('object:modified', (e) => this.handleFabricInteraction(pageId, e));
    
    this.canvases.set(pageId, canvas);

    // Initial render for this canvas
    const doc = DocumentEngine.getDocument();
    if (doc) {
      const page = doc.pages.find(p => p.id === pageId);
      if (page) this.renderPage(pageId, page);
    }
    
    return canvas;
  }

  public unregisterCanvas(pageId: string) {
    const canvas = this.canvases.get(pageId);
    if (canvas) {
      canvas.dispose();
      this.canvases.delete(pageId);
    }
  }

  private handleFabricInteraction(pageId: string, event: fabric.IEvent) {
    // Fire a generic UI event. The ToolEngine/HistoryEngine will intercept this,
    // generate a command, mutate DocumentModel, and then RenderingEngine will re-render.
    // We prevent Fabric from keeping its own mutated state.
    EventBus.emit('FABRIC_OBJECT_MODIFIED', { pageId, event });
  }

  public setCanvasDimensions(pageId: string, width: number, height: number, zoom: number) {
    const canvas = this.canvases.get(pageId);
    if (canvas) {
      canvas.setDimensions({ width, height });
      canvas.setZoom(zoom);
      canvas.requestRenderAll();
    }
  }

  private renderDocument(doc: DocumentModel) {
    doc.pages.forEach(page => {
      if (this.canvases.has(page.id)) {
        this.renderPage(page.id, page);
      }
    });
  }

  private renderPage(pageId: string, pageModel: PageModel) {
    const canvas = this.canvases.get(pageId);
    if (!canvas) return;

    // Reconciliation logic:
    // In a full implementation, we'd compare existing fabric objects to DocumentModel objects
    // and only update/add/remove differences to avoid expensive full re-renders.
    // For this blueprint, we demonstrate clearing and re-adding from the pure state.
    
    // canvas.clear();
    // pageModel.layers.forEach(layer => {
    //   if (!layer.visible) return;
    //   layer.objects.forEach(objModel => {
    //     // create fabric.Object from objModel and canvas.add()
    //   });
    // });
    
    canvas.renderAll();
  }
}

export const RenderingEngine = new RenderingEngineClass();
