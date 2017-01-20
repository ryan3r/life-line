/**
 * A wrapper for request that contains useful methods
 */

 var urlLib = require("url");
 var querystring = require("querystring");

module.exports = class {
	constructor(req) {
		this._req = req;
		this.method = req.method;

		// parse the url and query
		var parsed = urlLib.parse(req.url);
		this.url = parsed.pathname;
		this.query = querystring.parse(parsed.query);

		// copy headers and convert to camel case
		this.headers = {};

		for(let key of Object.getOwnPropertyNames(req.headers)) {
			// convert dash cae to camel case
			let camelName = key.replace(/-\w/g, char => char.charAt(1).toUpperCase());

			// copy over properties
			this.headers[camelName] = req.headers[key];
		}

		// parse the cookies
		this.cookies = {};

		if(this.headers.cookie) {
			// separate the individual cookies
			var rawCookies = this.headers.cookie.split(";");

			for(let rawCookie of rawCookies) {
				// parse the cookie
				let match = rawCookie.match(/^\s*(.+?)\s*=\s*(.+?)\s*$/);

				if(match) {
					this.cookies[match[1]] = match[2];
				}
			}
		}
	}

	// get a promise for the response body
	body() {
		return new Promise((resolve, reject) => {
			// collect the request body
			var body = "";

			// make sure the stream returns strings
			this._req.setEncoding("utf8");

			// recieve the data
			this._req.on("data", data => body += data);

			// the entire body has been recieved
			this._req.on("end", () => resolve(body));

			// some error occured in the request
			this._req.on("error", reject);
		});
	}

	// parse a json request body
	json() {
		return this.body()
			.then(body => JSON.parse(body));
	}
};
