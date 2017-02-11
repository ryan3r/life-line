/**
 * A basic event emitter
 */

class EventEmitter {
	constructor() {
		this._listeners = {};
	}

	/**
	 * Add an event listener
	 */
	on(name, listener) {
		// if we don't have an existing listeners array create one
		if(!this._listeners[name]) {
			this._listeners[name] = [];
		}

		// add the listener
		this._listeners[name].push(listener);

		// give them a subscription
		return {
			_listener: listener,

			unsubscribe: () => {
				// find the listener
				var index = this._listeners[name].indexOf(listener);

				if(index !== -1) {
					this._listeners[name].splice(index, 1);
				}
			}
		};
	}

	/**
	 * Emit an event
	 */
	emit(name, ...args) {
		// check for listeners
		if(this._listeners[name]) {
			for(let listener of this._listeners[name]) {
				// call the listeners
				listener(...args);
			}
		}
	}

	/**
	 * Emit an event and skip some listeners
	 */
	partialEmit(name, skips = [], ...args) {
		// allow a single item
		if(!Array.isArray(skips)) {
			skips = [skips];
		}

		// check for listeners
		if(this._listeners[name]) {
			for(let listener of this._listeners[name]) {
				// this event listener is being skiped
				if(skips.find(skip => skip._listener == listener)) {
					continue;
				}

				// call the listeners
				listener(...args);
			}
		}
	}
}

module.exports = EventEmitter;
