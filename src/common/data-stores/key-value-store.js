/**
 * A basic key value data store
 */

var Stream = require("../util/stream");

class KeyValueStore {
	constructor(adapter) {
		this._adapter = adapter;

		// make sure we have an adapter
		if(!adapter) {
			throw new Error("KeyValueStore must be initialized with an adapter")
		}

		// create the change stream
		var {source, stream} = Stream.create();

		this._changesSrc = source;
		this._changes = stream;
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
			this._changesSrc.push({key, value});
		}
		// set several values
		else {
			for(let _key of Object.getOwnPropertyNames(key)) {
				this._adapter.set({
					id: _key,
					value: key[_key]
				});

				// trigger the change
			   this._changesSrc.push({
				   key: _key,
				   value: key[_key]
			   });
			 }
		}
	}

	 /**
	  * Watch the value for changes
	  *
	  * opts.current - send the current value of key (default: false)
	  * opts.default - the default value to send for opts.current
	  */
	 watch(key, opts = {}) {
		 // get the changes relating to this key
		 var changes = this._changes
		 	.filter(change => key == change.key)
			.map(change => change.value);

		 // send the current value alon with changes
		 if(opts.current) {
			 return Stream.concat([
				 // give the initial value
				 Stream.from([ this.get(key, opts.default) ]),
				 // recieve any changes later along the line
				 changes
			 ]);
		 }

		 // listen for any changes
		 return changes;
	 }
}

module.exports = KeyValueStore;
