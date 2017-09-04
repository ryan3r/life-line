import Events from "./events";

const saveTracker = new Events();

window.saveTracker = saveTracker;
export default saveTracker;

saveTracker.defineEvent("IsDirty", "isDirty");

// track the running jobs and the failed jobs
let pendingJobs = 0;

// add a save job to manage
saveTracker.addSaveJob = function(promise) {
	++pendingJobs;

	promise.then(() => {
		--pendingJobs;

		// check if the isDirty state has changed
		if(!saveTracker.isDirty) {
			saveTracker.emit("IsDirty");
		}
	});

	// check of the isDirty state has changed
	if(pendingJobs == 1) {
		saveTracker.emit("IsDirty");
	}
};

// check if we have any unsaved changes
Object.defineProperty(saveTracker, "isDirty", {
	get() {
		return pendingJobs > 0;
	}
});
