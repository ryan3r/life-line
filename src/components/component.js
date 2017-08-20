import {Subscription} from "../util";
import React from "react";

export class Component extends React.Component {
	constructor() {
		super();

		this._subscriptions = [];
		this.state = {};
	}

	// add a subscription
	addSub(subscription) {
		// wrap the function in a subscription
		if(typeof subscription == "function") {
			subscription = new Subscription(subscription);
		}

		this._subscriptions.push(subscription);
	}

	// remove all subscriptions when the component is destroyed
	unsubscribeAll(tag) {
		for(let i = this._subscriptions.length - 1; i >= 0; --i) {
			const subscription = this._subscriptions[i]

			// check if we want to remove this subscription
			if(!tag || subscription.tag == tag) {
				subscription.unsubscribe();

				// remove the subscription from the list
				this._subscriptions.splice(i, 1);
			}
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
