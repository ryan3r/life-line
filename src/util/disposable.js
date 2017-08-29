import Subscription from "./subscription";

// a collection of subscriptions to be disposed together
export default class Disposable {
	constructor() {
		this._subscriptions = [];
	}

	// add a subscription
	add(subscription) {
		// wrap the function in a subscription
		if(typeof subscription == "function") {
			subscription = new Subscription(subscription);
		}

		this._subscriptions.push(subscription);
	}

	// remove all subscriptions when the component is destroyed
	dispose() {
		while(this._subscriptions.length) {
			this._subscriptions.shift().unsubscribe();
		}
	}
}
