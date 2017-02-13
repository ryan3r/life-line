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
		// check if a value matches the query
		var filter = value => {
			// check that all the properties match
			return Object.getOwnPropertyNames(props)

			.every(propName => props[propName] == value[propName]);
		};

		// keep track of the current list of items so when items
		// stop fiting the query we can notify the consumer
		var currentItems = [];

		// create a stream from the promise returned by the adaptor
		var current = Stream.from(this._adaptor.getAll())

		.filter((value) => {
			var matches = filter(value);

			// track the id
			if(matches) currentItems.push(value.id);

			return matches;
		});

		// optionaly run changes through the query as well
		if(opts.watch) {
			// wrap the values in change objects
			current = current.map(value => ({ type: "change", id: value.id, value }));

			// filter out changes
			let changes = this.changes

			.pipe((change, pusher) => {
				if(change.type == "change") {
					// check if the value matches the query
					let matches = filter(change.value);

					if(matches) {
						// if this isn't in the currentItems list add it
						if(currentItems.indexOf(change.id) === -1) {
							currentItems.push(change.id);
						}

						// pass the change along
						pusher.push(change);
					}
					// tell the consumer this value no longer matches
					else if(currentItems.indexOf(change.id) !== -1) {
						// remove the item from the current items list
						currentItems.splice(currentItems.indexOf(change.id), 1);

						pusher.push({
							type: "unmatch",
							id: change.id
						});
					}
				}
				else if(change.type == "remove" && currentItems.indexOf(change.id) !== -1) {
					// remove the item from the current items list
					currentItems.splice(currentItems.indexOf(change.id), 1);

					pusher.push({
						type: "remove",
						id: change.id
					});
				}
			});

			return Stream.merge([current, changes]);
		}
		else {
			return current;
		}
	}

	/**
	 * Store a value in the pool
	 */
	set(value) {
		// store the value in the adaptor
		this._adaptor.set(value);

		// propogate the change
		this._changesSrc.push({
			type: "change",
			id: value.id,
			value
		});
	}

	/**
	 * Remove a value from the pool
	 */
	remove(id) {
		// remove the value from the adaptor
		this._adaptor.remove(id);

		// propogate the change
		this._changesSrc.push({
			type: "remove",
			id
		});
	}
}

module.exports = PoolStore;
