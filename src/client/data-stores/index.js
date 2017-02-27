/**
 * Instantiate all the data stores
 */

var HttpAdaptor = require("../../common/data-stores/http-adaptor");
var PoolStore = require("../../common/data-stores/pool-store");

var initItem = item => {
	// instantiate the date
	if(item.date) {
		item.date = new Date(item.date);
	}
};

var assignmentsAdaptor = new HttpAdaptor("/api/data/");

exports.assignments = new PoolStore(assignmentsAdaptor, initItem);

// check our access level
assignmentsAdaptor.accessLevel()

.then(level => {
	// we are logged out
	if(level == "none") {
		lifeLine.nav.navigate("/login");
	}
});
