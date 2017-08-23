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

// split the currently selected text field (removing the selected parts)
const splitSelectedText = () => {
	const range = getSelection().getRangeAt(0);

	// get the parts of the selection
	return [
		range.startContainer.textContent.substr(0, range.startOffset),
		range.endContainer.textContent.substr(range.endOffset)
	];
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
		// handle backspace when the input is empty
		else if(e.keyCode == 8 && e.target.innerText === "") {
			// focus the last sibling
			if(this.base.previousElementSibling) {
				this.base.previousElementSibling.querySelector(".editor").focus();
			}
			// focus the parent
			else {
				const parentInput = this.base
					.parentElement // <div> created by Tasks
					.parentElement // .subtasks
					.parentElement // <div> wrapping the parent task
					.querySelector(".editor");

				// if this is not the top level focus the parent
				if(parentInput) {
					parentInput.focus();
				}
			}

			// delete this task
			this.task.delete();
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
			let target;

			// go to the child above us
			if(this.base.previousElementSibling) {
				target = this.base.previousElementSibling;

				// find the last child in this element
				for(;;) {
					let subtasks = target.querySelector(".subtasks>div");

					// go to the last child in this element
					if(subtasks.childElementCount > 0) {
						target = subtasks.lastElementChild;

						// we found a not subtasks shown message
						if(target.classList.contains("hidden")) {
							target = target.previousElementSibling;
						}
					}
					// we found the next element
					else {
						break;
					}
				}
			}
			// go to our parent
			else {
				// NOTE: Event if we are the first element in the entire list
				// 		this jumps back to the same element

				target = this.base
					.parentElement // <div> created by Tasks
					.parentElement // .subtasks
					.parentElement // <div> wrapping the parent task
					.firstElementChild; // the actual task
			}

			target.querySelector(".editor").focus();
		}
		// down arrow move to the last task
		else if(e.keyCode == 40) {
			let target = this.base;
			let subtasks = this.base.querySelector(".subtasks>div");

			// go to the first child in this element
			if(subtasks.childElementCount > 0) {
				target = subtasks.firstElementChild;
			}
			// go to the next sibling
			else if(this.base.nextElementSibling &&
				!this.base.nextElementSibling.classList.contains("hidden")) {
					target = this.base.nextElementSibling;
			}
			// go to our parent
			else {
				for(;;) {
					target = target
						.parentElement // <div> created by Tasks
						.parentElement // .subtasks
						.parentElement; // <div> wrapping the parent task

					// we found a task to go to
					if(target.nextElementSibling) {
						target = target.nextElementSibling

						break;
					}
					// we are on the last task
					else if(target.className !== "") {
						target = undefined;

						break;
					}
				}
			}

			// focus the element
			if(target) {
				target.querySelector(".editor").focus();
			}
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
		const {startAt, endAt} = focusController.getRangeInfo();
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
