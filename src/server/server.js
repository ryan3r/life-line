var http = require("http");
var https = require("https");
var fs = require("fs");
var path = require("path");
var handler = require("./handler");
var {config} = require("./data-stores");

// start the server
module.exports = function() {
	require("./reminders").start();

	var server;

	return Promise.all([
		config.get("key"),
		config.get("cert")
	])

	.then(([key, cert]) => {
		// secure mode
		if(key && cert) {
			// load the keys
			let keys = {
				key: fs.readFileSync(key),
				cert: fs.readFileSync(cert)
			};

			server = https.createServer(keys, handler);
		}
		// plain old http
		else {
			server = http.createServer(handler);
		}

		return Promise.all([
			config.get("port", key && cert ? 443 : 80),
			config.get("localhost", false),
		]);
	})

	.then(([port, localhost]) => {
		// build the params for server.listen()
		var startParams = [port];

		if(localhost) {
			startParams.push("localhost");
		}

		startParams.push(() => console.log("Server started"));

		// start the server
		server.listen.apply(server, startParams);
	});
};
