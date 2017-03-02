/**
 * An indexed db adaptor
 */

var idb = require("idb");

const VALID_STORES = ["assignments", "sync-store"];

// open/setup the database
var dbPromise = idb.open("data-stores", 3, db => {
	// upgrade or create the db
	if(db.oldVersion < 1)
		db.createObjectStore("assignments", { keyPath: "id" });
	if(db.oldVersion < 2)
		db.createObjectStore("sync-store", { keyPath: "id" });

	// the version 2 sync-store had a different structure that the version 3
	if(db.oldVersion == 2) {
		db.deleteObjectStore("sync-store");
		db.createObjectStore("sync-store", { keyPath: "id" });
	}
});

class IdbAdaptor {
	constructor(name) {
		this.name = name;

		// check the store is valid
		if(VALID_STORES.indexOf(name) === -1) {
			throw new Error(`The data store ${name} is not in idb update the db`);
		}
	}

	// create a transaction
	_transaction(readWrite) {
		return dbPromise.then(db => {
			return db
				.transaction(this.name, readWrite && "readwrite")
				.objectStore(this.name);
		});
	}

	/**
	 * Get all the values in the object store
	 */
	getAll() {
		return this._transaction()
			.then(trans => trans.getAll());
	}

	/**
	 * Get a specific value
	 */
	get(key) {
		return this._transaction()
			.then(trans => trans.get(key));
	}

	/**
	 * Store a value in idb
	 */
	set(value) {
		return this._transaction(true)
			.then(trans => trans.put(value));
	}

	/**
	 * Remove a value from idb
	 */
	remove(key) {
		return this._transaction(true)
			.then(trans => trans.delete(key));
	}
}

module.exports = IdbAdaptor;
