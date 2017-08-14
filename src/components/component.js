import {Subscription} from "../util";

export class Component extends preact.Component {
	constructor() {
		super();

		this._subscriptions = [];
	}

	// add a subscription
	addSub(subscription) {
		this._subscriptions.push(subscription);
	}

	// remove all subscriptions when the component is destroyed
	unsubscribeAll() {
		while(this._subscriptions.length) {
			this._subscriptions.pop().unsubscribe();
		}
	}

	componentWillUnmount() {
		this.unsubscribeAll();
	}

	// listen to dom events
	listen(target, type, fn, opts) {
		target.addEventListener(type, fn, opts);

		// add a subsciption for the listeners
		this.addSub(new Subscription(() => {
			target.removeEventListener(type, fn, opts);
		}));
	}
}
