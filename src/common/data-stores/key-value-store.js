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
			this._adapter.set({
				id: key,
				value
			});

			// trigger the change
			this.emit(key, value);
		}
		// set several values
		else {
			for(let _key of Object.getOwnPropertyNames(key)) {
				this._adapter.set({
					id: _key,
					value: key[_key]
				});

				 // trigger the change
				 this.emit(_key, key[_key]);
			 }
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
			 this.get(key, opts.default).then(fn);
		 }

		 // listen for any changes
		 return this.on(key, fn);
	 }
}

module.exports = KeyValueStore;
