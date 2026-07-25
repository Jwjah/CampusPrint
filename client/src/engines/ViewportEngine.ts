import { EventBus } from './EventBus';
import { IEngine } from './IEngine';

class ViewportEngineClass implements IEngine {
  private observer: IntersectionObserver | null = null;
  private visiblePages: Set<string> = new Set();

  public initialize() {
    this.observer = new IntersectionObserver((entries) => {
      let changed = false;
      entries.forEach(entry => {
        const pageId = entry.target.getAttribute('data-page-id');
        if (!pageId) return;
        
        if (entry.isIntersecting) {
          if (!this.visiblePages.has(pageId)) {
            this.visiblePages.add(pageId);
            changed = true;
          }
        } else {
          if (this.visiblePages.has(pageId)) {
            this.visiblePages.delete(pageId);
            changed = true;
          }
        }
      });
      
      if (changed) {
        // Broadcast the visible pages so Rendering Engine knows what to mount/unmount
        EventBus.emit('VIEWPORT_PAGES_CHANGED', Array.from(this.visiblePages));
      }
    }, {
      rootMargin: '500px', // Pre-load 500px before coming into view
      threshold: 0
    });
  }

  public dispose() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  public reset() {
    this.visiblePages.clear();
  }

  public observe(element: HTMLElement) {
    if (this.observer) {
      this.observer.observe(element);
    }
  }

  public unobserve(element: HTMLElement) {
    if (this.observer) {
      this.observer.unobserve(element);
    }
  }

  public getVisiblePages(): string[] {
    return Array.from(this.visiblePages);
  }
}

export const ViewportEngine = new ViewportEngineClass();
