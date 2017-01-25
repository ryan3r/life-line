/**
 * JSend for the server side
 */

// shortcuts for the jsend methods
export var success = data => exports.jsend("success", data);
export var fail = msg => exports.jsend("fail", msg);
export var error = err => exports.jsend("error", err instanceof Error ? err.message : err);

// create a jsend response
export var jsend = function(status, data) {
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

	// make the response
	return new lifeLine.Response({
		extension: ".json",
		body: msg
	});
};
