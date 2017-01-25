var http = require("http");
var https = require("https");
var fs = require("fs");
var path = require("path");
var reqHandler = require("./handler").handler;
var pkg = require("../../package.json");

require("../common/global");
require("./global");

// start the server
module.exports = function(devMode) {
	// make the value globally accessable
	lifeLine.devMode = devMode;
	// store the version
	lifeLine.version = pkg.version;

	// dev mode
	if(devMode) {
		server = http.createServer(reqHandler);

		// start the server
		server.listen(8080, "localhost", () => console.log("Listening on localhost"));
	}
	// production
	else {
		// load the keys
		var keys = {
			key: fs.readFileSync(path.join(__dirname, "../cert/key.pem")),
			cert: fs.readFileSync(path.join(__dirname, "../cert/cert.pem"))
		};

		server = https.createServer(keys, reqHandler);

		// start the server
		server.listen(443, () => console.log("Server started"));
	}
};
