import { useState, useEffect } from 'react';
import { DocumentEngine } from '../engines/DocumentEngine';
import { DocumentModel } from '../models/DocumentModel';
import { EventBus, CoreEvent } from '../engines/EventBus';

export function useDocument(): DocumentModel | null {
  const [document, setDocument] = useState<DocumentModel | null>(DocumentEngine.getDocument());

  useEffect(() => {
    const onLoaded = (doc: DocumentModel) => setDocument(doc);
    const onUpdated = (doc: DocumentModel) => setDocument(doc);

    const unsubLoad = EventBus.on(CoreEvent.DOCUMENT_LOADED, onLoaded);
    const unsubUpdate = EventBus.on(CoreEvent.DOCUMENT_UPDATED, onUpdated);
    const unsubPreflight = EventBus.on('PREFLIGHT_WARNINGS_UPDATED', () => {
      setDocument(prev => prev ? { ...prev } : null);
    });

    return () => {
      unsubLoad();
      unsubUpdate();
      unsubPreflight();
    };
  }, []);

  return document;
}
