import {focusController} from "./focus-controller";
import {router} from "../../../router";
import {showCompleted} from "../../../stores/states";
import isTaskVisible from "../../../util/is-task-visible";

// focus the next visible task
export const nextVisibleTask = (fromTask, {keepSelection, startIndex, getTask}) => {
	let to = fromTask;

	for(;;) {
		// find our position in the current parent
		const index = to.parent.children.indexOf(to);

		if(index === 0) {
			// the parent is not visible
			if(to.id == router.taskId) {
				return;
			}
			// move to the parent
			else {
				to = to.parent;
			}
		}
		else {
			// go to the previous child
			to = to.parent.children[index - 1];

			while(to.children.length > 0 && !to.hideChildren && isTaskVisible(to)) {
				// go to the last child
				to = to.children[to.children.length - 1];
			}
		}

		// keep searching
		if(to.state.type !== "done" || showCompleted.value) break;
	}

	// return the task
	if(getTask) {
		return to;
	}
	// focus the task with the current selection
	else if(keepSelection) {
		focusController.focusTaskWithCurrentRange(to.id, {
			length: fromTask.name.length
		});
	}
	// move to the next task
	else {
		focusController.focusTask(to.id, startIndex);
	}
};

// find the task that is visually below the current task
export const previousVisibleTask = (fromTask, {getTask} = {}) => {
	// save the length of the current task
	const currentLength = fromTask.name.length;

	for(;;) {
		// find our position in the current parent
		const index = fromTask.parent.children.indexOf(fromTask);

		// move to our first child if it is visible
		if(fromTask.children.length > 0 &&
			!fromTask.hideChildren &&
			isTaskVisible(fromTask.children[0])) {
				fromTask = fromTask.children[0];
		}
		// go to the previous child
		else if(fromTask.parent.children.length - 1 > index) {
			fromTask = fromTask.parent.children[index + 1];
		}
		// go to the parent and try again
		else {
			for(;;) {
				// no more tasks
				if(!fromTask.parent || !fromTask.parent.parent) return;

				// find the parent
				const index = fromTask.parent.parent.children.indexOf(
					fromTask.parent
				);

				// this parent has no siblings after it repeat this setp
				if(fromTask.parent.parent.children.length - 1 === index) {
					fromTask = fromTask.parent;

					continue;
				}

				// go to the sibling after our parent
				fromTask = fromTask.parent.parent.children[index + 1];

				break;
			}
		}

		// keep searching
		if(fromTask.state.type !== "done" || showCompleted.value) break;
	}

	// just return the task
	if(getTask) {
		return fromTask;
	}
	// jump to the task
	else {
		focusController.focusTaskWithCurrentRange(fromTask.id, {
			length: currentLength
		});
	}
};

// get the next task in this parent
const nextInParent = fromTask => {
	const {children} = fromTask.parent;

	for(let i = children.indexOf(fromTask) - 1; i >= 0; --i) {
		// we found the task to jump to
		if(showCompleted.value ||
			children[i].state.type != "done") {
			return children[i];
		}
	}
};

// go to the previous task in this parent
const previousInParent = fromTask => {
	const {children} = fromTask.parent;

	for(let i = children.indexOf(fromTask) + 1; i < children.length; ++i) {
		// we found the task to jump to
		if(showCompleted.value ||
			children[i].state.type != "done") {
			return children[i];
		}
	}
};

// outdent the current task
export const outdent = task => {
	// get our current parent
	const {parent} = task;

	// no grandparent to add this to
	if(!parent.parent) return;

	// make sure we foucs this task when we rerender
	focusController.focusTaskWithCurrentRange(task.id);

	// the task we are being moved to is not shown
	if(parent.id == router.taskId) {
		router.openTask(parent.parent.id);
	}

	// attach this task to its grandparent after the current parent
	task.attachTo(parent.parent, parent.index + 1);
};

// indent the current task
export const indent = task => {
	// get the sibling that will become the parent
	let attachTo = nextInParent(task);

	if(attachTo) {
		// make sure we foucs this task when we rerender
		focusController.focusTaskWithCurrentRange(task.id);

		task.attachTo(attachTo);

		// check if the current task is visible
		if(!isTaskVisible(task)) {
			router.openTask(task.parent.id);
		}
	}
};

// move this task no the spot directly above or below it this one
export const moveTo = (task, moveUp) => {
	let toTask;

	// find the next visible task
	if(moveUp) {
		toTask = nextInParent(task);
	}
	else {
		toTask = previousInParent(task);
	}

	// switch with in the same parent
	if(toTask && toTask.parent == task.parent) {
		toTask.switchWith(task);
	}

	// refocus this task
	focusController.focusTaskWithCurrentRange(task.id);
};
