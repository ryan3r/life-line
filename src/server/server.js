var http = require("http");
var https = require("https");
var fs = require("fs");
var path = require("path");
var pkg = require("../../package.json");
var handler = require("./handler");

require("../common/global");
require("./global");

// start the server
module.exports = function(opts = {}) {
	// make the value globally accessable
	lifeLine.devMode = opts.devMode;
	// store the version
	lifeLine.version = pkg.version;

	var server;

	// secure mode
	if(opts.certs) {
		// load the keys
		var keys = {
			key: fs.readFileSync(path.join(opts.certs, "key.pem")),
			cert: fs.readFileSync(path.join(opts.certs, "cert.pem"))
		};

		server = https.createServer(keys, handler);
	}
	// plain old http
	else {
		server = http.createServer(handler);
	}

	// build the params for server.listen()
	var startParams = [opts.port];

	if(opts.localhost) {
		startParams.push("localhost");
	}

	startParams.push(() => console.log("Server started"));

	// start the server
	server.listen.apply(server, startParams);
};
