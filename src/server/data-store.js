/**
 * A collection of data stores
 */

var fs = require("fs-promise");
var path = require("path");

// the data storage directory
var dataDir;

// the dir has been configured
var _readyResolve;
var ready = new Promise(resolve => _readyResolve = resolve);

exports.setDataDir = dir => {
	dataDir = dir;

	// ensure the data dir has been created
	if(!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir);
	}

	_readyResolve();
}

// web accessable data stores
const WEB_ACCESSABLE = ["assignments"];

// the http handler for data stores
exports.handle = function(url, req) {
	var auth = require("./auth");

	return auth.getLoggedInUser(req)

	.then(user => {
		// not logged in
		if(!user) return lifeLine.jsend.fail({ reason: "logged-out" });

		// send an array of items to save or delete
		if(req.method == "POST") {
			// recieve and process changes from the server
			return req.json()

			.then(({changes, modifieds}) => {
				// apply the changes individualy
				var changePromises = changes.map(change => {
					// don't allow web services to access users or sessions
					if(WEB_ACCESSABLE.indexOf(change.store) === -1) {
						return { code: "access-denied" };
					}

					var store = dataStore(change.store);

					// create an item
					if(change.type == "create") {
						// save the date we recieved the item on
						change.data.recieved = Date.now();

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
									store: change.store,
									id: change.data.id,
									code: "item-deleted"
								};
							}

							// we have a newer version
							if(local.modified > change.data.modified) {
								return {
									store: change.store,
									id: change.data.id,
									code: "newer-version",
									data: local
								};
							}

							// save the date we recieved the item on
							change.data.recieved = Date.now();

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
									store: change.store,
									id: change.id,
									code: "newer-version",
									data: local
								};
							}

							// delete the item
							return store.delete(change.id);
						});
					}
				});

				var changeResult = Promise.all(changePromises).then(result => {
					// remove successes (undefineds)
					return result.filter(result => result);
				});

				// collect items that have changed since the last access
				var pushedItems = Promise.all(
					Object.getOwnPropertyNames(modifieds)

					.map(storeName => {
						// open the data store
						var store = dataStore(storeName);

						return store.getAll()

						.then(items => {
							var _modifieds = modifieds[storeName];
							// changes to update the client to our state
							var pushes = [];

							items.forEach(item => {
								// item not in the client or the local is newer
								if(!_modifieds[item.id] || _modifieds[item.id] < item.modified) {
									// don't send a delete if the item was just deleted
									let deleted = changes.find(change =>
										change.type == "delete" && change.id == item.id);

									if(!deleted) {
										pushes.push({
											code: "newer-version",
											id: item.id,
											store: storeName,
											data: item
										});
									}
								}

								// remove items that exist on the server
								delete _modifieds[item.id]
							});

							// delete any items that are not on the server
							Object.getOwnPropertyNames(_modifieds)

							.forEach(id => {
								// don't send a delete if the item was just created
								var created = changes.find(change =>
									change.type == "create" && change.data.id == id);

								if(!created) {
									pushes.push({
										id: id,
										store: storeName,
										code: "item-deleted"
									});
								}
							});

							return pushes;
						});
					})
				)

				// combine pushes from all data stores
				.then(results => results.reduce((a, b) => a.concat(b), []));

				return Promise.all([pushedItems, changeResult])

				.then(changes => {
					return lifeLine.jsend.success(
						// combine the pushed items and the change responses
						changes[0].concat(changes[1])
					)
				});
			});
		}
	});
};

// the cache for data stores
var storeCache = new Map();

// get a data store instance
var dataStore = function(name) {
	// use the cached version
	if(storeCache.has(name)) {
		return storeCache.get(name);
	}

	var store = new Store(name);

	// cache the refrence
	storeCache.set(name, store);

	return store;
};

exports.store = dataStore;

// an instance of a data store
var Store = class {
	constructor(name) {
		this.name = name;

		ready.then(() => {
			// ensure the data store exists
			if(!fs.existsSync(path.join(dataDir, name))) {
				fs.mkdirSync(path.join(dataDir, name));
			}
		});
	}

	// get the entire contents of a data store
	getAll() {
		return fs.readdir(path.join(dataDir, this.name))

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
		return fs.readFile(path.join(dataDir, this.name, key + ".json"), "utf8")

		// parse the data
		.then(data => data && JSON.parse(data))

		// swallow not found errors
		.catch(() => {});
	}

	// store a value
	set(key, value) {
		// serialize the json
		var raw = typeof value == "string" ? value : JSON.stringify(value);

		return fs.writeFile(path.join(dataDir, this.name, key + ".json"), raw);
	}

	// delete a value
	delete(key) {
		return fs.unlink(path.join(dataDir, this.name, key + ".json"));
	}
};
