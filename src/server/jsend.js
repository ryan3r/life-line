/**
 * JSend for the server side
 */

var crypto = require("crypto");
var Request = require("./request");

// shortcuts for the jsend methods
exports.success = data => exports.jsend("success", data);
exports.fail = msg => exports.jsend("fail", msg);
exports.error = err => exports.jsend("error", err instanceof Error ? err.message : err);

// create a jsend response
exports.jsend = function(status, data) {
	// build the jsend message
	var msg = {
		status: status,
		data: data
	};

	// stringify the json
	if(lifeLine.devMode) {
		// format it in dev mode
		msg = JSON.stringify(msg, null, 4);
	}
	else {
		msg = JSON.stringify(msg);
	}

	// hash the data
	var hash = crypto.createHash("sha1")
		.update(msg)
		.digest("hex");

	// make the response
	return new lifeLine.Response({
		headers: {
			etag: hash
		},
		extension: ".json",
		body: msg,

		// a hook for just before sending the response
		$presend(req) {
			// send not modified
			if(req.headers.ifNoneMatch == hash) {
				this.status = 304;
			}
		}
	});
};

// attach the jsend handler
Request.prototype.jsend = function() {
	return this.json()

	.then(body => {
		// throw the error
		if(body.status == "error") {
			throw new Error(body.data);
		}

		return {
			success: body.status == "success",
			data: body.data
		};
	});
};
