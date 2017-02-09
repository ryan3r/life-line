/**
 * Work with data stores
 */

const DEBOUNCE_TIME = 2000;
const DATA_STORE_ROOT = "/api/data/";

var idb = require("idb");

// cache data store instances
var stores = {};

// get/create a datastore
export function store(name) {
	// use the cached store
	if(name in stores) {
		return stores[name];
	}

	var store = new Store(name);

	// cache the data store instance
	stores[name] = store;

	// tell any listeners the store has been created
	lifeLine.emit("data-store-created", store);

	return store;
};

class Store extends lifeLine.EventEmitter {
	constructor(name) {
		super();
		this.name = name;
		this._cache = {};
		// don't send duplicate requests
		this._requesting = [];
		// promise for the database
		this._db = idb.open("data-stores", 2, db => {
			// upgrade or create the db
			if(db.oldVersion < 1)
				db.createObjectStore("assignments", { keyPath: "id" });
			if(db.oldVersion < 2)
				db.createObjectStore("sync-store", { keyPath: "id" });
		});
	}

	// set the function to deserialize all data from the server
	setInit(fn) {
		this._deserializer = fn;
	}

	// get all the items and listen for any changes
	getAll(fn) {
		if(!fn) {
			// load items from idb
			return this._db.then(db => {
				return db.transaction(this.name)
					.objectStore(this.name)
					.getAll()
			});
		}

		// go to the cache first
		fn(arrayFromObject(this._cache));

		// load items from idb
		this._db.then(db => {
			db.transaction(this.name)
				.objectStore(this.name)
				.getAll()
				.then(all => {
					// store items in the cache
					for(let item of all) {
						this._cache[item.id] = item;
					}

					// notify listeners we loaded the data
					this.emit("change");
				});
		});

		// listen for any changes
		return this.on("change", () => {
			// the changes will we in the cache
			fn(arrayFromObject(this._cache));
		});
	}

	// get a single item and listen for changes
	get(id, fn) {
		// just load the value from idb
		if(!fn) {
			// hit the cache
			if(this._cache[id]) return Promise.resolve(this._cache[id]);

			// hit idb
			return this._db.then(db => {
				return db.transaction(this.name)
					.objectStore(this.name)
					.get(id)
					.then(item => {
						if(typeof this._deserializer == "function") {
							return this._deserializer(item) || item;
						}

						return item;
					});
			});
		}

		// go to the cache first
		fn(this._cache[id]);

		// load the item from idb
		this._db.then(db => {
			db.transaction(this.name)
				.objectStore(this.name)
				.get(id)
				.then(item => {
					if(item) {
						// store item in the cache
						this._cache[item.id] = item;

						// notify listeners we loaded the data
						this.emit("change");
					}
				});
		});

		// listen for any changes
		return this.on("change", () => {
			fn(this._cache[id]);
		});
	}

	// store a value in the store
	set(value, skips, opts = {}) {
		var isNew = !!this._cache[value.id];

		// deserialize
		if(typeof this._deserializer == "function") {
			value = this._deserializer(value) || value;
		}

		// store the value in the cache
		this._cache[value.id] = value;

		// save the item
		var save = () => {
			// save the item in the db
			this._db.then(db => {
				db.transaction(this.name, "readwrite")
					.objectStore(this.name)
					.put(value);
			});

			// sync the changes to the server
			this.partialEmit("sync-put", skips, value, isNew);
		};

		// emit a change
		this.partialEmit("change", skips);

		// don't wait to send the changes to the server
		if(opts.saveNow) return save();
		else debounce(`${this.name}/${value.id}`, save);
	}

	// remove a value from the store
	remove(id, skips) {
		// remove the value from the cache
		delete this._cache[id];

		// emit a change
		this.partialEmit("change", skips);

		// sync the changes to the server
		this.partialEmit("sync-delete", skips, id);

		// delete the item
		return this._db.then(db => {
			return db.transaction(this.name, "readwrite")
				.objectStore(this.name)
				.delete(id);
		});
	}

	// force saves to go through
	forceSave() {
		for(let timer of Object.getOwnPropertyNames(debounceTimers)) {
			// only save items from this data store
			if(timer.indexOf(`${this.name}/`) === 0) {
				continue;
			}

			// look up the timer id
			let id = timer.substr(timer.indexOf("/") + 1);
			var value = this._cache[id];

			// clear the timer
			clearTimeout(timer);

			// remove the timer from the list
			delete debounceTimers[timer];

			// don't save on delete
			if(!value) return;

			// save the item in the db
			this._db.then(db => {
				db.transaction(this.name, "readwrite")
					.objectStore(this.name)
					.put(value);
			});

			// sync the changes to the server
			this.emit("sync-put", value);
		}
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
