/**
 * Keep a list of subscriptions to unsubscribe from together
 */

class Disposable {
	constructor() {
		this._subscriptions = [];
	}

	// Unsubscribe from all subscriptions
	dispose() {
		// remove the first subscription until there are none left
		while(this._subscriptions.length > 0) {
			this._subscriptions.shift().unsubscribe();
		}
	}

	// Add a subscription to the disposable
	add(subscription) {
		this._subscriptions.push(subscription);
	}

	// dispose when an event is fired
	disposeOn(emitter, event) {
		this.add(emitter.on(event, () => this.dispose()));
	}
};

module.exports = Disposable;
