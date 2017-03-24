/**
 * A data store which contains a pool of objects which are queryable by any property
 */

var EventEmitter = require("../util/event-emitter");

class PoolStore extends EventEmitter {
	constructor(adaptor, initFn) {
		super();
		this._adaptor = adaptor;
		this._initFn = initFn;
	}

	/**
	 * Get all items matcing the provided properties
	 */
	query(props, fn) {
		// check if a value matches the query
		var filter = value => {
			// not an item
			if(!value) return false;

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

		// get all current items that match the filter
		var current = ("id" in props) ?
			this._adaptor.get(props.id).then(value => [value]):
			this._adaptor.getAll();

		current = current.then(values => {
			// filter out the values
			values = values.filter(filter);

			// do any initialization
			if(this._initFn) {
				values = values.map(value => this._initFn(value) || value);
			}

			return values;
		});

		// optionaly run changes through the query as well
		if(typeof fn == "function") {
			let subscription, stopped;

			// wrap the values in change objects and send the to the consumer
			current.then(values => {
				// don't listen if unsubscribe was already called
				if(stopped) return;

				// send the values we currently have
				fn(values.slice(0));

				// watch for changes after the initial values are send
				subscription = this.on("change", change => {
					// find the previous value
					var index = values.findIndex(value => value.id == change.id);

					if(change.type == "change") {
						// check if the value matches the query
						let matches = filter(change.value);

						if(matches) {
							// freshly created
							if(index === -1) {
								let {value} = change;

								// do any initialization
								if(this._initFn) {
									value = this._initFn(value) || value;
								}

								values.push(value);
							}
							// update an existing value
							else {
								values[index] = change.value;
							}

							fn(values.slice(0));
						}
						// tell the consumer this value no longer matches
						else if(index !== -1) {
							// remove the item
							if(index !== -1) {
								values.splice(index, 1);
							}

							fn(values.slice(0));
						}
					}
					else if(change.type == "remove" && index !== -1) {
						// remove the item
						if(index !== -1) {
							values.splice(index, 1);
						}

						fn(values.slice(0));
					}
				});
			});

			return {
				unsubscribe() {
					// if we are listening stop
					if(subscription) {
						subscription.unsubscribe()
					}

					// don't listen
					stopped = true;
				}
			}
		}
		else {
			return current;
		}
	}

	/**
	 * Store a value in the pool
	 */
	set(value) {
		// set the modified date
		value.modified = Date.now();

		// store the value in the adaptor
		var result = this._adaptor.set(value);

		// propogate the change
		this.emit("change", {
			type: "change",
			id: value.id,
			value
		});

		return result;
	}

	/**
	 * Remove a value from the pool
	 */
	remove(id) {
		// remove the value from the adaptor
		var result = this._adaptor.remove(id, Date.now());

		// propogate the change
		this.emit("change", {
			type: "remove",
			id
		});

		return result;
	}
}

module.exports = PoolStore;
