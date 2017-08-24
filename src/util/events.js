import Subscription from "./subscription";

export default class Events {
	constructor() {
		this._listeners = {}
	}

	// define an event
	defineEvent(name, initializeWith) {
		// the listeners for this event
		let listeners = [];
		// save the listeners
		this._listeners[name] = listeners;

		// add a listener
		this[`on${name}`] = fn => {
			// emit a value to the listeners
			const emitValue = value => {
				// initialize from a property
				if(typeof initializeWith == "string") {
					value = this[initializeWith];
				}
				// run an initialization function
				else if(typeof initializeWith == "function") {
					value = initializeWith(this);
				}

				// resolve the promise them send the value
				if(value instanceof Promise) {
					value.then(value => {
						// check that we still wan this value
						if(subscription.active) {
							fn(value);
						}
					});
				}
				// emit the value
				else {
					fn(value);
				}
			};

			// add the actual listener
			let subscription = this._on(name, emitValue);

			// send the initial value
			if(initializeWith) {
				emitValue();
			}

			return subscription;
		};
	}

	// listen to an event of type {type}
	_on(type, fn) {
		// add the listener
		this._listeners[type].push(fn);

		// create a subscription for this listener
		return new Subscription(() => {
			const index = this._listeners[type].indexOf(fn);

			// remove the listener
			if(index !== -1) {
				this._listeners[type].splice(index, 1);
			}
		});
	}

	// emit an event of type {type} with the arguments {args}
	emit(type, arg) {
		for(const fn of this._listeners[type]) {
			fn(arg);
		}
	}

	// check if an event has any listeners attached
	hasListeners(type) {
		return this._listeners[type] && this._listeners[type].length > 0;
	}
}
