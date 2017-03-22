/**
 * Handle routing on the server side
 */

var path = require("path");
var Request = require("./request");
var adaptorServer = require("./data-stores/server");
var auth = require("./auth");
var backup = require("./backup");
var Response = require("./response");
var jsend = require("./jsend");
var {apiKeys} = require("./data-stores");
var reminders = require("./reminders");

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
	// send the publicKey to the users
	else if(request.url == "/api/public-key") {
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

		   return apiKeys.get("publicKey")

		   .then(key => {
			   // no public key generated
			   if(!key) {
				   return new Response({
					   status: 404,
					   body: "Public key is missing"
				   });
			   }

			   // the = padding that should be on the base64 encoded key
			    var padding = "=".repeat((4 - key.length % 4) % 4);

				// convert the url safe encoded string to a propper one
				key = key
					.replace(/-/g, "+")
					.replace(/_/g, "/");

				// decode the base64
				var keyBuffer = new Buffer(key + padding, "base64");

			   return new Response({
				   body: keyBuffer
			   });
		   });
		});
	}
	// set the subscription for the user
	else if(request.url == "/api/subscription") {
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

		   return request.json();
	   })

	   .then(sub => {
		   // set the subscription
		   reminders.setSubscription(sub);

		   return new Response({
			   status: 204
		   });
	   });
	}
	// serve static pages
	else if(request.url.substr(0, 8) == "/static/" || request.url == "/service-worker.js") {
		// get the file name
		let file = request.url == "/service-worker.js" ?
			"service-worker.js" :
			request.url.substr(8);

		response = Response.sendFile(
			path.join(__dirname, "..", "..", "static", file)
		);
	}
	// serve the index page
	else {
		response = Response.sendFile(
			path.join(__dirname, "..", "..", "static", "index.html")
		);
	}

	// send the response when the promise resolves
	Promise.resolve(response)
		// no response returned
		.then(response => response || (new Response({ status: 500, body: NO_RESPONSE })))

		// there was an internal error
		.catch(err => {
			// get the stack if its an error
			err = typeof err == "string" ? err : err.stack;

			// log the error to the console
			console.log(err);

			return jsend.error(err);
		})

		// send the response
		.then(response => response.$send(request, res));
};
