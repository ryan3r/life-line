import {Events} from "./util";

class Router extends Events {
	constructor() {
		super();

		this._parseUrl();
	}

	// parse the current url
	_parseUrl() {
		const match = location.pathname.match(/^\/(.+?)(?:\/(.+?))?\/?$/);

		// save the task id and list id
		this.listId = match && match[1];
		this.taskId = match && match[2];

		// notify listeners that we navigated
		this.emit("navigate", this);
	}

	// switch tasks
	openTask(taskId) {
		// get the task id
		this.taskId = taskId;

		this._updateUrl();
	}

	// switch lists
	openList(listId) {
		// get the list id
		this.listId = listId;
		// clear the task id
		this.taskId = undefined;

		this._updateUrl();
	}

	_updateUrl() {
		const url = this.listId ? `/${this.listId || ""}/${this.taskId || ""}` : "/";

		// update the url bar
		history.pushState(null, null, url);

		// notify listeners that we navigated
		this.emit("navigate", this);
	}
}

// create the global router
export let router = new Router();

window.addEventListener("popstate", function() {
	router._parseUrl();
});
