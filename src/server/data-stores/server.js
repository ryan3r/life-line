/**
 * Instantiate the adaptor server
 */

var createAdaptorServer = require("./adaptor-server");
var {assignments} = require("./index");
var auth = require("../auth");

// check if a user has access
var hasAccess = req => {
	return auth.getLoggedInUser(req).then(user => !!user);
};

// create the adaptor server for assignments
module.exports = createAdaptorServer(assignments._adaptor, {
	read: (key, req) => hasAccess(req),
	write: (key, req) => hasAccess(req),
	accessLevel: req => hasAccess(req).then(access => access ? "full" : "none"),
});
