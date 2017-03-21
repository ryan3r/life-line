/**
 * Instantiate all the data stores
 */

var HttpAdaptor = require("../../common/data-stores/http-adaptor");
var PoolStore = require("../../common/data-stores/pool-store");
var Syncer = require("../../common/data-stores/syncer");
var IdbAdaptor = require("./idb-adaptor");

var initItem = item => {
	// instantiate the date
	if(item.date) {
		item.date = new Date(item.date);
	}
};

// create a syncer
var assignmentsAdaptor = new Syncer({
	remote: new HttpAdaptor("/api/data/"),
	local: new IdbAdaptor("assignments"),
	changeStore: new IdbAdaptor("sync-store")
});

exports.assignments = new PoolStore(assignmentsAdaptor, initItem);

// check our access level
assignmentsAdaptor.accessLevel()

.then(level => {
	// we are logged out
	if(level == "none") {
		lifeLine.nav.navigate("/login");
	}
});

var progress;

// start the sync
assignmentsAdaptor.on("sync-start", () => progress = new lifeLine.Progress())
// update the progress
assignmentsAdaptor.on("progress", value => progress.set(value));
// the sync is done
assignmentsAdaptor.on("sync-complete", value => progress.set(1));

// trigger a sync
lifeLine.sync = function() {
	// trigger a sync
	return assignmentsAdaptor.sync()

	// force a refesh
	.then(() => lifeLine.nav.navigate(location.pathname));
};

if(typeof window == "object") {
	// initial sync
	setTimeout(() => lifeLine.sync());

	// sync when we revisit the page
	window.addEventListener("visibilitychange", () => {
		if(!document.hidden) {
			lifeLine.sync();
		}
	});

	// sync when we reconnect
	window.addEventListener("online", () => {
		lifeLine.sync();
	});
}
