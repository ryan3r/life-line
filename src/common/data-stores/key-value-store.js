/**
 * A basic key value data store
 */

class KeyValueStore extends lifeLine.EventEmitter {
	constructor(adapter) {
		super();
		this._adapter = adapter;

		// make sure we have an adapter
		if(!adapter) {
			throw new Error("KeyValueStore must be initialized with an adapter")
		}
	}

	/**
	 * Get the corrisponding value out of the data store otherwise return default
	 */
	get(key, _default) {
		// check if this value has been overriden
		if(this._overrides && this._overrides.hasOwnProperty(key)) {
			return Promise.resolve(this._overrides[key]);
		}

		return this._adapter.get(key)

		.then(result => {
			// the item is not defined
			if(!result) {
				return _default;
			}

			return result.value;
		});
	}

	/**
	 * Set a single value or several values
	 *
	 * key -> value
	 * or
	 * { key: value }
	 */
	set(key, value) {
		// set a single value
		if(typeof key == "string") {
			return this._adapter.set({
				id: key,
				value,
				modified: Date.now()
			});

			// trigger the change
			this.emit(key, value);
		}
		// set several values
		else {
			// tell the caller when we are done
			let promises = [];

			for(let _key of Object.getOwnPropertyNames(key)) {
				promises.push(
					this._adapter.set({
						id: _key,
						value: key[_key],
						modified: Date.now()
					})
				);

				// trigger the change
				this.emit(_key, key[_key]);
			}

			return Promise.all(promises);
		}
	}

	 /**
	  * Watch the value for changes
	  *
	  * opts.current - send the current value of key (default: false)
	  * opts.default - the default value to send for opts.current
	  */
	 watch(key, opts, fn) {
		 // make opts optional
		 if(typeof opts == "function") {
			 fn = opts;
			 opts = {};
		 }

		 // send the current value
		 if(opts.current) {
			 fn(this.get(key, opts.default));
		 }

		 // listen for any changes
		 return this.on(key, fn);
	 }

	 /**
	  * Override the values from the adaptor without writing to them
	  *
	  * Useful for combining json settings with command line flags
	  */
	 setOverrides(overrides) {
		 this._overrides = overrides;
	 }
}

module.exports = KeyValueStore;
