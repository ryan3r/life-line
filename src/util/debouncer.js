import defer from "./deferred";

export default class Debouncer {
	constructor(fn, time) {
		this._fn = fn;
		this._time = time;
		this.pending = false;
	}

	trigger() {
		// resolve the old deferred
		if(this._deferred) {
			this._deferred.resolve();
		}

		// clear the old timer
		clearTimeout(this._timeout);

		this.pending = true;

		// create a deferred for when this call is executed or canceled
		this._deferred = defer();

		this._timeout = setTimeout(() => {
			this.pending = false;

			// trigger the function
			this._deferred.resolve(
				this._fn()
			);
		}, this._time);

		return this._deferred.promise;
	}

	// cancel any pending calls
	cancel() {
		// resolve the old deferred
		if(this._deferred) {
			this._deferred.resolve();
		}

		clearTimeout(this._timeout);

		this.pending = false;
	}
}
