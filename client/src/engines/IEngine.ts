export interface IEngine {
  /**
   * Called exactly once when the engine is registered.
   */
  initialize(): void;

  /**
   * Called to completely tear down the engine, removing global event listeners
   * and clearing intervals to prevent memory leaks.
   */
  dispose(): void;

  /**
   * Called when a new document is loaded or the editor state needs to be completely reset
   * to a blank slate without unregistering the engine.
   */
  reset(): void;
}
