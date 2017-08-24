export default class Subscription {
	constructor(fn) {
		this._fn = fn;
		this.active = true;
	}

	// remove the subscription
	unsubscribe() {
		// already unsubscribed
		if(!this.active) return;

		// call the unsubscribe function
		this._fn();

		// mark the subscription as inactive
		this.active = false;
	}
}
