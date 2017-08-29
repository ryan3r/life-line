export default class Subscription {
	constructor(cleanup) {
		this._cleanup = cleanup;
		this.active = true;
	}

	// a subscription that has not cleanup method (no-op)
	static noop() {
		return new Subscription(() => {});
	}

	// remove the subscription
	unsubscribe() {
		// already unsubscribed
		if(!this.active) return;

		// call the unsubscribe function
		this._cleanup();

		// mark the subscription as inactive
		this.active = false;
	}
}
