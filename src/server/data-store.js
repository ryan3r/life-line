/**
 * A collection of data stores
 */

var levelup = require("levelup");
var path = require("path");
var fs = require("fs");

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
	var store = new Store(storeName);

	return auth.getLoggedInUser(req)

	.then(user => {
		// not logged in
		if(!user) return lifeLine.jsend.fail({ reason: "logged-out" });

		// get the entire data store
		if(!key) {
			return store.getAll()
				.then(data => lifeLine.jsend.success(data));
		}

		// get a value
		if(req.method == "GET") {
			return store.get(key)
				.then(data => lifeLine.jsend.success(data));
		}
		// store a value
		else if(req.method == "PUT") {
			return req.json()

			// store the value
			.then(data => store.put(key, data))

			// convert to jsend
			.then(() => lifeLine.jsend.success());
		}
		// remove a value
		else if(req.method == "DELETE") {
			return store.del(key)

			// convert to jsend
			.then(() => lifeLine.jsend.success());
		}
	});
};

var dbs = new Map();

// wrap level db in a promise based api
export class Store {
	constructor(name) {
		// use an existing levelup instance
		if(dbs.has(name)) {
			this.db = dbs.get(name);
		}
		else {
			// open the database
			this.db = levelup(path.join(DATA_DIR, name), {
				valueEncoding: "json"
			});

			// cache the levelup instance
			dbs.set(name, this.db);
		}
	}

	// get all items in the database
	getAll() {
		let stream = this.db.createValueStream();
		let values = [];

		// collect the values
		stream.on("data", value => values.push(value));

		// send the values back when we are done
		return new Promise(function(resolve, reject) {
			// success
			stream.on("end", () => resolve(values));
			// error
			stream.on("error", err => reject(err));
		});
	}

	// get an item from the database
	get(key) {
		var {promise, callback} = this._createCb();

		// get the value
		this.db.get(key, callback);

		return promise;
	}

	// store an item in the database
	put(key, value) {
		var {promise, callback} = this._createCb();

		// get the value
		this.db.put(key, value, callback);

		return promise;
	}

	// remove an item from the database
	del(key) {
		var {promise, callback} = this._createCb();

		// get the value
		this.db.del(key, callback);

		return promise;
	}

	// create a callback and corrisponding Promise
	_createCb() {
		var callback;

		// wrap the callback
		var promise = new Promise(function(resolve, reject) {
			callback = function(err, value) {
				// handle error cases
				if(err) reject(err);
				else resolve(value);
			};
		});

		return {promise, callback};
	}
}
