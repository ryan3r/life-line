/**
 * A data store which contains a pool of objects which are queryable by any property
 */

class PoolStore extends lifeLine.EventEmitter {
	constructor(adaptor) {
		super();
		this._adaptor = adaptor;
	}

	/**
	 * Get all items matcing the provided properties
	 */
	query(props, opts, fn) {
		// make opts optional
		if(typeof opts == "function") {
			fn = opts;
			opts = {};
		}

		opts || (opts = {});

		// check if a value matches the query
		var filter = value => {
			// check that all the properties match
			return Object.getOwnPropertyNames(props)

			.every(propName => {
				// a function to check if a value matches
				if(typeof props[propName] == "function") {
					return props[propName](value[propName]);
				}
				// plain equality
				else {
					return props[propName] == value[propName]
				}
			});
		};

		// keep track of the current list of items so when items
		// stop fiting the query we can notify the consumer
		var currentItems = [];

		// get all current items that match the filter
		var current = this._adaptor.getAll()

		.then(values => {
			var matches = values.filter(filter);

			// track the id
			for(let value of matches) {
				currentItems.push(value.id);
			}

			return matches;
		});

		// optionaly run changes through the query as well
		if(opts.watch) {
			// wrap the values in change objects and send the to the consumer
			current.then(values => {
				// send the values we currently have
				for(let value of values) {
					fn({ type: "change", id: value.id, value });
				}

				// watch for changes after the initial values are send
				this.on("change", change => {
					if(change.type == "change") {
						// check if the value matches the query
						let matches = filter(change.value);

						if(matches) {
							// if this isn't in the currentItems list add it
							if(currentItems.indexOf(change.id) === -1) {
								currentItems.push(change.id);
							}

							// pass the change along
							fn(change);
						}
						// tell the consumer this value no longer matches
						else if(currentItems.indexOf(change.id) !== -1) {
							// remove the item from the current items list
							currentItems.splice(currentItems.indexOf(change.id), 1);

							fn({
								type: "unmatch",
								id: change.id
							});
						}
					}
					else if(change.type == "remove" && currentItems.indexOf(change.id) !== -1) {
						// remove the item from the current items list
						currentItems.splice(currentItems.indexOf(change.id), 1);

						fn({
							type: "remove",
							id: change.id
						});
					}
				});
			});
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
		this.emit("change", {
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
		this.emit("change", {
			type: "remove",
			id
		});
	}
}

module.exports = PoolStore;
