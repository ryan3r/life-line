/**
 * A resonse object to promote a more functional style for nodejs
 */

var mimedb = require("mime-db");
var fs = require("fs-promise");
var crypto = require("crypto");
var path = require("path");

var Response = module.exports = class {
	constructor(opts = {}) {
		this.status = opts.status || 200;
		this.headers = opts.headers || {};
		this.extension = opts.extension || ".txt";
		this.body = opts.body;
		this.cookie = opts.cookie;
		this.$presend = opts.$presend;
	}

	// the method to send the response
	$send(req, res) {
		// a special hook so send file has access to the request
		if(this.$presend) {
			this.$presend(req);
		}

		// attach the set-cookie header
		if(this.cookie) {
			// the path by default is /
			this.cookie.path = "/";

			// stringify the cookie
			this.headers.setCookie = this.cookie.name + "=" + this.cookie.value;

			// add other cookie properties
			for(let part of Object.getOwnPropertyNames(this.cookie)) {
				// don't add name and value
				if(part == "name" || part == "value") continue;

				// add this section of the cookie
				this.headers.setCookie += ";" + part + "=" + this.cookie[part];
			}
		}

		// add the content type header
		if(this.extension && !this.headers.contentType) {
			// remove the . from the extension
			if(this.extension.charAt(0) == ".") {
				this.extension = this.extension.substr(1);
			}

			// look up the mimetype
			for(let mimetype of Object.getOwnPropertyNames(mimedb)) {
				let def = mimedb[mimetype];

				// match found
				if(def.extensions && def.extensions.indexOf(this.extension) !== -1) {
					this.headers.contentType = mimetype;

					break;
				}
			}
		}

		// convert headers back to dash case
		var headers = {
			// attach the server header
			server: lifeLine.version
		};

		for(let key of Object.getOwnPropertyNames(this.headers)) {
			// convert the name to dash case
			let dashCase = key.replace(/[A-Z]/g, char => "-" + char.toLowerCase());

			// copy over the headers
			headers[dashCase] = this.headers[key];
		}

		// send the headers
		res.writeHead(this.status, headers);

		// send the body
		res.end(this.body);
	}

	// create a redirect response
	static redirect(to) {
		return new Response({
			status: 302,
			headers: {
				location: to
			}
		});
	}

	// serve a static file
	static sendFile(src, opts = {}) {
		return fs.readFile(src, "utf8")

		// send the file
		.then(file => {
			// use caching mecanisms
			if(opts.cache !== false) {
				// hash the file
				let hash = crypto.createHash("sha1")
					.update(file)
					.digest("hex");

				return new Response({
					extension: path.extname(src),
					headers: {
						etag: hash
					},
					body: file,

					// a hook for just before sending the response
					$presend(req) {
						// send not modified
						if(req.headers.ifNoneMatch == hash) {
							this.status = 304;
						}
					}
				});
			}
			// no caching
			else {
				return new Response({
					extension: path.extname(src),
					body: file
				});
			}
		})

		// send a 404
		.catch(err => {
			return new Response({
				status: 404,
				body: "404: File not found"
			});
		});
	}
};
