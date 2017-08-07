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

	reboot() {/*
		// remove listeners
		this.unsubscribeAll();

		// add listeners back
		this.componentDidMount();
	*/}
}
