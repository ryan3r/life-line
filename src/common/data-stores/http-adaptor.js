/**
 * An adaptor for http based stores
 */

if(typeof window != "object") {
	// polyfill fetch for node
	fetch = require("node-fetch");
}

class HttpAdaptor {
	constructor(opts) {
		// if we are just given a string use it as the source
		if(typeof opts == "string") {
			opts = {
				src: opts
			};
		}

		// save the options
		this._opts = opts;
	}

	// create the options for a fetch request
	_createOpts() {
		var opts = {};

		// use the session cookie we were given
		if(this._opts.session) {
			opts.headers = {
				cookie: `session=${this._opts.session}`
			};
		}
		// use the creadentials from the browser
		else {
			opts.credentials = "include";
		}

		return opts;
	}

	/**
	 * Get all the values in a store
	 */
	getAll() {
		return fetch(this._opts.src, this._createOpts())

		// parse the json response
		.then(res => {
			// server/service worker error
			if(res.status == 500) {
				return res.text()

				.then(msg => {
					throw new Error(msg);
				});
			}

			return res.json();
		})

		.then(json => {
			// an error occured on the server
			if(json.status == "error") {
				throw new Error(json.data);
			}

			return json;
		});
	}

	/**
	 * Get a single value
	 */
	get(key) {
		return fetch(this._opts.src + "value/" + key, this._createOpts())

		.then(res => {
			// not logged in
			if(res.status == 403) {
				let error = new Error("Not logged in");

				// add an error code
				error.code = "not-logged-in";

				throw error;
			}

			// no such item
			if(res.status == 404) {
				return undefined;
			}

			// server/service worker error
			if(res.status == 500) {
				return res.text()

				.then(msg => {
					throw new Error(msg);
				});
			}

			// parse the item
			return res.json();
		})

		.then(json => {
			// an error occured on the server
			if(json && json.status == "error") {
				throw new Error(json.data);
			}

			return json;
		});
	}

	/**
	 * Store an value on the server
	 */
	set(value) {
		var fetchOpts = this._createOpts();

		// add the headers to the default headers
		fetchOpts.method = "PUT";
		fetchOpts.body = JSON.stringify(value);

		// send the item
		return fetch(this._opts.src + "value/" + value.id, fetchOpts)

		.then(res => {
			// not logged in
			if(res.status == 403) {
				let error = new Error("Not logged in");

				// add an error code
				error.code = "not-logged-in";

				throw error;
			}

			// server/service worker error
			if(res.status == 500) {
				return res.text()

				.then(msg => {
					throw new Error(msg);
				});
			}

			// parse the error message
			if(res.status != 304) {
				return res.json();
			}
		})

		.then(json => {
			// an error occured on the server
			if(json.status == "error") {
				throw new Error(json.data);
			}

			return json;
		});
	}

	/**
	 * Remove the value from the store
	 */
	remove(key) {
		var fetchOpts = this._createOpts();

		// add the headers to the default headers
		fetchOpts.method = "DELETE";

		// send the item
		return fetch(this._opts.src + "value/" + key, fetchOpts)

		.then(res => {
			// not logged in
			if(res.status == 403) {
				let error = new Error("Not logged in");

				// add an error code
				error.code = "not-logged-in";

				throw error;
			}

			// server/service worker error
			if(res.status == 500) {
				return res.text()

				.then(msg => {
					throw new Error(msg);
				});
			}

			// parse the error message
			if(res.status != 304) {
				return res.json();
			}
		})

		.then(json => {
			// an error occured on the server
			if(json.status == "error") {
				throw new Error(json.data);
			}

			return json;
		});
	}

	// check our access level
	accessLevel() {
		return fetch(this._opts.src + "access", this._createOpts())
			// the response is just a string
			.then(res => res.text());
	}
}

module.exports = HttpAdaptor;
