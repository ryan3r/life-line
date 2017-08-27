import React from "react";
import Disposable from "../util/disposable";

export default class Component extends React.Component {
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
		this.addSub(() => {
			target.removeEventListener(type, fn, opts);
		});
	}
}
