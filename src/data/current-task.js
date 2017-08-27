import Tasks from "./tasks";
import Events from "../util/events";
import Lists from "./lists";

export default let currentTask = new Events();

currentTask.defineEvent("CurrentTask", "task");
currentTask.defineEvent("TasksError");

// save the Tasks instance
let _tasks;

// get/create the current tasks instance and listen for changes
router.onNavigate(() => {
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

			currentTask.emit("CurrentTask");

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

	// wait for tasks to be ready
	_tasks.ready.then(() => {
		// clear the previous errors
		currentTask.emit("TasksError");

		// go from the url bar
		if(router.taskId) {
			return tasks.getAsync(router.taskId)
		}
		// get the actual root
		else {
			return tasks.getRootAsync();
		}
	})

	.then(task => {
		// make sure this is still the current task
		if(task.id == router.taskId || (!task.parent && !router.taskId)) {
			// save the current task
			currentTask.task = task;

			currentTask.emit("CurrentTask");
		}
	});
});
