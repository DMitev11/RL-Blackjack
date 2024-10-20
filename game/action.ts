export default class AsyncAction {
    public isComplete: boolean = false;

    private _completePromise: () => void;
    private _actionPromise: Promise<void>;
    constructor() {
      this._completePromise = () => {};
      this._actionPromise = new Promise(resolve => this._completePromise = resolve);
    }
  
    public complete(): void {
      this.isComplete = true;
      this._completePromise();
    }
  
    public wait(): Promise<void> {
      return this._actionPromise;
    }
  }