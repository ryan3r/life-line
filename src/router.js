import Events from "./util/events";
import localforage from "localforage";

class Router extends Events {
	constructor() {
		super();

		this.defineEvent("Location", () => this);

		this._parseUrl();

		let listIdLoaded = Promise.resolve();

		// no list in the url
		if(!this.listId) {
			listIdLoaded = localforage.getItem("last-list")

			.then(listId => {
				// make sure we haven't navigated yet
				if(!this.listId) {
					this.listId = listId;
				}
			});
		}

		listIdLoaded.then(() => {
			this._maybeLoadTaskId();
		});
	}

	// if we don't have a task id load the one for this list and refresh either way
	_maybeLoadTaskId() {
		// load the previous task
		if(!this.taskId) {
			return localforage.getItem(`last-task-${this.listId}`)

			.then(taskId => {
				if(!this.taskId) {
					this.taskId = taskId;
				}

				this.emit("Location");
			});
		}
		// we have our task show it
		else {
			this.emit("Location");
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

		// save the new task as well
		if(this.taskId) {
			localforage.setItem(`last-task-${this.listId}`, this.taskId);
		}
	}

	// switch tasks
	openTask(taskId) {
		// get the task id
		this.taskId = taskId;

		this._updateUrl();

		localforage.setItem(`last-task-${this.listId}`, this.taskId);
	}

	// switch lists
	openList(listId) {
		// get the list id
		this.listId = listId;
		// clear the task id
		this.taskId = undefined;

		// try to load the task for this list
		this._maybeLoadTaskId();

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
