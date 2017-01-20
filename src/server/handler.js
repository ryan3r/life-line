/**
 * Handle routing on the server side
 */

var Request = require("./request");
var path = require("path");
var dataStore = require("./data-store");
var auth = require("./auth");

// route requests to the proper handlers
exports.handler = function(req, res) {
	// wrap the request
	var request = new Request(req);
	var response;

	// the data api
	if(request.url.substr(0, 10) == "/api/data/") {
		response = dataStore.handle(request.url.substr(10), request);
	}
	// the login api
	else if(request.url.substr(0, 10) == "/api/auth/") {
		response = auth.handle(request.url.substr(10), request);
	}
	// serve static pages
	else if(request.url.substr(0, 8) == "/static/") {
		response = lifeLine.Response.sendFile(
			path.join(__dirname, "..", "..", "static", request.url.substr(8))
		);
	}
	// serve the index page
	else {
		response = lifeLine.Response.sendFile(
			path.join(__dirname, "..", "..", "static", "index.html")
		);
	}

	// send the response when the promise resolves
	Promise.resolve(response)
		.catch(err => new lifeLine.Response({ status: 500, body: err.stack }))
		.then(response => response.$send(request, res));
};
