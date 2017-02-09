var http = require("http");
var https = require("https");
var fs = require("fs");
var path = require("path");
var pkg = require("../../package.json");

import {handler} from "./handler";

import "../common/global";
import "./global";

// start the server
export default function startServer(devMode) {
	// make the value globally accessable
	lifeLine.devMode = devMode;
	// store the version
	lifeLine.version = pkg.version;

	// dev mode
	if(devMode) {
		let server = http.createServer(handler);

		// start the server
		server.listen(8080, "localhost", () => console.log("Listening on localhost"));
	}
	// production
	else {
		// load the keys
		var keys = {
			key: fs.readFileSync(path.join(__dirname, "../../../cert/key.pem")),
			cert: fs.readFileSync(path.join(__dirname, "../../../cert/cert.pem"))
		};

		let server = https.createServer(keys, handler);

		// start the server
		server.listen(443, () => console.log("Server started"));
	}
};
