/**
 * Work with data stores
 */

const DEBOUNCE_TIME = 2000;
const DATA_STORE_ROOT = "/api/data/";

var idb = require("idb");

// all valid data stores
const DATA_STORES = ["assignments"];
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
		this._db = idb.open("data-stores", 1, db => {
			// upgrade or create the db
			switch(db.oldVersion) {
				// NOTE: We want cases to fall through so all setup is completed
				case 0:
					for(let name of DATA_STORES)
						db.createObjectStore(name, { keyPath: "id" });
			}
		});
	}

	// set the function to deserialize all data from the server
	setInit(fn) {
		this._deserializer = fn;
	}

	// get all the items and listen for any changes
	getAll(fn) {
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
			this.partialEmit("sync", skips);
		};

		// don't wait to send the changes to the server
		if(opts.saveNow) save();
		else debounce(`${this.name}/${value.id}`, save);

		// emit a change
		this.partialEmit("change", skips);
	}

	// remove a value from the store
	remove(id, skips) {
		// remove the value from the cache
		delete this._cache[id];

		// delete the item
		// load items from idb
		this._db.then(db => {
			db.transaction(this.name, "readwrite")
			.objectStore(this.name)
			.delete(id);
		});

		// emit a change
		this.partialEmit("change", skips);

		// sync the changes to the server
		this.partialEmit("sync", skips);
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

			// save the item in the db
			this._db.then(db => {
				db.transaction(this.name, "readwrite")
					.objectStore(this.name)
					.put(value);
			});

			// clear the timer
			clearTimeout(timer);

			// remove the timer from the list
			delete debounceTimers[timer];

			// sync the changes to the server
			this.emit("sync");
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
