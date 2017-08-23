import {Events} from "./util";
import {Tasks} from "./tasks";

class Router extends Events {
	constructor() {
		super();

		this._parseUrl();

		// no list in the url
		if(!this.listId) {
			this.listId = localStorage.getItem("last-list");
		}

		// refresh the visible children for the current task
		this.onCurrentRootTask(task => task._refreshVisibleChildren());
	}

	// parse the current url
	_parseUrl() {
		const match = location.pathname.match(/^\/(.+?)(?:\/(.+?))?\/?$/);

		// save the task id and list id
		this.listId = match && match[1];
		this.taskId = match && match[2];

		// notify listeners that we navigated
		this.emit("navigate", this);

		// save the new list when we navigate to it
		if(this.listId) {
			localStorage.setItem("last-list", this.listId);
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
		localStorage.setItem("last-list", this.listId);
	}

	_updateUrl() {
		const url = this.listId ? `/${this.listId || ""}/${this.taskId || ""}` : "/";

		// update the url bar
		history.pushState(null, null, url);

		// notify listeners that we navigated
		this.emit("navigate", this);
	}

	// get/create the current tasks instance and listen for changes
	_loadTasks() {
		// if we have a new list load it
		if(this.listId && (!this._tasks || this._tasks.listId != this.listId)) {
			// dispose of the old tasks object
			if(this._tasks) {
				this._tasks.dispose();
			}

			// create the tasks instance
			this._tasks = new Tasks(this.listId);

			this._tasks.ready.catch(err => {
				// not allowed to access or it does not exist
				if(err.code == "PERMISSION_DENIED") {
					this.emit("tasks-error", {
						errorType: "access"
					});
				}
				// unexpected error
				else {
					this.emit("tasks-error", {
						errorType: "unknown",
						errorMessage: err.message
					});
				}
			});
		}

		// wait for the tasks to be ready
		if(this._tasks) {
			return this._tasks.ready
				// get the tasks
				.then(() => this._tasks)
				// return nothing to signify that there are no available tasks objects
				.catch(() => {});
		}
		// no tasks object yet
		else {
			return Promise.resolve();
		}
	}

	// get the current task and listen for changes
	onCurrentRootTask(fn) {
		// actualy fetch the current task
		const getCurrentTask = () => {
			// get the current current task
			this._loadTasks()

			.then(tasks => {
				// we don't have a tasks object yet
				if(!tasks) return;

				let current;

				// go from the url bar
				if(this.taskId) {
					current = tasks.getAsync(this.taskId)
				}
				// get the actual root
				else {
					current = tasks.getRootAsync();
				}

				current.then(task => {
					// make sure they still want this
					if(subscription.active) {
						// make sure this is still the current task
						if(task.id == this.taskId || (!task.parent && !this.taskId)) {
							fn(task);
						}
					}
				});
			});
		}

		// notify the user of navigations
		let subscription = this.on("navigate", () => getCurrentTask());

		// load the initial value
		getCurrentTask();

		return subscription;
	}
}

// create the global router
export let router = new Router();

window.addEventListener("popstate", function() {
	router._parseUrl();
});
