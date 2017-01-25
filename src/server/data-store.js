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

// the http handler for data stores
export function handle(url, req) {
	var auth = require("./auth");

	// breakdown store/key
	var [storeName, key] = url.split("/");
	// get the data store
	var store =	exports.store(storeName);

	return auth.getLoggedInUser(req)

	.then(user => {
		// not logged in
		if(!user) return lifeLine.jsend.fail({ reason: "logged-out" });

		// get the entire data store
		if(!key) {
			return store.getAll()

			.then(data => {
				// convert the response to jsend
				return lifeLine.jsend.success(data);
			})
		}

		// get a value
		if(req.method == "GET") {
			return store.get(key)

			.then(data => {
				// convert the response to jsend
				if(data) return lifeLine.jsend.success(data);
				else return lifeLine.jsend.fail({ reason: "not-found" });
			});
		}
		// store a value
		else if(req.method == "PUT") {
			return req.json()

			// store the value
			.then(data => store.set(key, data))

			// convert to jsend
			.then(() => lifeLine.jsend.success());
		}
		// remove a value
		else if(req.method == "DELETE") {
			return store.delete(key)

			// convert to jsend
			.then(() => lifeLine.jsend.success());
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
