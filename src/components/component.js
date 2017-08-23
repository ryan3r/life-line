import {Subscription} from "../util";
import React from "react";
import {Disposable} from "../util";

export class Component extends React.Component {
	constructor() {
		super();

		this.state = {};
		this.disposable = new Disposable();
	}

	// add a subscription
	addSub(subscription) {
		this.disposable.add(subscription);
	}

	componentWillUnmount() {
		this.disposable.dispose();
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
