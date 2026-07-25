import { useState, useEffect } from 'react';
import { EventBus } from '../engines/EventBus';
import { PrintCostEstimate, CostingEngine } from '../engines/CostingEngine';

export function useCosting(): PrintCostEstimate {
  const [cost, setCost] = useState<PrintCostEstimate>(CostingEngine.getCost());

  useEffect(() => {
    const unsubscribe = EventBus.on('COST_UPDATED', (newCost: PrintCostEstimate) => {
      setCost(newCost);
    });
    
    // Sync initial state just in case it updated before mounting
    setCost(CostingEngine.getCost());

    return () => unsubscribe();
  }, []);

  return cost;
}
