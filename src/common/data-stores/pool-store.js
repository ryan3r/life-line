/**
 * A data store which contains a pool of objects which are queryable by any property
 */

var Stream = require("../util/stream");

class PoolStore {
	constructor(adaptor) {
		this._adaptor = adaptor;

		// create the change stream
		var {stream, source} = Stream.create();

		this._changesSrc = source;
		this.changes = stream;
	}

	/**
	 * Get all items matcing the provided properties
	 */
	query(props = {}, opts = {}) {
		// create a stream from the promise returned by the adaptor
		var current = Stream.from(this._adaptor.getAll());

		var src;

		// optionaly run changes through the query as well
		if(opts.watch) {
			src = Stream.concat([current, this.changes]);
		}
		else {
			src = current;
		}

		return src.filter(object => {
			// check that all the properties match
			return Object.getOwnPropertyNames(props)

			.every(propName => props[propName] == object[propName]);
		});
	}

	/**
	 * Store a value in the pool
	 */
	set(value) {
		// store the value in the adaptor
		this._adaptor.set(value);

		// propogate the change
		this._changesSrc.push(value);
	}
}

module.exports = PoolStore;
