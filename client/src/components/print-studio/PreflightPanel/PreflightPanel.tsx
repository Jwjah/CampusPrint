import React from 'react';
import { useDocument } from '@/hooks/useDocument';
import { useCosting } from '@/hooks/useCosting';
import { FiShield, FiInfo, FiAlertTriangle, FiCheckCircle, FiDollarSign } from 'react-icons/fi';

export default function PreflightPanel() {
  const document = useDocument();
  const cost = useCosting();

  const warnings = document?.metadata.warnings || [];
  
  const errors = warnings.filter(w => w.severity === 'error');
  const warningList = warnings.filter(w => w.severity === 'warning');
  const isReady = errors.length === 0;

  return (
    <div className="h-1/2 bg-bg-card flex flex-col border-l border-t border-border-light relative z-10 shrink-0 overflow-y-auto">
      <div className="h-12 border-b border-border-light flex items-center justify-between px-4 shrink-0">
        <h3 className="font-semibold text-text-primary flex items-center gap-2">
          <FiShield size={16} /> Print Preflight
        </h3>
      </div>
      
      <div className="p-4 flex flex-col gap-6">
        {/* Readiness Status */}
        <div className="p-3 rounded-lg border flex items-center gap-3" 
             style={{ 
               backgroundColor: isReady ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
               borderColor: isReady ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
             }}>
          {isReady ? (
            <FiCheckCircle className="text-green-500" size={24} />
          ) : (
            <FiAlertTriangle className="text-red-500" size={24} />
          )}
          <div>
            <div className={`font-medium ${isReady ? 'text-green-500' : 'text-red-500'}`}>
              {isReady ? 'Ready for Print' : 'Action Required'}
            </div>
            <div className="text-xs text-text-secondary mt-0.5">
              {errors.length} Critical, {warningList.length} Warnings
            </div>
          </div>
        </div>

        {/* Cost Estimate */}
        <div>
          <h4 className="font-medium text-white mb-3 flex items-center gap-2">
            <FiDollarSign size={14} className="text-text-tertiary" /> Estimated Cost
          </h4>
          <div className="bg-bg-tertiary rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between text-text-secondary">
              <span>Base Cost:</span>
              <span>${cost.baseCost.toFixed(2)}</span>
            </div>
            {cost.colorCost > 0 && (
              <div className="flex justify-between text-text-secondary">
                <span>Color Cost:</span>
                <span>${cost.colorCost.toFixed(2)}</span>
              </div>
            )}
            {cost.bindingCost > 0 && (
              <div className="flex justify-between text-text-secondary">
                <span>Binding Cost:</span>
                <span>${cost.bindingCost.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-border-light pt-2 mt-2 flex justify-between text-white font-medium">
              <span>Total Estimated:</span>
              <span className="text-brand-primary">${cost.totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Warnings List */}
        {warnings.length > 0 && (
          <div>
            <h4 className="font-medium text-white mb-3">Preflight Checks</h4>
            <div className="space-y-3">
              {warnings.map(w => (
                <div key={w.id} className="bg-bg-tertiary p-3 rounded text-sm border-l-2" style={{
                  borderLeftColor: w.severity === 'error' ? '#ef4444' : w.severity === 'warning' ? '#f59e0b' : '#3b82f6'
                }}>
                  <div className="font-medium mb-1 text-white flex items-center gap-2">
                    {w.severity === 'error' ? <FiAlertTriangle size={14} className="text-red-500"/> :
                     w.severity === 'warning' ? <FiAlertTriangle size={14} className="text-yellow-500"/> :
                     <FiInfo size={14} className="text-blue-500"/>}
                    {w.type.toUpperCase()}
                  </div>
                  <div className="text-text-secondary text-xs">
                    {w.message}
                  </div>
                  {w.pageId && (
                    <div className="mt-2 text-xs text-brand-primary cursor-pointer hover:underline">
                      View Page
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
