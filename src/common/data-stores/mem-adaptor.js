/**
 * An in memory adapter for data stores
 */

class MemAdaptor {
	constructor() {
		this._data = {};
	}

	/**
	 * Get an array of values
	 */
	getAll() {
		return Promise.resolve(
			Object.getOwnPropertyNames(this._data)

			.map(name => this._data[name])
		);
	}

	/**
	 * Lookup a value
	 *
	 * returns {id, value}
	 */
	get(id) {
		// check if we have the value
		if(this._data.hasOwnProperty(id)) {
			return Promise.resolve(this._data[id]);
		}

		return Promise.resolve();
	}

	/**
	 * Store a value
	 *
	 * The value is stored by its id property
	 */
	set(value) {
		// store the value
		this._data[value.id] = value;

		return Promise.resolve();
	}

	/**
	 * Remove a value from the adaptor
	 */
	remove(key) {
		delete this._data[key];

		return Promise.resolve();
	}
}

module.exports = MemAdaptor;
