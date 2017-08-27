import Tasks from "./tasks";
import Events from "../util/events";
import Lists from "./lists";
import {router} from "../router";

let currentTask = new Events();

export default currentTask;

currentTask.defineEvent("Task", "task");
currentTask.defineEvent("TasksError");

// save the Tasks instance
let _tasks;

// get/create the current tasks instance and listen for changes
router.onLocation(() => {
	// if we have a new list load it
	if(router.listId && (!_tasks || _tasks.listId != router.listId)) {
		// dispose of the old tasks object
		if(_tasks) {
			_tasks.dispose();
		}

		// create the tasks instance
		_tasks = new Tasks(router.listId);

		_tasks.ready.catch(err => {
			// clear the old task
			currentTask.currentTask = undefined;

			currentTask.emit("Task");

			// not allowed to access or it does not exist
			if(err.code == "PERMISSION_DENIED") {
				currentTask.emit("TasksError", {
					errorType: "access"
				});
			}
			// unexpected error
			else {
				currentTask.emit("TasksError", {
					errorType: "unknown",
					errorMessage: err.message
				});
			}
		});
	}

	if(_tasks) {
		// wait for tasks to be ready
		_tasks.ready.then(() => {
			// go from the url bar
			if(router.taskId) {
				return _tasks.getAsync(router.taskId)
			}
			// get the actual root
			else {
				return _tasks.getRootAsync();
			}
		})

		.then(task => {
			// make sure this is still the current task
			if(task.id == router.taskId || (!task.parent && !router.taskId)) {
				// save the current task
				currentTask.task = task;

				currentTask.emit("Task");
			}
		});
	}
});
