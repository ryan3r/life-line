import {Tasks} from "./tasks";

export default {
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
					// make sure this is still the current task
					if(task.id == this.taskId || (!task.parent && !this.taskId)) {
						// update the task id
						this.taskId = task.id;

						// make sure they still want this
						if(subscription.active) {
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
};
