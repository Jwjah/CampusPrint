import { DocumentModel } from '../models/DocumentModel';
import { EventBus, CoreEvent } from './EventBus';
import { IEngine } from './IEngine';

export interface PrintCostEstimate {
  baseCost: number;
  colorCost: number;
  bindingCost: number;
  totalCost: number;
}

export interface ShopPricingConfig {
  price_bw: number;
  price_color: number;
  price_binding: number;
  price_stick_file: number;
}

class CostingEngineClass implements IEngine {
  private unsubDoc: (() => void) | null = null;
  private currentCost: PrintCostEstimate = { baseCost: 0, colorCost: 0, bindingCost: 0, totalCost: 0 };
  
  // Default shop pricing if not set
  private pricingConfig: ShopPricingConfig = {
    price_bw: 2.00,
    price_color: 5.00,
    price_binding: 30.00,
    price_stick_file: 10.00
  };

  public initialize() {
    this.unsubDoc = EventBus.on(CoreEvent.DOCUMENT_UPDATED, (doc: DocumentModel) => {
      this.calculateCost(doc);
    });
  }

  public setPricingConfig(config: ShopPricingConfig) {
    this.pricingConfig = config;
    // Trigger recalculation if a document is already loaded
    import('./DocumentEngine').then(({ DocumentEngine }) => {
      const currentDoc = DocumentEngine.getDocument();
      if (currentDoc) {
        this.calculateCost(currentDoc);
      }
    });
  }

  public dispose() {
    if (this.unsubDoc) this.unsubDoc();
  }

  public reset() {
    this.currentCost = { baseCost: 0, colorCost: 0, bindingCost: 0, totalCost: 0 };
    EventBus.emit('COST_UPDATED', this.currentCost);
  }

  private calculateCost(doc: DocumentModel) {
    const settings = doc.metadata.printSettings;
    if (!settings) return;

    const pages = doc.metadata.pageCount;
    const copies = settings.copies || 1;
    const pagesPerSheet = settings.pagesPerSheet ? parseInt(String(settings.pagesPerSheet)) || 1 : 1;
    const printedSheets = Math.ceil((pages || 0) / pagesPerSheet);

    // In CampusPrint, the price_bw and price_color apply per printed sheet.
    let costPerPage = settings.colorMode === 'color' ? this.pricingConfig.price_color : this.pricingConfig.price_bw;

    const baseCost = printedSheets * costPerPage * copies;
    
    // Simplification for the UI display: baseCost shows BW equivalent, colorCost shows the delta if color
    const bwEquivalentBase = printedSheets * this.pricingConfig.price_bw * copies;
    const colorCostDelta = settings.colorMode === 'color' ? baseCost - bwEquivalentBase : 0;
    
    // Simplification: if binding is selected in a future UI, we add binding cost.
    const bindingCost = 0; // Stub for future binding UI

    this.currentCost = {
      baseCost: settings.colorMode === 'color' ? bwEquivalentBase : baseCost,
      colorCost: colorCostDelta,
      bindingCost,
      totalCost: baseCost + bindingCost
    };

    EventBus.emit('COST_UPDATED', this.currentCost);
  }

  public getCost(): PrintCostEstimate {
    return this.currentCost;
  }
}

export const CostingEngine = new CostingEngineClass();
