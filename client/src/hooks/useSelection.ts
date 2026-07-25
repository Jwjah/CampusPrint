import { useState, useEffect } from 'react';
import { SelectionEngine } from '../engines/SelectionEngine';
import { EventBus, CoreEvent } from '../engines/EventBus';

export function useSelection(): string[] {
  const [selectedIds, setSelectedIds] = useState<string[]>(SelectionEngine.getSelectedIds());

  useEffect(() => {
    const unsubscribe = EventBus.on(CoreEvent.SELECTION_CHANGED, (ids: string[]) => {
      setSelectedIds([...ids]);
    });
    return () => unsubscribe();
  }, []);

  return selectedIds;
}
