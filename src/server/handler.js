/**
 * Handle routing on the server side
 */

var path = require("path");

import Request from "./request";
import * as dataStore from "./data-store";
import * as auth from "./auth";
import backup from "./backup";
import Response from "./response";

const NO_RESPONSE = "No response returned by the handler";

// route requests to the proper handlers
export function handler(req, res) {
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
	// create and send the archive
	else if(request.url.substr(0, 11) == "/api/backup") {
		response = new Response({
			extension: ".zip",
			body: backup()
		});
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
		// no response returned
		.then(response => response || (new lifeLine.Response({ status: 500, body: NO_RESPONSE })))

		// there was an internal error
		.catch(err => {
			// get the stack if its an error
			err = typeof err == "string" ? err : err.stack;

			// log the error to the console
			console.log(err);

			return new lifeLine.jsend.error(err);
		})

		// send the response
		.then(response => response.$send(request, res));
};
