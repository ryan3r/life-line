import Subscription from "./subscription";

export default class Events {
	constructor(tag) {
		this._listeners = new Map();
	}

	// listen to an event of type {type}
	on(type, fn) {
		// make sure we have this type of listener registered
		if(!this._listeners.has(type)) {
			this._listeners.set(type, []);
		}

		// add the listener
		this._listeners.get(type).push(fn);

		// create a subscription for this listener
		return new Subscription(() => {
			const index = this._listeners.get(type).indexOf(fn);

			// remove the listener
			if(index !== -1) {
				this._listeners.get(type).splice(index, 1);
			}
		});
	}

	// emit an event of type {type} with the arguments {args}
	emit(type, ...args) {
		// check if we have any listeners for this type
		if(this._listeners.has(type)) {
			for(const fn of this._listeners.get(type)) {
				fn(...args);
			}
		}
	}

	// check if an event has any listeners attached
	hasListeners(type) {
		return this._listeners.has(type) && this._listeners.get(type).length > 0;
	}
}
