import currentTask from "./data/current-task";

// the old name change subscription
let changeSub;

currentTask.onTask(task => {
	// remove the old name listener
	if(changeSub) {
		changeSub.unsubscribe();
	}

	// update the name
	if(task) {
		document.title = task.name;

		// listen for changes to the name
		changeSub = task.onName(name => document.title = name);
	}
	else {
		document.title = "Life line";
	}
});
