/**
 * Work with data stores
 */

const DEBOUNCE_TIME = 2000;
const DATA_STORE_ROOT = "/api/data/";

// cache data store instances
var stores = {};

// get/create a datastore
exports.store = function(name) {
	// use the cached store
	if(name in stores) {
		return stores[name];
	}

	var store = new Store(name);

	// cache the data store instance
	stores[name] = store;

	return store;
};

class Store extends lifeLine.EventEmitter {
	constructor(name) {
		super();
		this.name = name;
		this._cache = {};
		// don't send duplicate requests
		this._requesting = [];
	}

	// set the function to deserialize all data from the server
	setInit(fn) {
		this._deserializer = fn;
	}

	// send a request to the server
	_request(method, url, body) {
		url = DATA_STORE_ROOT + url;

		// don't duplicate requests
		if(method == "get") {
			// already making this request
			if(this._requesting.indexOf(url) !== -1) return;

			this._requesting.push(url);
		}

		// make the actual request
		return fetch(url, {
			method: method,
			credentials: "include",
			body: body && JSON.stringify(body)
		})

		// parse the response
		.then(res => res.json())

		.then(res => {
			// remove the lock
			if(method == "get") {
				var index = this._requesting.indexOf(url);

				if(index !== -1) this._requesting.splice(index, 1);
			}

			// update the cache and emit a change
			if(res.status == "success" && method == "get") {
				// store the value in the cache
				if(Array.isArray(res.data)) {
					res.data.forEach(item => {
						// deserialize the item
						if(this._deserializer) {
							item = this._deserializer(item) || item;
						}

						// store teh item
						this._cache[item.id] = item
					});
				}
				else {
					let item = res.data;

					// deserialize the item
					if(this._deserializer) {
						item = this._deserializer(item) || item;
					}

					this._cache[res.data.id] = item;
				}

				// emit a change
				this.emit("change");
			}

			// throw the error
			if(res.status == "error") {
				throw new Error(res.data);
			}

			// the user is not logged in
			if(res.status == "fail" && res.data.reason == "logged-out") {
				lifeLine.login();
			}
		});
	}

	// get all the items and listen for any changes
	getAll(fn) {
		// go to the cache first
		fn(arrayFromObject(this._cache));

		// send a request to the server for the items
		this._request("get", this.name);

		// listen for any changes
		return this.on("change", () => {
			// the changes will we in the cache
			fn(arrayFromObject(this._cache));
		});
	}

	// get a single item and listen for changes
	get(id, fn) {
		// go to the cache first
		fn(this._cache[id]);

		// send a request to the server for the item
		this._request("get", this.name + "/" + id);

		// listen for any changes
		return this.on("change", () => {
			fn(this._cache[id]);
		});
	}

	// store a value in the store
	set(value, skips) {
		// store the value in the cache
		this._cache[value.id] = value;

		// save the item
		debounce(value.id, () => {
			this._request("put", `${this.name}/${value.id}`, value);
		});

		// emit a change
		this.partialEmit("change", skips);
	}

	// remove a value from the store
	remove(id, skips) {
		// remove the value from the cache
		delete this._cache[id];

		// send the delete request
		this._request("delete", `${this.name}/${id}`);

		// emit a change
		this.partialEmit("change", skips);
	}
}

// get an array from an object
var arrayFromObject = function(obj) {
	return Object.getOwnPropertyNames(obj)
		.map(name => obj[name]);
};

// don't call a function too often
var debounceTimers = {};

var debounce = (id, fn) => {
	// cancel the previous delay
	clearTimeout(debounceTimers[id]);
	// start a new delay
	debounceTimers[id] = setTimeout(fn, DEBOUNCE_TIME);
};
