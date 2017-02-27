/**
 * Handle routing on the server side
 */

var path = require("path");
var Request = require("./request");
var adaptorServer = require("./data-stores/server");
var auth = require("./auth");
var backup = require("./backup");
var Response = require("./response");

const NO_RESPONSE = "No response returned by the handler";

// route requests to the proper handlers
module.exports = function(req, res) {
	// wrap the request
	var request = new Request(req);
	var response;

	// the data api
	if(request.url.substr(0, 10) == "/api/data/") {
		response = adaptorServer(request.url.substr(9), request);
	}
	// the login api
	else if(request.url.substr(0, 10) == "/api/auth/") {
		response = auth.handle(request.url.substr(10), request);
	}
	// create and send the archive
	else if(request.url.substr(0, 11) == "/api/backup") {
		// verify the user
		response = auth.getLoggedInUser(request)

		.then(user => {
			 // not logged in
			if(!user) {
				return new Response({
					status: 401,
					body: "Not authenticated"
				});
			}

			return new Response({
				extension: ".zip",
				body: backup()
			});
		});
	}
	// serve static pages
	else if(request.url.substr(0, 8) == "/static/" || request.url == "/service-worker.js") {
		// get the file name
		let file = request.url == "/service-worker.js" ?
			"service-worker.js" :
			request.url.substr(8);

		response = lifeLine.Response.sendFile(
			path.join(__dirname, "..", "..", "static", file)
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
		// no response returned
		.then(response => response || (new lifeLine.Response({ status: 500, body: NO_RESPONSE })))

		// there was an internal error
		.catch(err => {
			// get the stack if its an error
			err = typeof err == "string" ? err : err.stack;

			// log the error to the console
			console.log(err);

			return lifeLine.jsend.error(err);
		})

		// send the response
		.then(response => response.$send(request, res));
};
