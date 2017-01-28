// create the global object
import "../common/global";
import "./global";

// load all the widgets
import "./widgets/sidebar";
import "./widgets/content";
import "./widgets/link";
import "./widgets/list";
import "./widgets/input";

// load all the views
import {initNavBar} from "./views/lists";
import "./views/item";
import "./views/edit";
import "./views/login";
import "./views/account";
import "./views/users";

// set up the data store
import {store} from "./data-store";

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
initNavBar();

// create a new assignment
lifeLine.addCommand("New assignment", () => {
	var id = Math.floor(Math.random() * 100000000);

	lifeLine.nav.navigate("/edit/" + id);
});

// create the logout button
lifeLine.addNavCommand("Account", "/account");
