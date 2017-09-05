import TaskComponent from "../task-component";
import Checkbox from "./checkbox";
import EditTaskName from "./edit-task-name";
import {router} from "../../../router";
import React from "react";
import MoreVertIcon from "material-ui/svg-icons/navigation/more-vert";
import IconMenu from "material-ui/IconMenu";
import MenuItem from "material-ui/MenuItem";
import IconButton from "material-ui/IconButton";
import {focusController} from "./focus-controller";
import TasksWidget from "./tasks";
import currentTask from "../../../data/current-task";
import {showCompleted} from "../../../stores/states";
import isTaskVisible from "../../../util/is-task-visible";
import KeyboardArrowRightIcon from "material-ui/svg-icons/hardware/keyboard-arrow-right";

// if the keyboard is opened make sure it doesn't cover the current editor
window.addEventListener("resize", () => {
	if(document.activeElement) {
		document.activeElement.scrollIntoViewIfNeeded();
	}
});

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

			while(to.children.length > 0 && isTaskVisible(to)) {
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
const previousVisibleChild = (fromTask, {getTask} = {}) => {
	// save the length of the current task
	const currentLength = fromTask.name.length;

	for(;;) {
		// find our position in the current parent
		const index = fromTask.parent.children.indexOf(fromTask);

		// move to our first child if it is visible
		if(fromTask.children.length > 0 && isTaskVisible(fromTask.children[0])) {
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

export default class EditTask extends TaskComponent {
	addListeners() {
		super.addListeners();

		// listen for grandchildren changes
		this.taskDisposable.add(
			this.task.parent.onHasGrandchildren(siblingsHaveChildren => {
				this.setState({
					siblingsHaveChildren
				});
			})
		);
	}

	onTaskChildren() {
		// save the current task
		this.setState({
			task: this.task,
			showChildrenToggle: this.task.children.length > 0
		});
	}

	onTaskState() {
		// save the current task
		this.setState({
			task: this.task
		});
	}

	onTaskHideChildren() {
		this.setState({
			showChildrenToggle: this.task.children.length > 0
		});
	}

	create = () => {
		// we need to change the view
		if(this.props.depth <= 0) {
			router.openTask(this.task.id);
		}

		let newTask = this.task.create();

		// focus the new task
		focusController.focusTask(newTask.id, 0);
	}

	remove = () => {
		this.task.delete();
	}

	open = () => {
		router.openTask(this.task.id);
	}

	handleKey = e => {
		let preventDefault = true;

		// handle the enter key (ctrl to create a child)
		if(e.keyCode == 13) {
			const [selfName, newName] = splitSelectedText();

			// update the name for this task
			this.task.name = selfName;

			// the parent for the new task
			// ctrlKey to create a child for this task
			const parent = e.ctrlKey ? this.task : this.task.parent;

			// create a new sibling task
			const newTask = parent.create({
				name: newName,
				index: e.ctrlKey ? 0 : this.task.index + 1
			});

			// focus the new task
			focusController.focusTask(newTask.id, 0);
		}
		// handle backspace when the cursor is at the beginning
		else if(e.keyCode == 8 &&
			getSelection().rangeCount > 0 &&
			getSelection().getRangeAt(0).startOffset === 0 &&
			getSelection().type == "Caret") {
			// get the next visible task
			let toTask = nextVisibleTask(this.task, { getTask: true });

			if(toTask) {
				let index = toTask.name.length;

				// add the content of this task to the new task
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
			this.task.attachTo(parent.parent, parent.index + 1);
		}
		// indent tasks on tab
		else if(e.keyCode == 9) {
			// get the sibling that will become the parent
			let attachTo = nextInParent(this.task);

			if(attachTo) {
				// make sure we foucs this task when we rerender
				focusController.focusTaskWithCurrentRange(this.task.id);

				this.task.attachTo(attachTo);

				// check if the current task is visible
				if(!isTaskVisible(this.task)) {
					router.openTask(this.task.parent.id);
				}
			}
		}
		// switch places with the next logical task
		else if((e.keyCode == 38 || e.keyCode == 40) && e.ctrlKey) {
			let toTask;

			// find the next visible task
			if(e.keyCode == 38) {
				toTask = nextInParent(this.task);
			}
			else {
				toTask = previousInParent(this.task);
			}

			// switch with in the same parent
			if(toTask && toTask.parent == this.task.parent) {
				toTask.switchWith(this.task);
			}

			// refocus this task
			focusController.focusTaskWithCurrentRange(this.task.id);
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
		// make sure the focus is not taken from us by material-ui
		this.listen(this.base.querySelector(".editor"), "blur", () => {
			setTimeout(() => {
				if(document.activeElement.getAttribute("role") == "menuitem" &&
					this.base) {
					this.base.querySelector(".editor").focus();
				}
			}, 0);
		});

		focusController.onFocus(id => {
			// not a focus for this task
			if(this.task.id !== id || !this.base) return;

			let {startAt, endAt} = focusController.getRangeInfo(this.task.name);
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

			// make sure this task is in view
			this.base.scrollIntoViewIfNeeded();
		});
	}

	toggleHideChildren = () => this.task.hideChildren = !this.task.hideChildren;

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

		// rotate the arrow when hidden
		let iconArrow = Object.assign({
			transform: `rotate(${this.task.hideChildren ? 0 : 90}deg)`
		}, iconStyles);

		// give the checkbox some space
		const btnStyles = {
		    width: 24,
		    height: 24,
		    padding: 0,
			marginRight: 5
		};

		const showChildrenToggle = this.props.depth > 0 && this.state.showChildrenToggle;

		// show a open/close arrow for the children
		const hideShowChildren = showChildrenToggle ? <IconButton
			style={btnStyles}
			iconStyle={iconArrow}
			onClick={this.toggleHideChildren}>
				<KeyboardArrowRightIcon/>
		</IconButton> : null;

		// check if any of our siblings have children
		const noSiblingsChildren = this.task.parent.children.every(task => {
			return task.children.length === 0;
		});

		// Indent the task if we are not showing the collapse toggle.
		// If we are at the top level and either we are low on space or
		// none of our siblings have children don't indenet.
		const indentTask =
			!showChildrenToggle &&
			(!this.props.toplevel ||
				(!this.state.siblingsHaveChildren && this.props.depth > 0));

		// save the indented state
		this._wasIndented = indentTask;

		// show the fade animation
		const fadeClass = !showCompleted.value && this.task.state.type == "done" ?
			"fadeout-task" :
			"";

		return <div ref={base => this.base = base}>
			<div className={`task flex flex-vcenter ${this.task.state.type} ${fadeClass}`}
				style={{marginLeft: indentTask ? 29 : 0}}>
				{hideShowChildren}
				<Checkbox task={this.task}/>
				<EditTaskName className="flex-fill" task={this.task} prop="name"
					onKeyDown={this.handleKey}/>
				<IconMenu
					iconButtonElement={menuIcon}>
						<MenuItem primaryText="Open" onClick={this.open}/>
						<MenuItem primaryText="Add subtask" onClick={this.create}/>
						<MenuItem primaryText="Delete" onClick={this.remove}/>
				</IconMenu>
			</div>
			<div className="subtasks">
				{/* TODO: Fix TasksWidget.default */}
				<TasksWidget.default editMode task={this.task} depth={this.props.depth}/>
			</div>
		</div>;
	}
};
