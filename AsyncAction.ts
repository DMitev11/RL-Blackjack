export default class AsyncAction {
    public isComplete: boolean = false;

    private _completePromise: () => void;
    private _actionPromise: Promise<void>;
    constructor() {
      this._completePromise = () => {};
      this._actionPromise = new Promise(resolve => this._completePromise = resolve);
    }
  
    /**
     * Completes the action by resolving the `actionPromise`
     *
     * @returns {void}
     */
    public complete(): void {
      this.isComplete = true;
      this._completePromise();
    }
  
    /**
     * Returns the `actionPromise` so it can be awaited
     *
     * @returns {Promise}
     */
    public wait(): Promise<void> {
      return this._actionPromise;
    }
  }