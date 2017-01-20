// create the global object
require("../common/global");
require("./global");

// load all the widgets
require("./widgets/sidebar");
require("./widgets/content");
require("./widgets/link");

// load all the views
var listViews = require("./views/lists");
require("./views/item");
require("./views/edit");
require("./login");

// set up the data store
var {store} = require("./data-store");

store("assignments").setInit(function(item) {
	// parse the date
	if(typeof item.date == "string") {
		item.date = new Date(item.date);
	}
});

// instantiate the dom
lifeLine.makeDom({
	parent: document.body,
	group: [
		{ widget: "sidebar" },
		{ widget: "content" }
	]
});

// add list views to the navbar
listViews.initNavBar();

// create a new assignment
lifeLine.addCommand("New assignment", () => {
	var id = Math.floor(Math.random() * 100000000);

	lifeLine.nav.navigate("/edit/" + id);
});

// create the logout button
lifeLine.addCommand("Logout", () => lifeLine.logout());
