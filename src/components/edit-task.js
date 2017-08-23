import {TaskComponent} from "./task-component";
import {TasksWidget} from "./tasks";
import {Checkbox} from "./checkbox";
import {EditTaskProp} from "./edit-task-prop";
import {router} from "../router";
import {MAX_CHILDREN} from "../constants";
import React from "react";
import MoreVertIcon from "material-ui/svg-icons/navigation/more-vert";
import IconMenu from "material-ui/IconMenu";
import MenuItem from "material-ui/MenuItem";
import IconButton from "material-ui/IconButton";
import {focusController} from "../focus-controller";
import {maxNestingDepth} from "../constants";

// split the currently selected text field (removing the selected parts)
const splitSelectedText = () => {
	const range = getSelection().getRangeAt(0);

	// get the parts of the selection
	return [
		range.startContainer.textContent.substr(0, range.startOffset),
		range.endContainer.textContent.substr(range.endOffset)
	];
};

// focus the next visible task
const nextVisibleTask = (fromTask, {keepSelection, startIndex, getTask}) => {
	// find our position in the current parent
	const index = fromTask.parent.visibleChildren.indexOf(fromTask);
	// the deepest we can go
	const maxDepth = router._tasks.get(router.taskId).depth + maxNestingDepth();

	let to;

	if(index === 0) {
		// the parent is not visible
		if(fromTask.id == router.taskId) {
			return;
		}
		// move to the parent
		else {
			to = fromTask.parent;
		}
	}
	else {
		// go to the previous child
		to = fromTask.parent.visibleChildren[index - 1];

		while(to.visibleChildren.length > 0 && to.depth <= maxDepth) {
			// go to the last child
			to = to.visibleChildren[to.visibleChildren.length - 1];
		}
	}

	// return the task
	if(getTask) {
		return to;
	}
	// focus the task with the current selection
	else if(keepSelection) {
		focusController.focusTaskWithCurrentRange(to.id);
	}
	// move to the next task
	else {
		focusController.focusTask(to.id, startIndex);
	}
};

// find the task that is visually below the current task
const previousVisibleChild = fromTask => {
	// the deepest we can go
	const maxDepth = router._tasks.get(router.taskId).depth + maxNestingDepth();

	// find our position in the current parent
	const index = fromTask.parent.visibleChildren.indexOf(fromTask);

	// move to our first child if it is visible
	if(fromTask.visibleChildren.length > 0 && fromTask.depth + 1 < maxDepth) {
		fromTask = fromTask.visibleChildren[0];
	}
	// go to the previous child
	else if(fromTask.parent.visibleChildren.length - 1 > index) {
		fromTask = fromTask.parent.visibleChildren[index + 1];
	}
	// go to the parent and try again
	else {
		for(;;) {
			// no more tasks
			if(!fromTask.parent || !fromTask.parent.parent) return;

			// find the parent
			const index = fromTask.parent.parent.visibleChildren.indexOf(
				fromTask.parent
			);

			// this parent has no siblings after it repeat this setp
			if(fromTask.parent.parent.visibleChildren.length - 1 === index) {
				fromTask = fromTask.parent;

				continue;
			}

			// go to the sibling after our parent
			fromTask = fromTask.parent.parent.visibleChildren[index + 1];

			break;
		}
	}

	focusController.focusTaskWithCurrentRange(fromTask.id);
};

export class EditTask extends TaskComponent {
	// check if a task's children are hiden and open it if they are
	openIfFull = parent => {
		// check if with this next child we will hide the subtasks
		const parentIsFull = parent.visibleChildren.length >= MAX_CHILDREN;

		// open the parent since the children are hidden
		if(parentIsFull) {
			router.openTask(parent.id);
		}
	};

	addListeners() {
		super.addListeners();

		// listen to focus changes
		this.addSub(
			focusController.onFocus(this.task.id, () => {
				if(!this.base) return;

				this.onFocus();
			})
		)
	}

	onTaskChildren() {
		// save the current task
		this.setState({
			task: this.task
		});
	}

	onTaskState() {
		// save the current task
		this.setState({
			task: this.task
		});
	}

	create = () => {
		// we need to change the view
		if(this.props.depth <= 0) {
			router.openTask(this.task.id);
		}

		this.task.create();
	}

	remove = () => {
		this.task.delete();
	}

	open = e => {
		// we were ctrl clicked open this task
		if(e.ctrlKey) {
			e.preventDefault();

			this.actualOpen();
		}
	}

	actualOpen = () => {
		router.openTask(this.task.id);
	}

	handleKey = e => {
		let preventDefault = true;

		// handle the enter key (ctrl to create a child)
		if(e.keyCode == 13) {
			const [selfName, newName] = splitSelectedText();

			// update the name for this task
			this.task.name = selfName;

			// force the editor to refresh
			this.base.querySelector(".editor").innerText = selfName;

			// the parent for the new task
			// ctrlKey to create a child for this task
			const parent = e.ctrlKey ? this.task : this.task.parent;

			// create a new sibling task
			const newTask = parent.create(newName);

			// focus the new task
			focusController.focusTask(newTask.id, 0);

			// make sure the new task is visible
			this.openIfFull(parent);
		}
		// handle backspace when the cursor is at the beginning
		else if(e.keyCode == 8 &&
			getSelection().rangeCount > 0 &&
			getSelection().getRangeAt(0).startOffset === 0) {
			// get the next visible task
			let toTask = nextVisibleTask(this.task, { getTask: true });

			if(toTask) {
				let index = toTask.name.length;

				// move our name to the to task
				toTask.name += this.task.name;

				// go to the current end of the to task
				focusController.focusTask(toTask.id, index);

				// delete this task
				this.task.delete();
			}
		}
		// outdent tasks on tab
		else if(e.keyCode == 9 && e.shiftKey) {
			// get our current parent
			const {parent} = this.task;

			// no grandparent to add this to
			if(!parent.parent) return;

			// make sure we foucs this task when we rerender
			focusController.focusTaskWithCurrentRange(this.task.id);

			// the task we are being moved to is not shown
			if(parent.id == router.taskId) {
				router.openTask(parent.parent.id);
			}

			// attach this task to its grandparent after the current parent
			this.task.attachTo(parent.parent, parent);
		}
		// indent tasks on tab
		else if(e.keyCode == 9) {
			// get the sibling that will become the parent
			let attachTo = this.task.getLastSibling();

			if(attachTo) {
				// make sure we foucs this task when we rerender
				focusController.focusTaskWithCurrentRange(this.task.id);

				// make sure this task remains visible
				this.openIfFull(attachTo);

				this.task.attachTo(attachTo);
			}
		}
		// up arrow move to the next task
		else if(e.keyCode == 38) {
			nextVisibleTask(this.task, {
				keepSelection: true
			});
		}
		// down arrow move to the last task
		else if(e.keyCode == 40) {
			previousVisibleChild(this.task);
		}
		// if none of our handlers were called go with the brower default
		else {
			preventDefault = false;
		}

		if(preventDefault) {
			e.preventDefault();
		}
	}

	componentDidMount() {
		// check if we should have focus
		if(focusController.hasFocus(this.task.id)) {
			this.onFocus();
		}
	}

	// focus this task
	onFocus() {
		let {startAt, endAt} = focusController.getRangeInfo();
		// get the text node for the editor
		const editor = this.base.querySelector(".editor");
		let textNode = editor.childNodes[0];

		// if there is no text node create one
		if(!textNode) {
			textNode = document.createTextNode("");

			// add it to the editor
			editor.appendChild(textNode);
		}

		let range = document.createRange();

		if(startAt > textNode.textContent.length) {
			startAt = textNode.textContent.length;
		}

		if(endAt > textNode.textContent.length) {
			endAt = textNode.textContent.length;
		}

		// select the text
		range.setStart(textNode, startAt);
		range.setEnd(textNode, endAt);

		let selection = getSelection();

		// clear the current selection (if any)
		selection.removeAllRanges();

		// add the new selection
		selection.addRange(range);
	}

	render() {
		// the styles to apply to the menu icon
		const iconStyles = {
		    width: 24,
		    height: 24,
		    padding: 0
		};

		const menuIcon = <IconButton
			style={iconStyles}
			iconStyle={iconStyles}>
				<MoreVertIcon/>
		</IconButton>;

		return <div ref={base => this.base = base}>
			<div className={`task flex flex-vcenter ${this.task.state.type}`}>
				<Checkbox task={this.task}/>
				<EditTaskProp className="flex-fill" task={this.task} prop="name"
					onKeyDown={this.handleKey} onMouseDown={this.open}/>
				<IconMenu
					iconButtonElement={menuIcon}>
						<MenuItem primaryText="Open" onClick={this.actualOpen}/>
						<MenuItem primaryText="Add subtask" onClick={this.create}/>
						<MenuItem primaryText="Delete" onClick={this.remove}/>
				</IconMenu>
			</div>
			<div className="subtasks">
				<TasksWidget editMode task={this.task} depth={this.props.depth}
					showCompleted={this.props.showCompleted}/>
			</div>
		</div>;
	}
};
