const ID_BASE = 36;
const ID_RANDOM_LENGTH = 5;

// generate a unique id
export function genId() {
	// get the date
	const date = Date.now().toString(ID_BASE);
	// get a random number
	const random = Math.random() * ID_BASE ** ID_RANDOM_LENGTH;

	return `${date}-${Math.floor(random).toString(ID_BASE)}`;
}

export function taggedSub(tag) {
	class Subscription {
		constructor(fn) {
			this._fn = fn;
			this.active = true;
			this.tag = tag;
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

	return Subscription;
}

// the default subscription
export let Subscription = taggedSub();

// create a deferred promise
export function defer() {
	let status = "pending", value;

	// in case the user calls resolve/reject before the promise method is ready
	let deferred = {
		resolve: val => {
			status = "resolved";
			value = val;
		},

		reject: err => {
			status = "rejected";
			value = err;
		}
	};

	deferred.promise = new Promise((resolve, reject) => {
		// not handled yet
		if(status == "pending") {
			deferred.resolve = resolve;
			deferred.reject = reject;
		}
		// already resolved
		else if(status == "resolved") {
			resolve(value);
		}
		// aleady rejected
		else if(status == "rejected") {
			reject(value)
		}
	});

	return deferred;
}

export class Events {
	constructor(tag) {
		this._listeners = new Map();
		this._Subscription = taggedSub(tag);
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
		return new this._Subscription(() => {
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
