var http = require("http");
var https = require("https");
var fs = require("fs");
var path = require("path");
var handler = require("./handler");
var {config} = require("./data-stores");

// start the server
module.exports = function() {
	var server;

	return config.get("certs")

	.then(certs => {
		// secure mode
		if(certs) {
			// load the keys
			var keys = {
				key: fs.readFileSync(path.join(certs, "key.pem")),
				cert: fs.readFileSync(path.join(certs, "cert.pem"))
			};

			server = https.createServer(keys, handler);
		}
		// plain old http
		else {
			server = http.createServer(handler);
		}

		return Promise.all([
			config.get("port", 443),
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
