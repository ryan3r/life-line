import Events from "./util/events";
import localforage from "localforage";

class Router extends Events {
	constructor() {
		super();

		this.defineEvent("Location", () => this);

		this._parseUrl();

		// no list in the url
		if(!this.listId) {
			localforage.getItem("last-list")

			.then(listId => {
				// make sure we haven't navigated yet
				if(!this.listId) {
					this.listId = listId;

					this.emit("Location");
				}
			})
		}
	}

	// parse the current url
	_parseUrl() {
		const match = location.pathname.match(/^\/(.+?)(?:\/(.+?))?\/?$/);

		// save the task id and list id
		this.listId = match && match[1];
		this.taskId = match && match[2];

		// notify listeners that we navigated
		this.emit("Location");

		// save the new list when we navigate to it
		if(this.listId) {
			localforage.setItem("last-list", this.listId);
		}
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

		// save the new list
		localforage.setItem("last-list", this.listId);
	}

	_updateUrl() {
		const url = this.listId ? `/${this.listId || ""}/${this.taskId || ""}` : "/";

		// update the url bar
		history.pushState(null, null, url);

		// notify listeners that we navigated
		this.emit("Location");
	}
}

// create the global router
export let router = new Router();

window.addEventListener("popstate", function() {
	router._parseUrl();
});
