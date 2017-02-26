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

exports.assignments = new PoolStore(new HttpAdaptor("/api/data/"), initItem);
