/**
 * A collection of data stores
 */

var fs = require("fs-promise");
var path = require("path");

// the data storage directory
const DATA_DIR = path.join(__dirname, "..", "..", "..", "life-line-data");

// ensure the data dir has been created
if(!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR);
}

// web accessable data stores
const WEB_ACCESSABLE = ["assignments"];

// the http handler for data stores
export function handle(storeName, req) {
	var auth = require("./auth");

	// get the data store
	var store =	exports.store(storeName);

	return auth.getLoggedInUser(req)

	.then(user => {
		// not logged in
		if(!user) return lifeLine.jsend.fail({ reason: "logged-out" });

		// don't allow web services to access users or sessions
		if(WEB_ACCESSABLE.indexOf(storeName) === -1) {
			return lifeLine.jsend.fail({ reason: "access-denied" });
		}

		// get all items modified since ?since
		if(req.method == "GET") {
			let since = +req.query.since || 0;

			return store.getAll()

			.then(items => {
				// filter out old items
				items = items.filter(item => item.modified > since);

				return lifeLine.jsend.success(items);
			});
		}
		// send an array of items to save or delete
		else if(req.method == "POST") {
			return req.json()

			.then(changes => {
				// apply the changes individualy
				return Promise.all(
					changes.map(change => {
						// create an item
						if(change.type == "create") {
							return store.set(change.data.id, change.data);
						}
						// put an item
						else if(change.type == "put") {
							// get the existing version of this item
							return store.get(change.data.id)

							.then(local => {
								// if an item is put it does must exist on the
								// server or it has been deleted
								if(!local) {
									return {
										id: change.data.id,
										code: "item-deleted"
									};
								}

								// we have a newer version
								if(local.modified > change.data.modified) {
									return {
										id: change.data.id,
										code: "newer-version",
										data: local
									};
								}

								// save the changes
								return store.set(change.data.id, change.data);
							});
						}
						// delete an item
						else if(change.type == "delete") {
							// get the existing version of this item
							return store.get(change.id)

							.then(local => {
								// already go no problem
								if(!local) return;

								// make sure it has not been modified since the delete
								if(local.modified > change.timestamp) {
									return {
										id: change.id,
										code: "newer-version",
										data: local
									};
								}

								// delete the item
								return store.delete(change.id);
							});
						}
					})
				)

				.then(result => {
					// remove successes (undefineds)
					result = result.filter(result => result);

					return lifeLine.jsend.success(result);
				});
			});
		}
	});
};

// the cache for data stores
var storeCache = new Map();

// get a data store instance
export function store(name) {
	// use the cached version
	if(storeCache.has(name)) {
		return storeCache.get(name);
	}

	var store = new Store(name);

	// cache the refrence
	storeCache.set(name, store);

	return store;
};

// an instance of a data store
var Store = class {
	constructor(name) {
		this.name = name;

		// ensure the data store exists
		if(!fs.existsSync(path.join(DATA_DIR, name))) {
			fs.mkdirSync(path.join(DATA_DIR, name));
		}
	}

	// get the entire contents of a data store
	getAll() {
		return fs.readdir(path.join(DATA_DIR, this.name))

		.then(files => {
			return Promise.all(
				files.map(key => {
					// remove the .json
					key = key.substr(0, key.length - 5);

					return this.get(key);
				})
			);
		});
	}

	// get a stored value
	get(key) {
		return fs.readFile(path.join(DATA_DIR, this.name, key + ".json"), "utf8")

		// parse the data
		.then(data => data && JSON.parse(data))

		// swallow not found errors
		.catch(() => {});
	}

	// store a value
	set(key, value) {
		// serialize the json
		var raw = typeof value == "string" ? value : JSON.stringify(value);

		return fs.writeFile(path.join(DATA_DIR, this.name, key + ".json"), raw);
	}

	// delete a value
	delete(key) {
		return fs.unlink(path.join(DATA_DIR, this.name, key + ".json"));
	}
};
