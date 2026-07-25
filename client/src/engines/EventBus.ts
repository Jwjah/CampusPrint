type EventHandler = (payload: any) => void;

export enum CoreEvent {
  // Document Events
  DOCUMENT_LOADED = 'DOCUMENT_LOADED',
  DOCUMENT_UPDATED = 'DOCUMENT_UPDATED',
  
  // Page Events
  PAGE_ADDED = 'PAGE_ADDED',
  PAGE_REMOVED = 'PAGE_REMOVED',
  PAGE_CHANGED = 'PAGE_CHANGED', // When active page changes
  
  // Layer Events
  LAYER_ADDED = 'LAYER_ADDED',
  LAYER_REMOVED = 'LAYER_REMOVED',
  LAYER_UPDATED = 'LAYER_UPDATED',
  
  // Object Events
  OBJECT_CREATED = 'OBJECT_CREATED',
  OBJECT_UPDATED = 'OBJECT_UPDATED',
  OBJECT_DELETED = 'OBJECT_DELETED',
  
  // Selection Events
  SELECTION_CHANGED = 'SELECTION_CHANGED',
  
  // Tool & Workspace Events
  TOOL_ACTIVATED = 'TOOL_ACTIVATED',
  ZOOM_CHANGED = 'ZOOM_CHANGED',
  WORKSPACE_UPDATED = 'WORKSPACE_UPDATED',
  
  // Action Intents (UI -> Engines)
  ACTION_UNDO = 'ACTION_UNDO',
  ACTION_REDO = 'ACTION_REDO',
  ACTION_SAVE = 'ACTION_SAVE',
  ACTION_EXPORT = 'ACTION_EXPORT',
  
  // Plugin Events
  PLUGIN_REGISTERED = 'PLUGIN_REGISTERED',
}

import { IEngine } from './IEngine';

class EventBusEngine implements IEngine {
  private listeners: Map<string, Set<EventHandler>> = new Map();

  public initialize() {}
  
  public dispose() {
    this.clear();
  }
  
  public reset() {
    this.clear();
  }

  /**
   * Subscribe to an event
   */
  public on(event: CoreEvent | string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe from an event
   */
  public off(event: CoreEvent | string, handler: EventHandler): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(handler);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Dispatch an event to all subscribers
   */
  public emit(event: CoreEvent | string, payload?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      // Create a shallow copy to prevent issues if a listener unsubscribes during execution
      const listenersArray = Array.from(eventListeners);
      listenersArray.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`[EventBus] Error in handler for event ${event}:`, error);
        }
      });
    }
  }

  /**
   * Clear all listeners (useful for testing or full resets)
   */
  public clear(): void {
    this.listeners.clear();
  }
}

// Singleton instance
export const EventBus = new EventBusEngine();
